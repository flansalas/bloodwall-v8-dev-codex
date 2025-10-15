import { NextRequest, NextResponse } from 'next/server'
import { isReadOnly } from '@/lib/runtimeFlags'
import { getUDEById, updateUDE } from '@/lib/udeStore'
import { UDEStatus } from '@prisma/client'

const parseId = (value: string) => {
  const id = Number.parseInt(value, 10)
  if (!Number.isInteger(id)) {
    throw new Error('Invalid UDE id')
  }
  return id
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseId(params.id)
    const ude = await getUDEById(id)
    if (!ude) {
      return NextResponse.json({ error: 'UDE not found' }, { status: 404 })
    }
    return NextResponse.json(ude)
  } catch (error) {
    console.error('[GET /api/udes/:id]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (isReadOnly()) {
    return NextResponse.json(
      { error: 'Read-only mode: writes are disabled on this deployment.' },
      { status: 403 }
    )
  }
  try {
    const id = parseId(params.id)
    const body = await request.json()

    const payload: Record<string, unknown> = {}
    if (typeof body.title === 'string') payload.title = body.title
    if (body.status && Object.values(UDEStatus).includes(body.status)) payload.status = body.status
    if (typeof body.costImpact !== 'undefined') payload.costImpact = Number(body.costImpact)
    if ('ownerId' in body) {
      if (body.ownerId === null) {
        payload.ownerId = null
      } else {
        const ownerId = Number.parseInt(body.ownerId, 10)
        if (!Number.isNaN(ownerId)) {
          payload.ownerId = ownerId
        }
      }
    }
    if ('categoryId' in body) {
      if (body.categoryId === null) {
        payload.categoryId = null
      } else {
        const categoryId = Number.parseInt(body.categoryId, 10)
        if (!Number.isNaN(categoryId)) {
          payload.categoryId = categoryId
        }
      }
    }
    if ('dueDate' in body) payload.dueDate = body.dueDate

    const updated = await updateUDE(id, payload)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/udes/:id]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
