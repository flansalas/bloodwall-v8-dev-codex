import { NextResponse } from 'next/server'
import { isReadOnly } from '@/src/lib/runtimeFlags'
import { addMetric } from '@/lib/udeStore'

export async function POST(request: Request) {
  if (isReadOnly(request)) {
    return NextResponse.json(
      { error: 'Read-only mode: writes are disabled on this deployment.' },
      { status: 403 }
    )
  }
  try {
    const body = await request.json()
    const udeId = Number.parseInt(body.udeId, 10)
    if (!Number.isInteger(udeId)) {
      return NextResponse.json({ error: 'udeId is required' }, { status: 400 })
    }

    if (!body.name) {
      return NextResponse.json({ error: 'Metric name is required' }, { status: 400 })
    }

    const metric = await addMetric(udeId, {
      name: String(body.name),
      baseline: Number(body.baseline ?? 0),
      goal: Number(body.goal ?? 0),
      current: Number(body.current ?? 0),
      lastWeek: Number(body.lastWeek ?? 0),
    })

    return NextResponse.json(metric, { status: 201 })
  } catch (error) {
    console.error('[POST /api/metrics]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
