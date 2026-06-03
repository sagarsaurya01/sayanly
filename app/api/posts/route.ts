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
Description: ${profile.description}
Target Audience: ${profile.target_audience}
Tone: ${profile.tone}

Topics:
${topicList}

You are writing posts using the Lara Acosta viral LinkedIn template style. These are the 16 templates — pick the BEST fitting one for each topic:

TEMPLATE 1 - Step-by-Step Guide: Hook (problem/personal failure) → "Here's how I turned it around:" → 3 numbered steps with 1-line explanation each → Question CTA
TEMPLATE 2 - Educational Breakdown: Hook (bold statement about industry) → "Here's how to adapt:" → 3 points with insight → Engagement question
TEMPLATE 3 - Personal Story with Lessons: Hook (personal anecdote, specific year/moment) → "Here's what I learned:" → 3 lessons with 1-line explanation → Reflective question
TEMPLATE 4 - Problem-Solution: Hook (specific problem they faced) → "Here's how I turned it around:" → 3 solution steps → Challenge to reader
TEMPLATE 5 - Reflection + CTA: Hook (almost quit, vulnerable moment) → "Here's what kept me going:" → 3 habits/mindset shifts → Engagement prompt
TEMPLATE 6 - Authority Building: Hook (credibility statement — clients, years, results) → "Here's the one thing the most successful ones do:" → 3 insights → Closing thought
TEMPLATE 7 - Personal Reflection + Tips: Hook (personal struggle, specific year) → "Here's how I overcame it:" → 3 actionable tips → Question for audience
TEMPLATE 8 - Myth Busting: Hook (challenge a common belief) → "Here's why:" → 3 reasons the myth is wrong → CTA to debate
TEMPLATE 9 - Contrarian Opinion: Hook (bold contrarian take) → "Here's what works better:" → 3 alternatives → Engagement prompt
TEMPLATE 10 - Tactical Step-by-Step: Hook (specific struggle) → "Here's a step-by-step to fix it:" → 3 tactical steps → Encourage to try + report back
TEMPLATE 11 - Data + Insights: Hook (surprising stat or data point) → "Here's how to increase that:" → 3 strategies → CTA to compare notes
TEMPLATE 12 - Case Study: Hook (real result — client/self) → "Here's what we did:" → 3 actions taken → Reflection + engagement
TEMPLATE 13 - Failed Experiment: Hook (admit something didn't work) → "Here's what I learned:" → 3 lessons from failure → Engagement prompt
TEMPLATE 14 - Personal Growth: Hook (fear or weakness admitted) → "Here's how I overcame it:" → 3 growth steps → Question for audience
TEMPLATE 15 - Unexpected Insight: Hook (surprising observation) → "Here's what I've noticed:" → 3 insights → Encourage to share their experience
TEMPLATE 16 - Common Struggle + Fix: Hook (common pain point) → "Here's how to combat it:" → 3 fixes → Engagement prompt

STRICT WRITING RULES:
- Write exactly like Lara Acosta: short punchy lines, lots of white space, human and direct
- Hook: 1-2 lines max. Scroll-stopping. Personal or bold.
- Body: ALWAYS use the "Here's [what/how/why]:" line then exactly 3 numbered or bulleted points, each with a colon and 1-line explanation
- No corporate speak, no em dashes, no buzzwords like "game-changer" "leverage" "dive into"
- Short sentences. Real stories. Specific details (years, numbers, names).
- CTA: A single genuine question. Not salesy.
- hashtags: exactly 10 relevant tags (no # symbol)
- first_comment: A follow-up insight or story + 8 niche hashtags (no # symbol, space separated)
- Facebook: same template but slightly warmer/friendlier tone, shorter body

Return ONLY valid JSON, no markdown:
{"posts":[{"topic_id":"EXACT_ID_FROM_ABOVE","linkedin":{"hook":"","body":"","cta":"","hashtags":[],"first_comment":""},"facebook":{"hook":"","body":"","cta":"","hashtags":[],"first_comment":""}}]}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
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

    // Split into batches of 3 to avoid token limit issues
    const batchSize = 3
    const batches: Topic[][] = []
    for (let i = 0; i < approvedTopics.length; i += batchSize) {
      batches.push(approvedTopics.slice(i, i + batchSize))
    }

    // Process all batches
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
