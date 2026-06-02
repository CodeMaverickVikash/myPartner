import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email: string }

  const raw = process.env.ALLOWED_EMAILS ?? ''
  if (!raw.trim()) {
    return NextResponse.json({ allowed: true })
  }

  const allowed = raw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .includes(email.trim().toLowerCase())

  return NextResponse.json({ allowed })
}
