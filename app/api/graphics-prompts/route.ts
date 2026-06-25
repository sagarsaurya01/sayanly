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

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const body = await req.json() as { profile: CompanyProfile; topic: Topic; post: Post }
  const { profile, topic, post } = body

  const graphicType = topic.graphic_type ?? 'Static Graphic'
  const isCarousel = graphicType === 'Carousel'

  const allColors = [
    profile.brand_colors.primary,
    profile.brand_colors.secondary,
    ...(profile.brand_colors.palette ?? []).filter(Boolean),
  ]
  const colorList = allColors.join(', ')

  const promptRequest = `You are a world-class social media art director and graphic designer.

Topic: "${topic.title}"
Hook: "${post.linkedin.hook}"
Brand colors: ${colorList}
Industry: ${profile.description}
Graphic Type: ${graphicType}

${isCarousel ? `Generate FOUR slide image prompts for a carousel post, plus a structural brief.

Each slide prompt must be visually distinct but use the same brand colors and design language.
Slides:
1. Cover: ${CAROUSEL_SLIDES[0].instruction}
2. Slide 2: ${CAROUSEL_SLIDES[1].instruction}
3. Slide 3: ${CAROUSEL_SLIDES[2].instruction}
4. CTA: ${CAROUSEL_SLIDES[3].instruction}

Return ONLY this JSON:
{"slide_prompts":["cover prompt","slide2 prompt","slide3 prompt","cta prompt"],"structural_prompt":"designer brief with slide-by-slide breakdown..."}`
: `Generate ONE detailed image prompt and a structural designer brief.

Image prompt rules:
- Bold, conceptual, unexpected — NOT generic stock photos
- Strong visual metaphor for the topic
- Incorporate brand colors (${colorList}) as lighting, gradients, or accents
- Cinematic composition
${graphicType === 'Infographic' ? '- Style: Data visualization, icons, flow charts, bold stats, brand color scheme' : ''}
${graphicType === 'Cheat Sheet' ? '- Style: Clean structured layout, numbered sections, checklist aesthetic, brand colors as section dividers' : ''}
${graphicType === 'Static Graphic' ? '- Style: Bold editorial graphic, strong single focal point, magazine cover energy' : ''}

Structural brief: 5-8 bullet points covering canvas size, background, text zones, visual elements, color usage, font style.

Return ONLY this JSON:
{"image_prompt":"...","structural_prompt":"..."}`}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: 'You are a social media art director. Return valid JSON only, no markdown.',
      messages: [{ role: 'user', content: promptRequest }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Failed to generate prompts' }, { status: 500 })
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(content.text.trim())
    } catch {
      const match = content.text.match(/\{[\s\S]*\}/)
      if (!match) return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
      parsed = JSON.parse(match[0])
    }

    if (isCarousel) {
      return NextResponse.json({
        isCarousel: true,
        slide_prompts: parsed.slide_prompts as string[],
        structural_prompt: parsed.structural_prompt as string,
      })
    } else {
      return NextResponse.json({
        isCarousel: false,
        image_prompt: parsed.image_prompt as string,
        structural_prompt: parsed.structural_prompt as string,
      })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Prompt generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
