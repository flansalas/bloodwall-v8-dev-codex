import { NextRequest, NextResponse } from 'next/server'
import { updateMetric } from '@/lib/udeStore'

const parseId = (value: string) => {
  const id = Number.parseInt(value, 10)
  if (!Number.isInteger(id)) {
    throw new Error('Invalid metric id')
  }
  return id
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseId(params.id)
    const body = await request.json()

    const updated = await updateMetric(id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      baseline: typeof body.baseline !== 'undefined' ? Number(body.baseline) : undefined,
      goal: typeof body.goal !== 'undefined' ? Number(body.goal) : undefined,
      current: typeof body.current !== 'undefined' ? Number(body.current) : undefined,
      lastWeek: typeof body.lastWeek !== 'undefined' ? Number(body.lastWeek) : undefined,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/metrics/:id]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
