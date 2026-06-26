import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { CompanyProfile, Topic, Post } from '@/lib/local-store'

export const dynamic = 'force-dynamic'

const CAROUSEL_SLIDES = [
  { label: 'Cover Slide', instruction: 'Bold cover slide with topic title as headline, strong visual hook, brand color background. Large text, minimal content.' },
  { label: 'Slide 2', instruction: 'First key point or insight. Clean layout with one bold stat or statement, supporting visual element.' },
  { label: 'Slide 3', instruction: 'Second key point. Different layout from slide 2 but same brand feel. Visual metaphor for the content.' },
  { label: 'CTA Slide', instruction: 'Final call-to-action slide. Bold CTA text, brand colors, clean minimal layout. Encourage engagement.' },
]

function safeParseJSON(text: string): Record<string, unknown> | null {
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(stripped) } catch { /* ignore */ }
  const match = stripped.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const body = await req.json() as { profile: CompanyProfile; topic: Topic; post: Post }
  const { profile, topic, post } = body

  if (!topic || !profile) {
    return NextResponse.json({ error: 'Missing topic or profile' }, { status: 400 })
  }

  const graphicType = topic.graphic_type ?? 'Static Graphic'
  const isCarousel = graphicType === 'Carousel'
  const hook = post?.linkedin?.hook ?? ''

  const allColors = [
    profile.brand_colors.primary,
    profile.brand_colors.secondary,
    ...(profile.brand_colors.palette ?? []).filter(Boolean),
  ]
  const colorList = allColors.join(', ')

  const promptRequest = isCarousel
    ? `You are a social media art director. Generate FOUR image prompts for a LinkedIn carousel post.

Topic: "${topic.title}"
Brand colors: ${colorList}
Industry: ${profile.description}

Slides:
1. Cover: ${CAROUSEL_SLIDES[0].instruction}
2. Slide 2: ${CAROUSEL_SLIDES[1].instruction}
3. Slide 3: ${CAROUSEL_SLIDES[2].instruction}
4. CTA: ${CAROUSEL_SLIDES[3].instruction}

Return ONLY a JSON array with exactly 4 strings. No markdown, no explanation:
["cover prompt","slide 2 prompt","slide 3 prompt","cta prompt"]`
    : `You are a social media art director. Generate ONE image prompt for a ${graphicType}.

Topic: "${topic.title}"
Hook: "${hook}"
Brand colors: ${colorList}
Industry: ${profile.description}

Rules:
- Bold, conceptual visual metaphor — NOT generic stock photos
- Incorporate brand colors as lighting or accents
- Cinematic composition
${graphicType === 'Infographic' ? '- Data visualization, icons, bold stats style' : ''}
${graphicType === 'Cheat Sheet' ? '- Clean structured layout, numbered sections' : ''}
${graphicType === 'Static Graphic' ? '- Bold editorial graphic, magazine cover energy' : ''}

Return ONLY this JSON, no markdown:
{"image_prompt":"...","structural_prompt":"5-8 bullet design brief"}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: 'You are a social media art director. Return only valid JSON, no markdown, no explanation.',
      messages: [{ role: 'user', content: promptRequest }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'No text response from AI' }, { status: 500 })
    }

    const raw = content.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

    if (isCarousel) {
      const arrMatch = raw.match(/\[[\s\S]*\]/)
      if (!arrMatch) {
        return NextResponse.json({ error: 'Failed to parse carousel prompts', raw: raw.slice(0, 300) }, { status: 500 })
      }
      let slidePrompts: string[] = []
      try {
        slidePrompts = JSON.parse(arrMatch[0]) as string[]
      } catch {
        return NextResponse.json({ error: 'Failed to parse carousel JSON', raw: raw.slice(0, 300) }, { status: 500 })
      }
      return NextResponse.json({ isCarousel: true, slide_prompts: slidePrompts, structural_prompt: '' })
    }

    const parsed = safeParseJSON(raw)
    if (!parsed) {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: raw.slice(0, 300) }, { status: 500 })
    }
    return NextResponse.json({
      isCarousel: false,
      image_prompt: parsed.image_prompt as string,
      structural_prompt: parsed.structural_prompt as string,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Prompt generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
