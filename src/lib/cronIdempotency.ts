import { Prisma, PrismaClient } from '@prisma/client'

export type CronJobName = 'nightly-reminders' | 'mam-reminder'

/**
 * Returns the current UTC date formatted as YYYY-MM-DD.
 */
export function utcDayKey(): string {
  const now = new Date()
  const startOfDayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  return startOfDayUtc.toISOString().slice(0, 10)
}

/**
 * Attempt to record a send for (job, recipient, dayKey). If a record already exists
 * for the current UTC day, the unique constraint causes a skip.
 */
export async function acquireSendLock(
  prisma: PrismaClient,
  job: CronJobName,
  recipientRaw: string
): Promise<{ ok: true; id: string } | { ok: false; reason: 'already-sent-today' }> {
  const recipient = recipientRaw.toLowerCase().trim()

  try {
    const row = await prisma.cronMailSend.create({
      data: {
        job,
        recipient,
        dayKey: utcDayKey(),
      },
      select: {
        id: true,
      },
    })

    return { ok: true, id: row.id }
  } catch (error) {
    if (
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') ||
      (error as { code?: string } | null)?.code === 'P2002'
    ) {
      return { ok: false, reason: 'already-sent-today' }
    }
    throw error
  }
}
