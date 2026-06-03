import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { CompanyProfile, Topic } from '@/lib/local-store'
import { getAllWeeks } from '@/lib/local-store'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const body = await req.json() as {
    profile: CompanyProfile
    competitor_posts?: string
    past_posts?: string
  }
  const { profile, competitor_posts, past_posts } = body

  // 1. Tavily search for content trends
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
      tavilyResults = (tavilyData.results ?? []).map(
        (r) => `- ${r.title}: ${r.content?.slice(0, 200) ?? ''}`
      )
    }
  } catch {
    tavilyResults = []
  }

  // Pull all previously used topic titles from past weeks to avoid repetition
  const pastWeeks = getAllWeeks()
  const usedTopics = pastWeeks
    .flatMap((w) => w.topics.map((t) => t.title))
    .slice(0, 30) // last 30 topics max

  // 2. Claude call to generate 7 topics
  const prompt = `Company: ${profile.name}
Description: ${profile.description}
Target Audience: ${profile.target_audience}
Tone: ${profile.tone}
Platforms: ${profile.platforms.join(', ')}

${tavilyResults.length > 0 ? `Current Trends (from web research):\n${tavilyResults.join('\n')}` : ''}

${competitor_posts ? `Competitor Posts (analyze for gaps):\n${competitor_posts}` : ''}

${past_posts ? `User's Past Posts (match their style):\n${past_posts}` : ''}

${usedTopics.length > 0 ? `ALREADY USED TOPICS — DO NOT REPEAT OR CLOSELY PARAPHRASE ANY OF THESE:\n${usedTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}` : ''}

Generate exactly 10 FRESH, unique, high-performing social media topic ideas for this week. Each topic must be completely different from the already used topics above. Think of new angles, new formats, new audience pain points not yet covered. Only use LinkedIn or Facebook as best_platform — never Instagram.

Return ONLY this JSON, no markdown, no explanation:
{"topics":[{"id":"1","title":"topic title","reasoning":"why this will perform well this week","best_platform":"LinkedIn","format":"List","approved":false},{"id":"2","title":"topic title","reasoning":"why this will perform well","best_platform":"Facebook","format":"Story","approved":false}]}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: 'You are a social media strategist. Return valid JSON only.',
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'No text response' }, { status: 500 })
  }

  let topics: Topic[] = []
  try {
    const parsed = JSON.parse(content.text.trim()) as { topics: Topic[] }
    topics = parsed.topics
  } catch {
    // Try to extract JSON from response
    const match = content.text.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0]) as { topics: Topic[] }
      topics = parsed.topics
    } else {
      return NextResponse.json({ error: 'Failed to parse topics' }, { status: 500 })
    }
  }

  return NextResponse.json({ topics })
}
