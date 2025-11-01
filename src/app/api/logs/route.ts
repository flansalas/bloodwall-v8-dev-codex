import { NextResponse } from 'next/server'
import { isReadOnly } from '@/src/lib/runtimeFlags'
import { addActivityLog } from '@/lib/udeStore'
import { requireAdmin } from '../_lib/adminAuth'

export async function POST(req: Request) {
  const denied = requireAdmin(req as any);
  if (denied) return denied;
  if (isReadOnly(req)) {
    return NextResponse.json(
      { error: 'Read-only mode: writes are disabled on this deployment.' },
      { status: 403 }
    )
  }
  try {
    const body = await req.json()
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
