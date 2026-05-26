import { NextRequest, NextResponse } from 'next/server'
import { getProfile, saveProfile, type CompanyProfile } from '@/lib/local-store'

export async function GET() {
  const profile = getProfile()
  if (!profile) {
    return NextResponse.json({ profile: null }, { status: 200 })
  }
  return NextResponse.json({ profile })
}

export async function POST(req: NextRequest) {
  const body = await req.json() as CompanyProfile
  saveProfile(body)
  return NextResponse.json({ success: true, profile: body })
}
