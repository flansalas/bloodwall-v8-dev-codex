import { PrismaClient } from '@prisma/client'

export type CronJobName = 'nightly-reminders' | 'mam-reminder'

const TAG = 'cron-mail'

let cachedAnchorUdeId: number | null | undefined

/**
 * Returns the UTC YYYY-MM-DD string for the current day.
 */
export function todaysUtcDateKey(): string {
  const now = new Date()
  const startOfDayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )

  return startOfDayUtc.toISOString().slice(0, 10)
}

function startOfDayFromKey(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00.000Z`)
}

async function resolveAnchorUdeId(prisma: PrismaClient): Promise<number | null> {
  if (cachedAnchorUdeId !== undefined) {
    return cachedAnchorUdeId
  }

  try {
    const existingLog = await prisma.activityLog.findFirst({
      select: { udeId: true },
      orderBy: { id: 'asc' },
    })

    if (existingLog?.udeId) {
      cachedAnchorUdeId = existingLog.udeId
      return cachedAnchorUdeId
    }

    const fallbackUde = await prisma.uDE.findFirst({
      select: { id: true },
      orderBy: { id: 'asc' },
    })

    if (fallbackUde?.id) {
      cachedAnchorUdeId = fallbackUde.id
      return cachedAnchorUdeId
    }
  } catch (error) {
    console.warn('[cron-idempotency] failed to resolve ActivityLog anchor UDE', error)
  }

  cachedAnchorUdeId = null
  return null
}

/**
 * Checks if the cron job already logged a send marker today for the recipient.
 */
export async function alreadySentToday(
  prisma: PrismaClient,
  job: CronJobName,
  recipient: string
): Promise<boolean> {
  const dayKey = todaysUtcDateKey()
  const marker = `${TAG}:${job}:${recipient.toLowerCase().trim()}:${dayKey}`

  try {
    const existing = await prisma.activityLog.findFirst({
      where: {
        message: { contains: marker },
        timestamp: { gte: startOfDayFromKey(dayKey) },
      },
      select: { id: true },
    })

    return Boolean(existing)
  } catch (error) {
    console.warn('[cron-idempotency] failed to query ActivityLog', {
      job,
      recipient,
      error,
    })
    return false
  }
}

/**
 * Records a send marker in ActivityLog so future runs can skip duplicates.
 */
export async function recordSent(
  prisma: PrismaClient,
  job: CronJobName,
  recipient: string,
  messageId?: string
): Promise<void> {
  const dayKey = todaysUtcDateKey()
  const normalizedRecipient = recipient.toLowerCase().trim()
  const marker = `${TAG}:${job}:${normalizedRecipient}:${dayKey}`
  const payload = messageId ? `${marker} messageId=${messageId}` : marker

  try {
    const udeId = await resolveAnchorUdeId(prisma)

    if (!udeId) {
      console.warn(
        '[cron-idempotency] unable to resolve ActivityLog udeId; skipping marker',
        { job, recipient }
      )
      return
    }

    await prisma.activityLog.create({
      data: {
        udeId,
        message: payload,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    console.warn('[cron-idempotency] failed to record ActivityLog marker', {
      job,
      recipient,
      error,
    })
  }
}
