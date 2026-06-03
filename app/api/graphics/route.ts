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

  // Step 1: Claude writes a sharp, creative image prompt
  const promptRequest = `You are a world-class art director for social media. Create a UNIQUE, visually striking image prompt — NOT a generic stock photo.

Topic: "${topic.title}"
Hook: "${post.linkedin.hook}"
Brand colors: ${profile.brand_colors.primary} and ${profile.brand_colors.secondary}
Industry: ${profile.description}

Rules:
- Think like a magazine cover or viral social post — bold, conceptual, unexpected
- Use a strong VISUAL METAPHOR for the topic (avoid literal "person at laptop" clichés)
- Incorporate the brand colors as dramatic lighting, gradients, or accent elements
- Cinematic composition — rule of thirds, strong foreground subject, clean background
- NO text, NO logos, NO words in the image
- Pick ONE of these creative styles that fits best: bold flat illustration, cinematic 3D render, dramatic macro photography, surreal conceptual art, or high-contrast graphic design
- The image must STOP someone mid-scroll

Write a single punchy prompt of max 3 sentences. Return ONLY the prompt.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: 'You are a viral social media art director. Write short, punchy, visually specific image prompts that are never generic. Return only the prompt, no explanation.',
    messages: [{ role: 'user', content: promptRequest }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Failed to generate prompt' }, { status: 500 })
  }

  const imagePrompt = content.text.trim()

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
    return NextResponse.json({ image_url, prompt: imagePrompt })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Image generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
