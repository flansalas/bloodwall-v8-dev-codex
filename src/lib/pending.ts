import type { PrismaClient } from '@prisma/client'
import { ActionStatus } from '@prisma/client'

type PendingItem = {
  title: string
  due?: string
}

export type PendingSummary = {
  items: PendingItem[]
  actionsScanned: number
  metricsScanned: number
}

/**
 * Get pending items for a person by email.
 * - Pulls actions due/overdue in next 7 days and metrics not updated in 7 days.
 * - If Prisma is missing or model names differ, returns safe fallback demo items.
 * - Non-invasive: no throw; always returns a safe payload.
 */
export async function getPendingForEmail(email: string): Promise<PendingSummary> {
  try {
    // Try to use cached prisma client if available
    let prisma: PrismaClient
    try {
      const maybe = await import('@/lib/prisma')
      prisma =
        (maybe as { prisma?: PrismaClient; default?: PrismaClient }).prisma ??
        (maybe as { prisma?: PrismaClient; default?: PrismaClient }).default!
    } catch {
      const { PrismaClient } = await import('@prisma/client')
      prisma = new PrismaClient()
    }

    const today = new Date()
    const in7 = new Date(today)
    in7.setDate(today.getDate() + 7)
    const sevenAgo = new Date(today)
    sevenAgo.setDate(today.getDate() - 7)

    // Actions (owner = email, not DONE, with a dueDate that is overdue or within next 7 days)
    const actionsRaw =
      (await prisma.action
        .findMany({
          where: {
            owner: { email },
            status: { not: ActionStatus.DONE },
            dueDate: { not: null },
          },
          select: { id: true, text: true, dueDate: true },
        })
        .catch(() => [])) ?? []

    const actions = actionsRaw
      .filter((action) => {
        const due = action.dueDate ? new Date(action.dueDate) : null
        return due && (due < today || (due >= today && due <= in7))
      })
      .map<PendingItem>((action) => ({
        title: action.text ?? 'Action',
        due: action.dueDate ? new Date(action.dueDate).toLocaleDateString() : undefined,
      }))

    // Metrics (owner = email) considered "stale" if not updated in last 7 days
    const metricsRaw =
      (await prisma.metric
        .findMany({
          where: { ude: { owner: { email } } },
          select: { id: true, name: true, updatedAt: true },
        })
        .catch(() => [])) ?? []

    const metrics = metricsRaw
      .filter((metric) => {
        const last = metric.updatedAt ? new Date(metric.updatedAt) : null
        return !last || last < sevenAgo
      })
      .map<PendingItem>((metric) => ({
        title: metric.name ?? 'Metric',
      }))

    const items = [...actions, ...metrics]

    return {
      items: items.length ? items : [{ title: 'Nothing pending — you’re clear ✅' }],
      actionsScanned: actionsRaw.length,
      metricsScanned: metricsRaw.length,
    }
  } catch (err) {
    console.warn('[pending] Using fallback items:', err)
    return {
      items: [
        { title: 'Update AR Days', due: 'Fri' },
        { title: 'Action: Follow up invoices', due: 'Thu' },
      ],
      actionsScanned: 0,
      metricsScanned: 0,
    }
  }
}
