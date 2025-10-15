import { NextRequest, NextResponse } from 'next/server'
import { forwardStatus } from '@/lib/udeStore'
import { UDEStatus } from '@prisma/client'

const parseId = (value: string) => {
  const id = Number.parseInt(value, 10)
  if (!Number.isInteger(id)) {
    throw new Error('Invalid UDE id')
  }
  return id
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseId(params.id)
    const body = await request.json()

    if (!body.status || !Object.values(UDEStatus).includes(body.status)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 })
    }

    const updated = await forwardStatus(id, body.status, body.actor)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[POST /api/udes/:id/forward]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
