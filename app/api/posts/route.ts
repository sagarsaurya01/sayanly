import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { CompanyProfile, Topic, Post } from '@/lib/local-store'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function generateBatch(profile: CompanyProfile, topics: Topic[]): Promise<Post[]> {
  // Initialize inside function so env var is always fresh
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const topicList = topics
    .map((t, i) => `${i + 1}. [ID: ${t.id}] ${t.title} (Platform: ${t.best_platform}, Format: ${t.format})`)
    .join('\n')

  const prompt = `You are a top LinkedIn creator writing for:
Company: ${profile.name}
Audience: ${profile.target_audience}
Tone: ${profile.tone}

Topics to write posts for:
${topicList}

WRITING STYLE — follow these rules exactly:

STRUCTURE:
1. Hook: 1 bold contrarian or surprising statement. Max 10 words. No fluff.
2. Bridge: 1-2 lines that set up what follows. End with "Here's [what/how/why]:" OR a colon line.
3. Body: Either numbered steps (1- 2- 3-) OR arrow bullets (→) — never both. Each point = 1-2 lines max. Add a blank line between every point.
4. Micro-punchline: 1-line bold insight after the body. Use plain text, no formatting symbols.
5. Close: Either a genuine question ("So tell me honestly: ...") OR a repost ask OR a link CTA.

FORMAT RULES:
- White space everywhere. Never more than 2 lines in a row without a break.
- Short sentences. One idea per line.
- Personal voice — use "I", "you", "we". Never corporate.
- Contrast framing works well: old vs new, left vs right, surface vs deep.
- Numbers in hooks should be specific (not "a few" — say "11 months", "4 mins", "12,000").
- NO emojis except sparingly at the very end if needed.
- NO generic closings like "What do you think?" — make the question specific to the topic.

EXAMPLES OF GOOD HOOKS:
- "You spent a year getting good at the wrong corner."
- "Using AI to comment is the worst LinkedIn advice."
- "AI is making people worse at communicating."
- "Everyone's waiting for the day AI takes over. It already has."

Facebook: same structure but 20% shorter and slightly warmer tone.
hashtags: 10 relevant tags (no # symbol)
first_comment: 1 follow-up insight that adds value + 8 niche hashtags

Return ONLY valid JSON, no markdown:
{"posts":[{"topic_id":"EXACT_ID","linkedin":{"hook":"","body":"","cta":"","hashtags":[],"first_comment":""},"facebook":{"hook":"","body":"","cta":"","hashtags":[],"first_comment":""}}]}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: 'You are a top LinkedIn creator. Write viral, human, punchy posts. Return valid JSON only.',
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
  try {
    const body = await req.json() as { profile: CompanyProfile; topics: Topic[] }
    const { profile, topics } = body

    const approvedTopics = topics.filter((t) => t.approved)
    if (approvedTopics.length === 0) {
      return NextResponse.json({ error: 'No approved topics' }, { status: 400 })
    }

    const allPosts: Post[] = []
    for (const topic of approvedTopics) {
      const posts = await generateBatch(profile, [topic])
      allPosts.push(...posts)
    }

    return NextResponse.json({ posts: allPosts })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Post generation failed'
    console.error('Posts route error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
