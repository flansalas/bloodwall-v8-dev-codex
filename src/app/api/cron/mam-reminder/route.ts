import { NextResponse, type NextRequest } from 'next/server'
import { isReadOnly, withCronBypass } from '@/lib/runtimeFlags'

export const dynamic = 'force-dynamic'

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
  to: string
  sent: number
  messageId?: string
  previewUrl?: string
}

async function runMamReminder(request: Request, method: string): Promise<MamSummary> {
  if (isReadOnly(request)) {
    throw new Error('__READ_ONLY__')
  }

  const body = method === 'GET' ? {} : await request.json().catch(() => ({} as Record<string, unknown>))

  const companyName =
    typeof body?.companyName === 'string' && body.companyName.trim() ? body.companyName : 'Bloodwall'

  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const ctaHref = `${base}/`
  const html = mamReminderHtml(companyName, ctaHref)

  const to = process.env.EMAIL_REDIRECT || 'flansalas@yahoo.com'
  const fromEmail = process.env.FROM_EMAIL || 'no-reply@bloodwall.local'
  const fromName = process.env.FROM_NAME || 'Bloodwall'

  const { sendMail } = await import('@/lib/mailer')
  const result = await sendMail({
    to,
    subject: `[Bloodwall] MAM Reminder — ${companyName}`,
    html,
    text: `Weekly review is coming up. Open your dashboard: ${ctaHref}`,
    fromEmail,
    fromName,
  })

  return {
    method,
    to,
    sent: 1,
    messageId: result.messageId,
    previewUrl: result.previewUrl,
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
        return forbidden()
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

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
