import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { CompanyProfile, Topic, Post } from '@/lib/local-store'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

async function generateBatch(profile: CompanyProfile, topics: Topic[]): Promise<Post[]> {
  const topicList = topics
    .map((t, i) => `${i + 1}. [ID: ${t.id}] ${t.title} (Platform: ${t.best_platform}, Format: ${t.format})`)
    .join('\n')

  const prompt = `Company: ${profile.name}
Audience: ${profile.target_audience}
Tone: ${profile.tone}

Topics:
${topicList}

Write viral LinkedIn + Facebook posts. Style: Lara Acosta — short punchy hook (1-2 lines), "Here's [what/how/why]:" line, 3 numbered points each with 1-line explanation, genuine question CTA. No corporate speak. Human, direct, specific.

Facebook: same but warmer/shorter.
hashtags: 10 tags (no # symbol)
first_comment: follow-up insight + 8 niche hashtags

Return ONLY valid JSON:
{"posts":[{"topic_id":"EXACT_ID","linkedin":{"hook":"","body":"","cta":"","hashtags":[],"first_comment":""},"facebook":{"hook":"","body":"","cta":"","hashtags":[],"first_comment":""}}]}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system: 'You are Lara Acosta — a top LinkedIn creator known for viral, human, punchy posts. You always use her exact template style: short hook, "Here\'s X:" line, 3 numbered points with explanations, genuine CTA. Never generic. Never corporate. Return valid JSON only.',
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('No text response from Claude')

  const cleaned = content.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    const parsed = JSON.parse(cleaned) as { posts: Post[] }
    return parsed.posts
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0]) as { posts: Post[] }
      return parsed.posts
    }
    throw new Error('Failed to parse posts JSON')
  }
}

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const body = await req.json() as { profile: CompanyProfile; topics: Topic[] }
    const { profile, topics } = body

    const approvedTopics = topics.filter((t) => t.approved)
    if (approvedTopics.length === 0) {
      return NextResponse.json({ error: 'No approved topics' }, { status: 400 })
    }

    // Process in batches of 4 (reduced prompt = faster per batch)
    const batchSize = 4
    const batches: Topic[][] = []
    for (let i = 0; i < approvedTopics.length; i += batchSize) {
      batches.push(approvedTopics.slice(i, i + batchSize))
    }

    const allPosts: Post[] = []
    for (const batch of batches) {
      const posts = await generateBatch(profile, batch)
      allPosts.push(...posts)
    }

    return NextResponse.json({ posts: allPosts })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Post generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
