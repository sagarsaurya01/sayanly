import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { CompanyProfile, Topic, Post } from '@/lib/local-store'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const body = await req.json() as { profile: CompanyProfile; topic: Topic; post: Post }
  const { profile, topic, post } = body

  const graphicType = topic.graphic_type ?? 'Static Graphic'

  // Step 1: Claude writes both visual prompt + structural prompt
  const promptRequest = `You are a world-class social media art director and graphic designer.

Topic: "${topic.title}"
Hook: "${post.linkedin.hook}"
Brand colors: ${profile.brand_colors.primary} (primary) and ${profile.brand_colors.secondary} (secondary)
Industry: ${profile.description}
Graphic Type: ${graphicType}

Generate TWO things:

1. IMAGE_PROMPT: A punchy, visually specific AI image generation prompt (max 3 sentences). Rules:
- Bold, conceptual, unexpected — NOT generic stock photos
- Strong visual metaphor for the topic
- Incorporate brand colors as lighting, gradients, or accents
- Cinematic composition
${graphicType === 'Carousel' ? '- Style: Multi-panel flat design with bold typography sections, clean grid layout, brand color backgrounds per slide' : ''}
${graphicType === 'Infographic' ? '- Style: Data visualization aesthetic, icons, flow charts, bold stats, brand color scheme' : ''}
${graphicType === 'Cheat Sheet' ? '- Style: Clean structured layout with numbered sections, checklist aesthetic, brand colors as section dividers' : ''}
${graphicType === 'Static Graphic' ? '- Style: Bold editorial graphic, strong single focal point, magazine cover energy' : ''}

2. STRUCTURAL_PROMPT: A designer brief (5-8 bullet points) describing exact layout for a human or Canva designer:
- Canvas size and orientation
- Background color/treatment
- Text zones (headline, subheadline, body text — positions)
- Visual elements (icons, shapes, images — positions)
- Color usage per section
- Font style guidance
- ${graphicType === 'Carousel' ? 'Number of slides and what each slide contains' : 'Overall composition flow'}

Return ONLY this JSON, no markdown:
{"image_prompt":"...","structural_prompt":"..."}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: 'You are a social media art director and graphic designer. Return valid JSON only.',
    messages: [{ role: 'user', content: promptRequest }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Failed to generate prompts' }, { status: 500 })
  }

  let imagePrompt = ''
  let structuralPrompt = ''
  try {
    const parsed = JSON.parse(content.text.trim()) as { image_prompt: string; structural_prompt: string }
    imagePrompt = parsed.image_prompt
    structuralPrompt = parsed.structural_prompt
  } catch {
    const match = content.text.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0]) as { image_prompt: string; structural_prompt: string }
      imagePrompt = parsed.image_prompt
      structuralPrompt = parsed.structural_prompt
    } else {
      imagePrompt = content.text.trim()
    }
  }

  // Step 2: gpt-image-1 generates the image
  try {
    const image = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: imagePrompt,
      size: '1024x1024',
    })

    const imageData = image.data?.[0]
    if (!imageData) throw new Error('No image data returned')
    const image_url = imageData.url ?? `data:image/png;base64,${imageData.b64_json}`
    return NextResponse.json({ image_url, prompt: imagePrompt, structural_prompt: structuralPrompt })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Image generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
