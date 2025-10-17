import { NextRequest, NextResponse } from 'next/server'
import { isReadOnly } from '@/lib/runtimeFlags'
import { createUDE, getAllUDEs } from '@/lib/udeStore'
import { resolveCompanyId } from '@/lib/companyService'
import { UDEStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const companyIdParam = request.nextUrl.searchParams.get('companyId')
    const companyId = await resolveCompanyId(companyIdParam)
    const udes = await getAllUDEs(companyId)
    return NextResponse.json({ udes })
  } catch (error) {
    console.error('[GET /api/udes]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (isReadOnly(request)) {
    return NextResponse.json(
      { ok: false, error: 'read_only' },
      { status: 403 }
    )
  }
  try {
    const body = await request.json()
    const companyId = await resolveCompanyId(body.companyId)

    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const ownerId = Number.parseInt(body.ownerId, 10)
    if (!Number.isInteger(ownerId)) {
      return NextResponse.json({ error: 'ownerId is required' }, { status: 400 })
    }

    const categoryId = Number.parseInt(body.categoryId, 10)
    if (!Number.isInteger(categoryId)) {
      return NextResponse.json({ error: 'categoryId is required' }, { status: 400 })
    }

    if (!body.metric) {
      return NextResponse.json({ error: 'Metric payload is required' }, { status: 400 })
    }

    const created = await createUDE({
      companyId,
      title: body.title,
      status: body.status && Object.values(UDEStatus).includes(body.status) ? body.status : UDEStatus.DEFINED,
      ownerId,
      categoryId,
      costImpact: Number.parseInt(body.costImpact ?? '0', 10) || 0,
      dueDate: body.dueDate ?? null,
      metric: {
        name: body.metric.name,
        baseline: Number(body.metric.baseline ?? 0),
        goal: Number(body.metric.goal ?? 0),
        current: Number(body.metric.current ?? 0),
        lastWeek: Number(body.metric.lastWeek ?? 0),
      },
      actions: Array.isArray(body.actions)
        ? body.actions.map((action: any) => ({
            text: String(action.text ?? ''),
            ownerId: Number(action.ownerId),
            status: action.status,
            dueDate: action.dueDate ?? null,
          }))
        : undefined,
      initialLogs: Array.isArray(body.logs) ? body.logs.map((log: any) => String(log)) : undefined,
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('[POST /api/udes]', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
