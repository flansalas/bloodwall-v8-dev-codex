import { NextRequest, NextResponse } from 'next/server'
import { updateAction } from '@/lib/udeStore'
import { ActionStatus } from '@prisma/client'

const parseId = (value: string) => {
  const id = Number.parseInt(value, 10)
  if (!Number.isInteger(id)) {
    throw new Error('Invalid action id')
  }
  return id
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseId(params.id)
    const body = await request.json()

    const payload: Record<string, unknown> = {}
    if (typeof body.text === 'string') payload.text = body.text
    if (body.status && Object.values(ActionStatus).includes(body.status)) payload.status = body.status
    if ('ownerId' in body) {
      const ownerId = Number.parseInt(body.ownerId, 10)
      if (!Number.isNaN(ownerId)) {
        payload.ownerId = ownerId
      }
    }
    if ('dueDate' in body) payload.dueDate = body.dueDate

    const action = await updateAction(id, payload)
    return NextResponse.json(action)
  } catch (error) {
    console.error('[PATCH /api/actions/:id]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
