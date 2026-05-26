import { NextRequest, NextResponse } from 'next/server'
import { getAllWeeks, saveWeek, type Week } from '@/lib/local-store'

export async function GET() {
  const weeks = getAllWeeks()
  return NextResponse.json({ weeks })
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Week
  saveWeek(body)
  return NextResponse.json({ success: true, week: body })
}
