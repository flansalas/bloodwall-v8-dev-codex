import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ActionStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mailer'
import { buildNightlyDigestEmail, type DigestActionItem } from '@/lib/cronEmail'
import { isReadOnly, withCronBypass } from '@/lib/runtimeFlags'

export const dynamic = 'force-dynamic'

const DIGEST_SUBJECT = '[Bloodwall] Nightly Digest'

const forbidden = () =>
  NextResponse.json(
    { ok: false, error: 'forbidden' },
    { status: 403 }
  )

const methodNotAllowed = () =>
  NextResponse.json(
    { ok: false, error: 'Method Not Allowed' },
    { status: 405 }
  )

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET ?? ''
  const headerSecret = request.headers.get('x-cron-secret') ?? ''

  if (!cronSecret || headerSecret !== cronSecret) {
    return forbidden()
  }

  if (process.env.READ_ONLY === '1') {
    return NextResponse.json({ ok: true, sent: false, count: 0 })
  }

  const cookieEmail =
    cookies()
      .get('userEmail')
      ?.value?.trim()
      .toLowerCase() ?? ''

  try {
    if (isReadOnly(request)) {
      return NextResponse.json(
        { ok: false, error: 'Read-only mode: writes are disabled on this deployment.' },
        { status: 403 }
      )
    }

    return await withCronBypass(request, async () => {
      // Pull upcoming and overdue actions for the next 24 hours.
      const now = Date.now()
      const windowEnd = new Date(now + 24 * 60 * 60 * 1000)

      const actions = await prisma.action.findMany({
        where: {
          status: { in: [ActionStatus.IN_PROGRESS, ActionStatus.NOT_STARTED] },
          dueDate: { not: null, lte: windowEnd },
        },
        include: { owner: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      const digestItems: DigestActionItem[] = actions.map((action) => ({
        ownerName: action.owner?.name ?? 'Unassigned',
        text: action.text,
        dueDate: action.dueDate ? new Date(action.dueDate) : null,
      }))

      const digest = buildNightlyDigestEmail(digestItems)

      const adminEmail = process.env.ADMIN_EMAIL?.trim() ?? ''
      const targetEmail = cookieEmail || adminEmail

      if (!targetEmail) {
        console.info('[cron daily-digest] No recipient available; skipping send.')
        return NextResponse.json({
          ok: true,
          sent: false,
          count: digest.count,
        })
      }

      const devTestMode = process.env.DEV_TEST_EMAIL === '1'
      const providerConfigured = Boolean(
        process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
      )

      if (!providerConfigured && !devTestMode) {
        console.warn('[cron daily-digest] Email provider not configured; skipping send.')
        return NextResponse.json({
          ok: true,
          sent: false,
          count: digest.count,
        })
      }

      try {
        // Send via shared mailer to keep behavior consistent with other routes.
        const info = await sendEmail({
          to: targetEmail,
          subject: DIGEST_SUBJECT,
          html: digest.html,
          text: digest.text,
        })

        return NextResponse.json({
          ok: true,
          sent: true,
          count: digest.count,
          ...(info?.previewUrl ? { previewUrl: info.previewUrl } : {}),
        })
      } catch (error) {
        console.error('[cron daily-digest] Failed to send digest email.', error)
        return NextResponse.json(
          { ok: false, error: 'internal_error' },
          { status: 500 }
        )
      }
    })
  } catch (error) {
    if (error instanceof Error && error.message === '__CRON_FORBIDDEN__') {
      return forbidden()
    }
    console.error('[cron daily-digest] Unexpected error.', error)
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    )
  }
}

export const GET = methodNotAllowed
export const PUT = methodNotAllowed
export const PATCH = methodNotAllowed
export const DELETE = methodNotAllowed
