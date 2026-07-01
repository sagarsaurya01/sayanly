import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { CompanyProfile, Topic, Post } from '@/lib/local-store'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const body = await req.json() as { profile: CompanyProfile; topic: Topic; post: Post }
  const { profile, topic, post } = body

  const graphicType = topic.graphic_type ?? 'Static Graphic'
  const isCarousel = graphicType === 'Carousel'
  const hook = post?.linkedin?.hook ?? ''
  const body_text = post?.linkedin?.body ?? ''

  const allColors = [
    profile.brand_colors.primary,
    profile.brand_colors.secondary,
    ...(profile.brand_colors.palette ?? []).filter(Boolean),
  ]
  const primary = allColors[0] ?? '#1a1a2e'
  const secondary = allColors[1] ?? '#e5c0d9'
  const palette = allColors.slice(2)
  const colorList = allColors.join(', ')

  const brandName = profile.company_name ?? 'Brand'

  let systemPrompt = ''
  let userPrompt = ''

  if (isCarousel) {
    systemPrompt = `You are a world-class graphic designer. You create stunning LinkedIn carousel slides as SVG.
Return ONLY valid SVG code — no markdown, no explanation, no \`\`\`svg fences. Just raw SVG starting with <svg.
Rules:
- Each slide: 1080x1080px viewBox
- Dark, premium aesthetic — deep backgrounds, brand color accents
- Large bold typography, generous whitespace
- NO generic clip art. Clean editorial design.
- Text must be readable at social media size`

    userPrompt = `Create a 4-slide LinkedIn carousel for this topic.

Topic: "${topic.title}"
Hook: "${hook}"
Content: "${body_text.slice(0, 500)}"
Brand: ${brandName}
Brand colors: ${colorList}
Industry: ${profile.description}

Return 4 SVG slides separated by this exact delimiter on its own line:
---SLIDE---

Slide 1 - Cover: Bold title, strong visual metaphor using geometric shapes, primary brand color dominant
Slide 2 - First insight: Key point with supporting visual element, clean layout
Slide 3 - Second insight: Different layout from slide 2, contrasting composition
Slide 4 - CTA: "Follow for more", brand name prominent, warm closing tone

Each slide must be a complete standalone <svg viewBox="0 0 1080 1080"> element.`

  } else if (graphicType === 'Cheat Sheet') {
    systemPrompt = `You are a world-class graphic designer. You create stunning LinkedIn cheat sheets as SVG.
Return ONLY valid SVG code — no markdown, no explanation. Just raw SVG starting with <svg.
Rules:
- 1080x1350px viewBox (portrait)
- Dark premium background, brand color accents per section
- Numbered sections, clear hierarchy
- Bold section headers, readable body text
- Structured grid layout`

    userPrompt = `Create a premium LinkedIn cheat sheet graphic.

Topic: "${topic.title}"
Hook: "${hook}"
Content to structure: "${body_text.slice(0, 800)}"
Brand: ${brandName}
Primary color: ${primary}
Secondary color: ${secondary}
Accent colors: ${palette.join(', ') || secondary}

Design:
- Title at top with CONFIDENTIAL-style stamp aesthetic
- 6 numbered rule cards in a 2-column grid, each with its own brand accent color
- Each card: number badge, bold rule title, 1-line description
- Brand color dots footer
- Deep dark background (#0f1117 or similar)
- Return a complete <svg viewBox="0 0 1080 1350"> element`

  } else {
    systemPrompt = `You are a world-class graphic designer. You create stunning LinkedIn graphics as SVG.
Return ONLY valid SVG code — no markdown, no explanation. Just raw SVG starting with <svg.
Rules:
- 1080x1080px viewBox
- Dark premium aesthetic
- Strong visual metaphor using geometric shapes, abstract forms
- Brand colors as dominant palette
- Bold typography, minimal text`

    userPrompt = `Create a premium LinkedIn ${graphicType} graphic.

Topic: "${topic.title}"
Hook: "${hook}"
Brand: ${brandName}
Primary color: ${primary}
Secondary color: ${secondary}
All brand colors: ${colorList}
Industry: ${profile.description}

Design requirements:
- Strong central visual metaphor (geometric, abstract, conceptual — NOT clip art)
- Hook text as bold headline
- Brand colors used for shapes, gradients, accent elements
- Clean editorial layout with generous whitespace
- Return a complete <svg viewBox="0 0 1080 1080"> element`
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Failed to generate graphic' }, { status: 500 })
  }

  const raw = content.text.trim()

  if (isCarousel) {
    const parts = raw.split('---SLIDE---').map(s => s.trim()).filter(s => s.startsWith('<svg'))
    if (parts.length === 0) {
      return NextResponse.json({ error: 'Failed to generate carousel slides' }, { status: 500 })
    }
    const svgToDataUrl = (svg: string) =>
      `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

    const slides = parts.map(svgToDataUrl)
    return NextResponse.json({
      image_url: slides[0],
      slides,
      prompt: topic.title,
      structural_prompt: '',
      format: 'svg',
    })
  } else {
    const svgMatch = raw.match(/<svg[\s\S]*<\/svg>/)
    if (!svgMatch) {
      return NextResponse.json({ error: 'Failed to generate graphic' }, { status: 500 })
    }
    const svg = svgMatch[0]
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    return NextResponse.json({
      image_url: dataUrl,
      prompt: topic.title,
      structural_prompt: '',
      format: 'svg',
    })
  }
}
