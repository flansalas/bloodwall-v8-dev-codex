import { NextResponse } from "next/server"
import { isReadOnly } from "@/src/lib/runtimeFlags"
import { updateAction } from '@/lib/udeStore'
import { ActionStatus } from '@prisma/client'
import { requireAdmin } from '../../_lib/adminAuth'

const parseId = (value: string) => {
  const id = Number.parseInt(value, 10)
  if (!Number.isInteger(id)) {
    throw new Error('Invalid action id')
  }
  return id
}

export async function PATCH(req: Request, ctx: any) {
  const denied = requireAdmin(req as any);
  if (denied) return denied;
  if (isReadOnly(req)) {
    return NextResponse.json(
      { error: 'Read-only mode: writes are disabled on this deployment.' },
      { status: 403 }
    )
  }
  const id = ctx?.params?.id as string
  try {
    const parsedId = parseId(id)
    const body = await req.json()

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

    const action = await updateAction(parsedId, payload)
    return NextResponse.json(action)
  } catch (error) {
    console.error('[PATCH /api/actions/:id]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
