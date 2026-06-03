import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { CompanyProfile, Topic } from '@/lib/local-store'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const body = await req.json() as { profile: CompanyProfile; topic_title: string }
  const { profile, topic_title } = body

  // 1. Tavily search specifically for this topic
  let tavilyResults: string[] = []
  try {
    const tavilyRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${topic_title} LinkedIn content trends ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        max_results: 6,
      }),
    })
    if (tavilyRes.ok) {
      const tavilyData = await tavilyRes.json() as { results?: Array<{ title: string; content: string; url: string }> }
      tavilyResults = (tavilyData.results ?? []).map(
        (r) => `- ${r.title}: ${r.content?.slice(0, 300) ?? ''}`
      )
    }
  } catch {
    tavilyResults = []
  }

  // 2. Claude researches the topic and returns the best angle, hook, format
  const prompt = `You are a social media strategist. Research this specific topic and tell us exactly how to make it perform well.

Company: ${profile.name}
Business: ${profile.description}
Target Audience: ${profile.target_audience}
Tone: ${profile.tone}
Platforms: ${profile.platforms.join(', ')}

Topic to research: "${topic_title}"

${tavilyResults.length > 0 ? `Web research findings:\n${tavilyResults.join('\n')}` : ''}

Analyze:
1. What angle of this topic is currently performing best on LinkedIn/Facebook?
2. What pain point does this topic address for the target audience?
3. What format works best (List, Story, How-To, Opinion, Case Study)?
4. What makes this topic timely and relevant right now?
5. What hook would make someone stop scrolling?

Return ONLY this JSON, no markdown, no explanation:
{"topic":{"id":"1","title":"${topic_title}","reasoning":"Detailed research: [best angle] + [why it works for this audience now] + [what competitors are missing] + [suggested hook to start the post]","best_platform":"LinkedIn","format":"List","approved":true}}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: 'You are a social media strategist. Research the given topic and return valid JSON only.',
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'No text response' }, { status: 500 })
  }

  let topic: Topic
  try {
    const parsed = JSON.parse(content.text.trim()) as { topic: Topic }
    topic = parsed.topic
  } catch {
    const match = content.text.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0]) as { topic: Topic }
      topic = parsed.topic
    } else {
      return NextResponse.json({ error: 'Failed to parse research' }, { status: 500 })
    }
  }

  return NextResponse.json({ topic })
}
