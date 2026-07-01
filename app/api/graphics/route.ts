import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { CompanyProfile, Topic, Post } from '@/lib/local-store'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function generateImage(prompt: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const image = await openai.images.generate({
    model: 'gpt-image-2',
    prompt,
    size: '1024x1536',
    quality: 'high',
    n: 1,
  })
  const d = image.data?.[0]
  if (!d) throw new Error('No image returned')
  return d.url ?? `data:image/png;base64,${d.b64_json}`
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

  const promptRequest = isCarousel
    ? `You are a world-class social media art director. Generate FOUR highly detailed image generation prompts for a LinkedIn carousel series. Each prompt must be 4-6 sentences long.

Topic: "${topic.title}"
Brand colors (use as rim lighting, color grading, or accent glow — never flat fills): ${colorList}
Industry: ${profile.description}

Rules for every prompt:
- Open with a powerful HERO VISUAL: one central metaphor or object representing the slide idea
- Describe LIGHTING: cinematic rim lighting using brand colors as colored gel sources
- Describe COMPOSITION: camera angle, depth of field, negative space
- Describe MOOD AND TEXTURE: surface materials, atmosphere, emotional tone
- NO office workers, NO laptops, NO generic stock scenes
- Style: editorial magazine — premium, intelligent, aspirational
- End each prompt with: "Vertical portrait 2:3 ratio, ultra-high detail, cinematic color grade, no text"

Slides:
1. Cover: Bold hero visual for the full topic, brand color as dominant light source
2. Slide 2: Visual metaphor for the first key insight, different scene from cover
3. Slide 3: Visual metaphor for the second key insight, contrasting composition to slide 2
4. CTA: Aspirational forward-looking visual, sense of achievement, warm brand tones

Return ONLY a JSON array with exactly 4 strings, no markdown:
["prompt1","prompt2","prompt3","prompt4"]`
    : `You are a world-class social media art director. Generate ONE highly detailed image generation prompt for a ${graphicType}. The prompt must be 5-7 sentences long.

Topic: "${topic.title}"
Hook: "${hook}"
Brand colors (use as rim lighting, color grading, accent glow — never flat fills): ${colorList}
Industry: ${profile.description}

Rules:
- Open with a powerful HERO VISUAL: one unexpected conceptual metaphor for the topic
- Describe LIGHTING: cinematic rim lighting or volumetric glow using brand colors as gel sources
- Describe COMPOSITION: camera angle (top-down flat lay, 45-degree editorial, close-up macro, wide cinematic), depth of field
- Describe SURFACE AND TEXTURE: background material, foreground props, tactile detail
- Describe MOOD: editorial intelligence, premium, slightly subversive — never corporate clip art
- Style: Monocle magazine meets premium brand campaign
- End with: "Vertical portrait 2:3 ratio, ultra-high detail, cinematic color grade, no text overlay"

Return ONLY this JSON, no markdown:
{"image_prompt":"...","structural_prompt":"5-8 bullet design brief"}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
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
        slideUrls.push(await generateImage(p))
      }
      return NextResponse.json({
        image_url: slideUrls[0],
        slides: slideUrls,
        prompt: slidePrompts.join(' | '),
        structural_prompt: '',
      })
    } else {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
      const parsed = JSON.parse(match[0]) as { image_prompt: string; structural_prompt: string }
      const image_url = await generateImage(parsed.image_prompt)
      return NextResponse.json({ image_url, prompt: parsed.image_prompt, structural_prompt: parsed.structural_prompt })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Image generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
