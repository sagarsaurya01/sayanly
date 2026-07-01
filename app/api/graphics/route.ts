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
  await page.setContent(html, { waitUntil: 'load' })
  const buffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1350 } })
  await browser.close()
  return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`
}

function buildCheatSheetHtml(bgUrl: string, title: string, rules: { num: number; heading: string; desc: string; color: string }[], brandColors: string[]): string {
  const cards = rules.map(r => `
    <div style="background:rgba(10,10,20,0.72);border-left:3px solid ${r.color};border-radius:0 10px 10px 0;padding:16px 18px;display:flex;gap:14px;align-items:flex-start;">
      <div style="min-width:32px;height:32px;border-radius:50%;background:${r.color};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#000;flex-shrink:0;">${r.num}</div>
      <div>
        <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:5px;line-height:1.25;">${r.heading}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.55;">${r.desc}</div>
      </div>
    </div>`).join('')

  const dots = brandColors.slice(0,6).map(c => `<span style="width:9px;height:9px;border-radius:50%;background:${c};display:inline-block;margin-right:4px;"></span>`).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{width:1080px;height:1350px;overflow:hidden;font-family:'Helvetica Neue',Arial,sans-serif;}
  .wrap{width:1080px;height:1350px;position:relative;}
  .bg{position:absolute;inset:0;background:url('${bgUrl}') center/cover no-repeat;}
  .overlay{position:absolute;inset:0;background:linear-gradient(160deg,rgba(0,0,0,0.45) 0%,rgba(0,0,0,0.82) 60%,rgba(0,0,0,0.92) 100%);}
  .content{position:relative;z-index:2;padding:50px 55px;height:100%;display:flex;flex-direction:column;}
  .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;}
  .stamp{border:2px solid #e05c4b;border-radius:4px;padding:4px 14px;transform:rotate(10deg);}
  .stamp span{color:#e05c4b;font-size:11px;font-weight:700;letter-spacing:0.18em;}
  .title{font-size:42px;font-weight:800;color:#fff;line-height:1.1;letter-spacing:-0.02em;max-width:700px;}
  .subtitle{font-size:12px;color:rgba(255,255,255,0.4);letter-spacing:0.12em;margin-top:8px;margin-bottom:36px;}
  .rules{display:flex;flex-direction:column;gap:14px;}
  .footer{margin-top:auto;padding-top:32px;display:flex;justify-content:space-between;align-items:center;}
  .watermark{font-size:11px;color:rgba(255,255,255,0.25);letter-spacing:0.1em;}
</style>
</head>
<body>
<div class="wrap">
  <div class="bg"></div>
  <div class="overlay"></div>
  <div class="content">
    <div class="top">
      <div>
        <div class="title">${title}</div>
        <div class="subtitle">WHAT NO COLLEGE TEACHES YOU</div>
      </div>
      <div class="stamp"><span>CONFIDENTIAL</span></div>
    </div>
    <div class="rules">${cards}</div>
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
