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
    ? `You are a world-class social media art director specialising in LinkedIn content for premium brands. Generate FOUR highly detailed image generation prompts for a LinkedIn carousel series. Each prompt must be 4-6 sentences long and art-directed at the level of a magazine editorial shoot.

Topic: "${topic.title}"
Brand colors (use as lighting, accents, rim light, or color grading — never flat fills): ${colorList}
Industry context: ${profile.description}

Rules for every prompt:
- Open with the HERO VISUAL: one powerful central metaphor or object that represents the slide's idea
- Describe LIGHTING: cinematic rim lighting, soft volumetric glow, or studio-quality directional light using brand colors as colored gel sources
- Describe COMPOSITION: camera angle, depth of field, foreground/background relationship
- Describe MOOD AND TEXTURE: surface materials, atmosphere, emotional tone
- NO generic stock photo scenes. NO office workers. NO laptops on desks.
- Style: editorial magazine — clean, intelligent, slightly aspirational
- End each prompt with: "Vertical portrait format 2:3, ultra-high detail, cinematic color grade, professional photography"

Slides:
1. Cover: Bold hero visual that represents the full topic. Strong visual metaphor. Brand color as dominant light source.
2. Slide 2: Visual metaphor for the FIRST key insight from this topic. Different object/scene from cover but same color language.
3. Slide 3: Visual metaphor for the SECOND key insight. Contrasting composition from slide 2 — if slide 2 was close-up, slide 3 is wide, etc.
4. CTA: Aspirational, forward-looking visual. Sense of achievement or transformation. Warm brand color tones.

Return ONLY a JSON array with exactly 4 strings, no markdown:
["cover prompt","slide 2 prompt","slide 3 prompt","cta prompt"]`
    : `You are a world-class social media art director specialising in LinkedIn content for premium brands. Generate ONE highly detailed image generation prompt for a ${graphicType}. The prompt must be 5-7 sentences long, art-directed at the level of a magazine editorial or premium brand campaign.

Topic: "${topic.title}"
Hook: "${hook}"
Brand colors (use as lighting, accents, rim light, or color grading — never flat fills): ${colorList}
Industry context: ${profile.description}
Graphic type: ${graphicType}

Rules:
- Open with the HERO VISUAL: one powerful central metaphor, object, or scene that represents the topic
- Describe a strong VISUAL METAPHOR — something unexpected and conceptual, not literal
- Describe LIGHTING in detail: cinematic rim lighting, volumetric light rays, or studio-quality directional light using brand colors as gel sources or halos
- Describe COMPOSITION: camera angle (top-down flat lay, 45-degree editorial, close-up macro, wide cinematic), depth of field, negative space
- Describe SURFACE AND TEXTURE: background material (dark linen, slate, polished concrete, aged paper), foreground props, tactile detail
- Describe MOOD: editorial intelligence, aspirational, slightly subversive, premium — never corporate clip art
- Style reference: Monocle magazine meets premium brand campaign
- End with: "Vertical portrait format 2:3, ultra-high detail, cinematic color grade, professional photography, no text"

Return ONLY this JSON, no markdown:
{"image_prompt":"...","structural_prompt":"5-8 bullet design brief describing the layout, typography, color usage, and mood"}`

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
