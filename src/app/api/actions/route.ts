import { NextRequest, NextResponse } from 'next/server'
import { isReadOnly } from '@/lib/runtimeFlags'
import { addAction } from '@/lib/udeStore'
import { ActionStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  if (isReadOnly()) {
    return NextResponse.json(
      { error: 'Read-only mode: writes are disabled on this deployment.' },
      { status: 403 }
    )
  }
  try {
    const body = await request.json()
    const udeId = Number.parseInt(body.udeId, 10)
    const ownerId = Number.parseInt(body.ownerId, 10)

    if (!Number.isInteger(udeId)) {
      return NextResponse.json({ error: 'udeId is required' }, { status: 400 })
    }

    if (!Number.isInteger(ownerId)) {
      return NextResponse.json({ error: 'ownerId is required' }, { status: 400 })
    }

    if (!body.text) {
      return NextResponse.json({ error: 'Action text is required' }, { status: 400 })
    }

    const action = await addAction(udeId, {
      text: String(body.text),
      ownerId,
      status: body.status && Object.values(ActionStatus).includes(body.status) ? body.status : undefined,
      dueDate: body.dueDate ?? null,
    })

    return NextResponse.json(action, { status: 201 })
  } catch (error) {
    console.error('[POST /api/actions]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
