import { Prisma } from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { isReadOnly, withCronBypass } from '@/lib/runtimeFlags'
import { sendEmail } from '@/lib/mailer'
import { prisma } from '@/lib/prisma'
import { isCronAuthorized } from '@/lib/cronAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function mamReminderHtml(companyName: string, ctaHref: string) {
  return `
    <html>
      <body>
        <h1>MAM Reminder — ${companyName}</h1>
        <p>Weekly review is coming up. Take 30 seconds to make sure your cards are current.</p>
        <p><a href="${ctaHref}" target="_blank" rel="noopener noreferrer"
              style="display:inline-block;padding:10px 14px;border:1px solid #111;border-radius:999px;text-decoration:none">
          Open Dashboard →
        </a></p>
      </body>
    </html>
  `
}

const getCronSecret = () => process.env.CRON_SECRET ?? ''
const getDevKey = () => process.env.API_DEV_KEY ?? ''

const unauthorized = () =>
  NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

const forbidden = () =>
  NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })

const cronReadOnlyResponse = () =>
  NextResponse.json({ ok: false, error: 'read_only' }, { status: 403 })

const readOnlyResponse = () =>
  NextResponse.json(
    {
      ok: true,
      skipped: true,
      reason: 'READ_ONLY: dry-run on serverless sqlite',
    },
    { status: 200 }
  )

const internalError = () =>
  NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 })

function isAuthorized(request: NextRequest) {
  const cronSecret = getCronSecret()
  const authHeader = request.headers.get('authorization') ?? ''
  const bearerOk = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`

  const headerSecret = request.headers.get('x-cron-secret') ?? ''
  const headerOk = Boolean(cronSecret) && headerSecret === cronSecret

  const querySecret = new URL(request.url).searchParams.get('secret') ?? ''
  const queryOk = Boolean(cronSecret) && querySecret === cronSecret

  const devKey = getDevKey()
  const devHeader = request.headers.get('x-bw-dev-key') ?? ''
  const devOk = Boolean(devKey) && devHeader === devKey

  return bearerOk || headerOk || queryOk || devOk
}

function prepareRequestWithCronSecret(request: NextRequest): Request {
  const cronSecret = getCronSecret()
  if (!cronSecret) {
    return request
  }
  const headers = new Headers(request.headers)
  headers.set('x-cron-secret', cronSecret)
  return new Request(request, { headers })
}

type MamSummary = {
  method: string
  recipients: string[]
  sent: number
  messageId?: string
  previewUrl?: string
  companyName: string
  ctaHref: string
  skipped?: boolean
  skippedCount?: number
  reason?: string
  dateKey?: string
}

async function runMamReminder(request: Request, method: string): Promise<MamSummary> {
  if (isReadOnly(request)) {
    throw new Error('__READ_ONLY__')
  }

  const body = method === 'GET' ? {} : await request.json().catch(() => ({} as Record<string, unknown>))

  const companyName =
    typeof body?.companyName === 'string' && body.companyName.trim() ? body.companyName : 'Bloodwall'

  const requestUrl = new URL(request.url)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${requestUrl.protocol}//${requestUrl.host}`
  const ctaHref = `${baseUrl}/mam`
  const html = mamReminderHtml(companyName, ctaHref)

  const to = process.env.EMAIL_REDIRECT || 'flansalas@yahoo.com'
  const recipients = [to]

  const job = 'mam-reminder'
  const url = new URL(request.url)
  const force = url.searchParams.get('force') === '1'
  const dateKey = new Date().toISOString().slice(0, 10)
  const email = to
  let mailSendCreated = false

  if (!force) {
    try {
      await prisma.mailSend.create({
        data: {
          job,
          email,
          dateKey,
        },
      })
      mailSendCreated = true
    } catch (error) {
      if (
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') ||
        ((error as { code?: string } | null)?.code === 'P2002')
      ) {
        console.log(`[mam-reminder] idempotent-skip email=${email} dateKey=${dateKey}`)
        return {
          method,
          recipients,
          sent: 0,
          companyName,
          ctaHref,
          skipped: true,
          skippedCount: recipients.length,
          reason: 'already-sent-today',
          dateKey,
        }
      }
      throw error
    }
  }

  const uniqueTarget = { mail_once_per_day: { job, email, dateKey } }

  try {
    const info = await sendEmail({
      to: email,
      subject: `[Bloodwall] MAM Reminder — ${companyName}`,
      html,
      text: `Weekly review is coming up. Open your dashboard: ${ctaHref}`,
    })

    if (!force && mailSendCreated) {
      await prisma.mailSend.update({
        where: uniqueTarget,
        data: { messageId: info.messageId ?? null },
      })
    }

    const summary: MamSummary = {
      method,
      recipients,
      sent: 1,
      companyName,
      ctaHref,
      dateKey,
    }
    if (info.messageId) {
      summary.messageId = info.messageId
    }
    if (info.previewUrl) {
      summary.previewUrl = info.previewUrl
    }

    return summary
  } catch (error) {
    if (!force && mailSendCreated) {
      await prisma.mailSend
        .delete({ where: uniqueTarget })
        .catch(() => {})
    }
    throw error
  }
}

async function processMamReminder(request: NextRequest) {
  if (process.env.READ_ONLY === '1') {
    return readOnlyResponse()
  }

  const method = request.method?.toUpperCase?.() ?? 'GET'
  const cronAwareRequest = prepareRequestWithCronSecret(request)

  const execute = async () => {
    try {
      const summary = await runMamReminder(cronAwareRequest, method)
      const result = { ok: true, summary }
      console.log('[mam-reminder] result:', JSON.stringify(result))
      return NextResponse.json(result)
    } catch (error) {
      if (error instanceof Error && error.message === '__READ_ONLY__') {
        return cronReadOnlyResponse()
      }
      console.error('[mam-reminder] job failed', error)
      return internalError()
    }
  }

  try {
    if (getCronSecret()) {
      return await withCronBypass(cronAwareRequest, execute)
    }
    return await execute()
  } catch (error) {
    if (error instanceof Error && error.message === '__CRON_FORBIDDEN__') {
      return forbidden()
    }
    console.error('[mam-reminder] unexpected error', error)
    return internalError()
  }
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return unauthorized()
  }
  return processMamReminder(request)
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return new Response(JSON.stringify({ ok:false, error:'unauthorized' }), { status: 401 });
  }
  return handle(req)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
