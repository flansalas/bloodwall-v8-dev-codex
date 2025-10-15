import { ActionStatus, Prisma, UDEStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const udeInclude = {
  category: true,
  owner: true,
  metrics: {
    orderBy: { createdAt: 'desc' },
  },
  actions: {
    include: { owner: true },
    orderBy: { createdAt: 'asc' },
  },
  activityLog: {
    orderBy: { timestamp: 'desc' },
  },
} satisfies Prisma.UDEInclude

export type UDEWithRelations = Prisma.UDEGetPayload<{ include: typeof udeInclude }>

export type CreateMetricInput = {
  name: string
  baseline: number
  goal: number
  current: number
  lastWeek: number
}

export type CreateActionInput = {
  text: string
  ownerId: number
  dueDate?: Date | string | null
  status?: ActionStatus
}

export type CreateUDEInput = {
  companyId: number
  title: string
  status?: UDEStatus
  ownerId: number
  categoryId: number
  costImpact: number
  dueDate?: Date | string | null
  metric: CreateMetricInput
  actions?: CreateActionInput[]
  initialLogs?: string[]
}

export type UpdateUDEInput = Partial<
  Pick<UDEWithRelations, 'title' | 'status' | 'costImpact'> & {
    ownerId: number | null
    categoryId: number | null
    dueDate: Date | string | null
  }
>

export type UpdateMetricInput = Partial<Pick<CreateMetricInput, 'baseline' | 'goal' | 'current' | 'lastWeek' | 'name'>>

export type UpdateActionInput = Partial<{
  text: string
  ownerId: number
  status: ActionStatus
  dueDate: Date | string | null
}>

const normalizeDate = (value: Date | string | null | undefined) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export async function getAllUDEs(companyId: number) {
  return prisma.uDE.findMany({
    where: { companyId },
    include: udeInclude,
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function getUDEById(id: number) {
  return prisma.uDE.findUnique({
    where: { id },
    include: udeInclude,
  })
}

export async function createUDE(input: CreateUDEInput) {
  const created = await prisma.uDE.create({
    data: {
      title: input.title,
      status: input.status ?? UDEStatus.DEFINED,
      costImpact: input.costImpact,
      dueDate: normalizeDate(input.dueDate) ?? null,
      ownerId: input.ownerId,
      categoryId: input.categoryId,
      companyId: input.companyId,
      metrics: {
        create: {
          name: input.metric.name,
          baseline: input.metric.baseline,
          goal: input.metric.goal,
          current: input.metric.current,
          lastWeek: input.metric.lastWeek,
        },
      },
      actions: input.actions
        ? {
            create: input.actions.map((action) => ({
              text: action.text,
              status: action.status ?? ActionStatus.NOT_STARTED,
              ownerId: action.ownerId,
              dueDate: normalizeDate(action.dueDate) ?? undefined,
            })),
          }
        : undefined,
      activityLog: input.initialLogs
        ? {
            create: input.initialLogs.map((message, index) => ({
              message,
              timestamp: new Date(Date.now() - index * 1000 * 60 * 10),
            })),
          }
        : undefined,
    },
    include: udeInclude,
  })

  return created
}

export async function updateUDE(id: number, input: UpdateUDEInput) {
  const data: Prisma.UDEUpdateInput = {}

  if (typeof input.title === 'string') data.title = input.title
  if (typeof input.costImpact === 'number') data.costImpact = input.costImpact
  if (input.status) data.status = input.status
  if ('ownerId' in input) data.owner = input.ownerId ? { connect: { id: input.ownerId } } : { disconnect: true }
  if ('categoryId' in input) data.category = input.categoryId ? { connect: { id: input.categoryId } } : { disconnect: true }
  if ('dueDate' in input) {
    const dueDate = normalizeDate((input as { dueDate?: Date | string | null }).dueDate ?? null)
    data.dueDate = dueDate ?? null
  }

  const updated = await prisma.uDE.update({
    where: { id },
    data,
    include: udeInclude,
  })

  return updated
}

export async function forwardStatus(id: number, newStatus: UDEStatus, actor?: string) {
  await prisma.uDE.update({
    where: { id },
    data: { status: newStatus },
  })

  const message = actor ? `Status moved to ${newStatus} via ${actor}.` : `Status moved to ${newStatus}.`
  await prisma.activityLog.create({
    data: {
      udeId: id,
      message,
    },
  })

  const refreshed = await getUDEById(id)
  if (!refreshed) {
    throw new Error('UDE not found after status update')
  }
  return refreshed
}

export async function addMetric(udeId: number, input: CreateMetricInput) {
  return prisma.metric.create({
    data: {
      udeId,
      name: input.name,
      baseline: input.baseline,
      goal: input.goal,
      current: input.current,
      lastWeek: input.lastWeek,
    },
  })
}

export async function updateMetric(metricId: number, input: UpdateMetricInput) {
  const data: Prisma.MetricUpdateInput = {}

  if (typeof input.name === 'string') data.name = input.name
  if (typeof input.baseline === 'number') data.baseline = input.baseline
  if (typeof input.goal === 'number') data.goal = input.goal
  if (typeof input.current === 'number') data.current = input.current
  if (typeof input.lastWeek === 'number') data.lastWeek = input.lastWeek

  return prisma.metric.update({
    where: { id: metricId },
    data,
  })
}

export async function addAction(udeId: number, input: CreateActionInput) {
  return prisma.action.create({
    data: {
      udeId,
      text: input.text,
      ownerId: input.ownerId,
      status: input.status ?? ActionStatus.NOT_STARTED,
      dueDate: normalizeDate(input.dueDate) ?? undefined,
    },
    include: { owner: true },
  })
}

export async function updateAction(actionId: number, input: UpdateActionInput) {
  const data: Prisma.ActionUpdateInput = {}

  if (typeof input.text === 'string') data.text = input.text
  if (typeof input.status === 'string') data.status = input.status
  if ('ownerId' in input && input.ownerId) data.owner = { connect: { id: input.ownerId } }
  if ('dueDate' in input) data.dueDate = normalizeDate(input.dueDate ?? null) ?? null

  return prisma.action.update({
    where: { id: actionId },
    data,
    include: { owner: true },
  })
}

export async function addActivityLog(udeId: number, message: string) {
  return prisma.activityLog.create({
    data: {
      udeId,
      message,
    },
  })
}

export async function getDueUDEs(companyId: number, withinDays = 7) {
  const now = new Date()
  const end = new Date()
  end.setDate(end.getDate() + withinDays)

  return prisma.uDE.findMany({
    where: {
      companyId,
      dueDate: {
        gte: now,
        lte: end,
      },
    },
    include: udeInclude,
    orderBy: { dueDate: 'asc' },
  })
}

export function getPrimaryMetric(ude: UDEWithRelations) {
  return ude.metrics[0] ?? null
}

export function getProgressToGoal(ude: UDEWithRelations) {
  const metric = getPrimaryMetric(ude)
  if (!metric) return 0

  const denominator = metric.baseline - metric.goal
  if (Math.abs(denominator) < Number.EPSILON) {
    return 0
  }
  const value = ((metric.baseline - metric.current) / denominator) * 100
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}
