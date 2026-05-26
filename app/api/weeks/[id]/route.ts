import { NextRequest, NextResponse } from 'next/server'
import { getWeek, updateWeek, deleteWeek, type Week } from '@/lib/local-store'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const week = getWeek(id)
  if (!week) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 })
  }
  return NextResponse.json({ week })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const updates = await req.json() as Partial<Week>
  const week = updateWeek(id, updates)
  if (!week) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 })
  }
  return NextResponse.json({ success: true, week })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  deleteWeek(id)
  return NextResponse.json({ success: true })
}
