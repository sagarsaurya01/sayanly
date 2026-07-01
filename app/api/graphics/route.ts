import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import puppeteer from 'puppeteer-core'
import type { CompanyProfile, Topic, Post } from '@/lib/local-store'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function generateImage(prompt: string, n: number = 1): Promise<string[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const result = await openai.images.generate({
    model: 'gpt-image-2',
    prompt,
    size: '1024x1536',
    quality: 'high',
    n,
  })
  return (result.data ?? []).map(d => d.url ?? `data:image/png;base64,${d.b64_json}`)
}

async function screenshotHtml(html: string): Promise<string> {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: true,
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1080, height: 1350 })
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const buffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1350 } })
  await browser.close()
  return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`
}

function buildCheatSheetHtml(bgUrl: string, title: string, rules: { num: number; heading: string; desc: string; color: string }[], brandColors: string[]): string {
  const cards = rules.map(r => `
    <div style="background:rgba(0,0,0,0.55);border:1px solid ${r.color}44;border-radius:12px;padding:18px 20px;backdrop-filter:blur(6px);">
      <div style="width:28px;height:28px;border-radius:50%;background:${r.color};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#000;margin-bottom:10px;">${r.num}</div>
      <div style="font-size:15px;font-weight:700;color:${r.color};margin-bottom:6px;line-height:1.3;">${r.heading}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.75);line-height:1.6;">${r.desc}</div>
    </div>`).join('')

  const dots = brandColors.map(c => `<span style="width:10px;height:10px;border-radius:50%;background:${c};display:inline-block;margin-right:5px;"></span>`).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{width:1080px;height:1350px;overflow:hidden;font-family:'Helvetica Neue',Arial,sans-serif;}
  .wrap{width:1080px;height:1350px;position:relative;}
  .bg{position:absolute;inset:0;background:url('${bgUrl}') center/cover no-repeat;}
  .overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.65) 0%,rgba(0,0,0,0.75) 100%);}
  .content{position:relative;z-index:2;padding:48px 52px;height:100%;display:flex;flex-direction:column;}
  .stamp{border:2px solid #e05c4b;border-radius:4px;padding:3px 12px;display:inline-block;transform:rotate(8deg);margin-bottom:20px;align-self:flex-end;}
  .stamp span{color:#e05c4b;font-size:12px;font-weight:700;letter-spacing:0.15em;}
  .title{font-size:36px;font-weight:800;color:#fff;line-height:1.15;margin-bottom:6px;letter-spacing:-0.01em;}
  .subtitle{font-size:13px;color:rgba(255,255,255,0.45);letter-spacing:0.1em;margin-bottom:32px;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:1;}
  .footer{margin-top:24px;display:flex;justify-content:space-between;align-items:center;}
  .watermark{font-size:11px;color:rgba(255,255,255,0.3);letter-spacing:0.08em;}
</style>
</head>
<body>
<div class="wrap">
  <div class="bg"></div>
  <div class="overlay"></div>
  <div class="content">
    <div class="stamp"><span>CONFIDENTIAL</span></div>
    <div class="title">${title}</div>
    <div class="subtitle">WHAT NO COLLEGE TEACHES YOU</div>
    <div class="grid">${cards}</div>
    <div class="footer">
      <div>${dots}</div>
      <div class="watermark">SAVE · SHARE · APPLY</div>
    </div>
  </div>
</div>
</body></html>`
}

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const body = await req.json() as { profile: CompanyProfile; topic: Topic; post: Post }
  const { profile, topic, post } = body

  const graphicType = topic.graphic_type ?? 'Static Graphic'
  const isCarousel = graphicType === 'Carousel'
  const isStructured = graphicType === 'Cheat Sheet' || graphicType === 'Infographic'
  const hook = post?.linkedin?.hook ?? ''
  const bodyText = post?.linkedin?.body ?? ''

  const allColors = [
    profile.brand_colors.primary,
    profile.brand_colors.secondary,
    ...(profile.brand_colors.palette ?? []).filter(Boolean),
  ]
  const colorList = allColors.join(', ')

  // ── STRUCTURED: Cheat Sheet / Infographic ────────────────────────────────
  if (isStructured) {
    const contentMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: 'You are a social media content designer. Return only valid JSON, no markdown.',
      messages: [{
        role: 'user',
        content: `Extract or create exactly 6 rules/tips from this content for a LinkedIn ${graphicType}.

Topic: "${topic.title}"
Content: "${bodyText.slice(0, 800) || hook}"
Brand colors available: ${colorList}

Return ONLY this JSON:
{
  "title": "short punchy title (4-6 words max)",
  "rules": [
    {"num":1,"heading":"Rule title (4-6 words)","desc":"One sentence explanation. Max 15 words.","color":"${allColors[0]}"},
    {"num":2,"heading":"Rule title","desc":"One sentence.","color":"${allColors[1] ?? allColors[0]}"},
    {"num":3,"heading":"Rule title","desc":"One sentence.","color":"${allColors[2] ?? allColors[0]}"},
    {"num":4,"heading":"Rule title","desc":"One sentence.","color":"${allColors[3] ?? allColors[1] ?? allColors[0]}"},
    {"num":5,"heading":"Rule title","desc":"One sentence.","color":"${allColors[4] ?? allColors[0]}"},
    {"num":6,"heading":"Rule title","desc":"One sentence.","color":"${allColors[5] ?? allColors[1] ?? allColors[0]}"}
  ],
  "bg_prompt": "Cinematic dark background image: [describe a moody atmospheric scene related to the topic — NO text, NO people, NO UI elements]. Deep shadows, brand colors ${colorList} as rim lighting. Ultra-high detail, no text."
}`
      }],
    })

    const contentRaw = contentMsg.content[0].type === 'text' ? contentMsg.content[0].text : ''
    const contentMatch = contentRaw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim().match(/\{[\s\S]*\}/)
    if (!contentMatch) return NextResponse.json({ error: 'Failed to parse content' }, { status: 500 })
    const parsed = JSON.parse(contentMatch[0]) as { title: string; rules: { num: number; heading: string; desc: string; color: string }[]; bg_prompt: string }

    const [bgUrl] = await generateImage(parsed.bg_prompt, 1)
    const html = buildCheatSheetHtml(bgUrl, parsed.title, parsed.rules, allColors.slice(0, 6))
    const image_url = await screenshotHtml(html)

    return NextResponse.json({ image_url, prompt: parsed.bg_prompt, structural_prompt: '', slides: undefined })
  }

  // ── CAROUSEL ─────────────────────────────────────────────────────────────
  if (isCarousel) {
    const promptMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: 'You are a social media art director. Return only valid JSON array, no markdown.',
      messages: [{
        role: 'user',
        content: `Generate FOUR detailed image prompts for a LinkedIn carousel.

Topic: "${topic.title}"
Brand colors (use as rim lighting/color grading): ${colorList}
Industry: ${profile.description}

Each prompt: 4-5 sentences. Hero visual → lighting → composition → mood. No text in images. No office workers.
Style: editorial magazine, cinematic, premium.
End each with: "Vertical portrait 2:3, ultra-high detail, cinematic color grade, no text"

Slides: Cover | First insight | Second insight | CTA/aspirational

Return ONLY: ["prompt1","prompt2","prompt3","prompt4"]`
      }],
    })

    const pRaw = promptMsg.content[0].type === 'text' ? promptMsg.content[0].text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim() : ''
    const arrMatch = pRaw.match(/\[[\s\S]*\]/)
    if (!arrMatch) return NextResponse.json({ error: 'Failed to parse carousel prompts' }, { status: 500 })
    const slidePrompts = JSON.parse(arrMatch[0]) as string[]

    const slideUrls = await generateImage(slidePrompts.join('\n\n'), 4)
    return NextResponse.json({ image_url: slideUrls[0], slides: slideUrls, prompt: slidePrompts.join(' | '), structural_prompt: '' })
  }

  // ── STATIC GRAPHIC ────────────────────────────────────────────────────────
  const promptMsg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: 'You are a social media art director. Return only valid JSON, no markdown.',
    messages: [{
      role: 'user',
      content: `Generate ONE detailed image prompt for a LinkedIn static graphic.

Topic: "${topic.title}"
Hook: "${hook}"
Brand colors (rim lighting/color grading): ${colorList}
Industry: ${profile.description}

5-6 sentences: hero visual → unexpected metaphor → cinematic lighting using brand colors → composition → mood/texture.
No text in image. No office workers. Style: Monocle magazine meets premium brand campaign.
End with: "Vertical portrait 2:3, ultra-high detail, cinematic color grade, no text"

Return ONLY: {"image_prompt":"...","structural_prompt":"5 bullet design brief"}`
    }],
  })

  const sRaw = promptMsg.content[0].type === 'text' ? promptMsg.content[0].text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim() : ''
  const sMatch = sRaw.match(/\{[\s\S]*\}/)
  if (!sMatch) return NextResponse.json({ error: 'Failed to parse prompt' }, { status: 500 })
  const { image_prompt, structural_prompt } = JSON.parse(sMatch[0]) as { image_prompt: string; structural_prompt: string }
  const [image_url] = await generateImage(image_prompt, 1)
  return NextResponse.json({ image_url, prompt: image_prompt, structural_prompt })
}
