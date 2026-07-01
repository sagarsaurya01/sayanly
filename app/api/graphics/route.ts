import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { CompanyProfile, Topic, Post } from '@/lib/local-store'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CAROUSEL_SLIDES = [
  { label: 'Cover Slide', instruction: 'Bold cover slide with topic title as headline, strong visual hook, brand color background. Large text, minimal content.' },
  { label: 'Slide 2', instruction: 'First key point or insight. Clean layout with one bold stat or statement, supporting visual element.' },
  { label: 'Slide 3', instruction: 'Second key point. Different layout from slide 2 but same brand feel. Visual metaphor for the content.' },
  { label: 'CTA Slide', instruction: 'Final call-to-action slide. Bold CTA text, brand colors, clean minimal layout. Encourage engagement.' },
]

async function generateWithOpenAI(prompt: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const image = await openai.images.generate({
    model: 'gpt-image-2',
    prompt,
    size: '1024x1536',
    quality: 'high',
    n: 1,
  })
  const imageData = image.data?.[0]
  if (!imageData) throw new Error('No image data returned')
  return imageData.url ?? `data:image/png;base64,${imageData.b64_json}`
}

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

  const graphicType = topic.graphic_type ?? 'Static Graphic'
  const isCarousel = graphicType === 'Carousel'
  const hook = post?.linkedin?.hook ?? ''

  const allColors = [
    profile.brand_colors.primary,
    profile.brand_colors.secondary,
    ...(profile.brand_colors.palette ?? []).filter(Boolean),
  ]
  const colorList = allColors.join(', ')

  // Step 1: Claude writes image prompts
  const promptRequest = isCarousel
    ? `You are a social media art director. Generate FOUR image prompts for a LinkedIn carousel.

Topic: "${topic.title}"
Brand colors: ${colorList}
Industry: ${profile.description}

Slides:
1. Cover: ${CAROUSEL_SLIDES[0].instruction}
2. Slide 2: ${CAROUSEL_SLIDES[1].instruction}
3. Slide 3: ${CAROUSEL_SLIDES[2].instruction}
4. CTA: ${CAROUSEL_SLIDES[3].instruction}

Return ONLY a JSON array with exactly 4 strings, no markdown:
["cover prompt","slide 2 prompt","slide 3 prompt","cta prompt"]`
    : `You are a social media art director. Generate ONE image prompt for a ${graphicType}.

Topic: "${topic.title}"
Hook: "${hook}"
Brand colors: ${colorList}
Industry: ${profile.description}

Rules:
- Bold, conceptual visual — NOT generic stock photos
- Strong visual metaphor for the topic
- Incorporate brand colors as lighting or accents
- Cinematic composition

Return ONLY this JSON, no markdown:
{"image_prompt":"...","structural_prompt":"5-8 bullet design brief"}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: 'You are a social media art director. Return only valid JSON, no markdown.',
    messages: [{ role: 'user', content: promptRequest }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Failed to generate prompts' }, { status: 500 })
  }

  const raw = content.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  try {
    if (isCarousel) {
      const arrMatch = raw.match(/\[[\s\S]*\]/)
      if (!arrMatch) return NextResponse.json({ error: 'Failed to parse carousel prompts' }, { status: 500 })
      const slidePrompts = JSON.parse(arrMatch[0]) as string[]

      const slideUrls: string[] = []
      for (const p of slidePrompts) {
        slideUrls.push(await generateWithOpenAI(p))
      }
      return NextResponse.json({
        image_url: slideUrls[0],
        slides: slideUrls,
        prompt: slidePrompts.join(' | '),
        structural_prompt: '',
      })
    } else {
      const parsed = safeParseJSON(raw)
      if (!parsed) return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
      const imagePrompt = parsed.image_prompt as string
      const image_url = await generateWithOpenAI(imagePrompt)
      return NextResponse.json({ image_url, prompt: imagePrompt, structural_prompt: parsed.structural_prompt as string })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Image generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
