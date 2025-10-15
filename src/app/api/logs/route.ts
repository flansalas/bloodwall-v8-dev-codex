import { NextRequest, NextResponse } from 'next/server'
import { addActivityLog } from '@/lib/udeStore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const udeId = Number.parseInt(body.udeId, 10)
    if (!Number.isInteger(udeId)) {
      return NextResponse.json({ error: 'udeId is required' }, { status: 400 })
    }

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const log = await addActivityLog(udeId, body.message)
    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('[POST /api/logs]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
