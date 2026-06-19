import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { CompanyProfile, Topic, GraphicType } from '@/lib/local-store'
import { getAllWeeks } from '@/lib/local-store'

const GRAPHIC_TYPES: GraphicType[] = ['Carousel', 'Infographic', 'Cheat Sheet', 'Static Graphic']

function assignGraphicTypes(topics: Topic[]): Topic[] {
  let lastType: GraphicType | null = null
  return topics.map((topic) => {
    const available = GRAPHIC_TYPES.filter((t) => t !== lastType)
    // Pick based on format hint, otherwise rotate
    let picked: GraphicType
    if (topic.format === 'List' || topic.format === 'Tips') picked = available.includes('Carousel') ? 'Carousel' : available[0]
    else if (topic.format === 'Stat' || topic.format === 'Data') picked = available.includes('Infographic') ? 'Infographic' : available[0]
    else if (topic.format === 'Guide' || topic.format === 'How-to') picked = available.includes('Cheat Sheet') ? 'Cheat Sheet' : available[0]
    else picked = available[Math.floor(Math.random() * available.length)]
    // ensure no repeat
    if (picked === lastType) picked = available.find((t) => t !== lastType) ?? available[0]
    lastType = picked
    return { ...topic, graphic_type: picked }
  })
}

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const body = await req.json() as {
      profile: CompanyProfile
      competitor_posts?: string
      past_posts?: string
    }
    const { profile, competitor_posts, past_posts } = body

    // 1. Tavily search (optional — skip if fails)
    let tavilyResults: string[] = []
    try {
      const tavilyRes = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: `${profile.description} LinkedIn content trends ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
          max_results: 5,
        }),
      })
      if (tavilyRes.ok) {
        const tavilyData = await tavilyRes.json() as { results?: Array<{ title: string; content: string }> }
        tavilyResults = (tavilyData.results ?? []).map(r => `- ${r.title}: ${r.content?.slice(0, 200) ?? ''}`)
      }
    } catch {
      tavilyResults = []
    }

    // 2. Pull past topics to avoid repetition (safe — won't crash if file missing)
    let usedTopics: string[] = []
    try {
      const pastWeeks = getAllWeeks()
      usedTopics = pastWeeks.flatMap(w => w.topics.map(t => t.title)).slice(0, 30)
    } catch {
      usedTopics = []
    }

    // 3. Claude generates topics
    const prompt = `Company: ${profile.name}
Description: ${profile.description}
Target Audience: ${profile.target_audience}
Tone: ${profile.tone}
Platforms: ${profile.platforms.join(', ')}

${tavilyResults.length > 0 ? `Current Trends:\n${tavilyResults.join('\n')}` : ''}
${competitor_posts ? `Competitor Posts:\n${competitor_posts}` : ''}
${past_posts ? `Past Posts:\n${past_posts}` : ''}
${usedTopics.length > 0 ? `AVOID THESE TOPICS:\n${usedTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}` : ''}

Generate exactly 10 FRESH, unique, high-performing social media topic ideas for this week. Only use LinkedIn or Facebook as best_platform.

Return ONLY this JSON, no markdown:
{"topics":[{"id":"1","title":"topic title","reasoning":"why this will perform well this week","best_platform":"LinkedIn","format":"List","approved":false}]}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: 'You are a social media strategist. Return valid JSON only.',
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'No text response from AI' }, { status: 500 })
    }

    let topics: Topic[] = []
    try {
      const parsed = JSON.parse(content.text.trim()) as { topics: Topic[] }
      topics = parsed.topics
    } catch {
      const match = content.text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0]) as { topics: Topic[] }
        topics = parsed.topics
      } else {
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
      }
    }

    return NextResponse.json({ topics: assignGraphicTypes(topics) })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Topics route error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
