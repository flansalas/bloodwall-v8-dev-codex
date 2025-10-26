import { NextResponse, type NextRequest } from 'next/server'
import { isReadOnly, withCronBypass } from '@/lib/runtimeFlags'
import { acquireSendLock } from '@/lib/cronIdempotency'
import { sendEmail } from '@/lib/mailer'
import { magicLinkFor } from '@/lib/magic'
import { personalReminderHtml } from '@/templates/reminders'
import { getPendingForEmail } from '@/lib/pending'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const unauthorized = () =>
  NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

const forbidden = () =>
  NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })

const internalError = () =>
  NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 })

const readOnlyResponse = () =>
  NextResponse.json(
    {
      ok: true,
      skipped: true,
      reason: 'READ_ONLY: dry-run on serverless sqlite',
    },
    { status: 200 }
  )

const cronReadOnlyResponse = () =>
  NextResponse.json(
    { ok: false, error: 'read_only' },
    { status: 403 }
  )

const getCronSecret = () => process.env.CRON_SECRET ?? ''
const getDevKey = () => process.env.API_DEV_KEY ?? ''

function isAuthorized(request: NextRequest) {
  const cronSecret = getCronSecret()
  const authHeader = request.headers.get('authorization') ?? ''
  const bearerOk = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`

  const headerSecret = request.headers.get('x-cron-secret') ?? ''
  const headerOk = Boolean(cronSecret) && headerSecret === cronSecret

  const querySecret = new URL(request.url).searchParams.get('secret') ?? ''
  const queryOk = Boolean(cronSecret) && querySecret === cronSecret

  const devHeader = request.headers.get('x-bw-dev-key') ?? ''
  const devOk = Boolean(getDevKey()) && devHeader === getDevKey()

  return bearerOk || headerOk || queryOk || devOk
}

const toUpperMethod = (method?: string | null) => method?.toUpperCase() ?? 'GET'

function prepareRequestWithCronSecret(request: NextRequest): Request {
  const cronSecret = getCronSecret()
  if (!cronSecret) {
    return request
  }

  const headers = new Headers(request.headers)
  headers.set('x-cron-secret', cronSecret)
  return new Request(request, { headers })
}

type ReminderSummary = {
  method: string
  recipient: string
  itemsQueued: number
  sent: number
  messageId?: string
  previewUrl?: string
  itemsSource: 'payload' | 'database'
  actionsScanned: number
  metricsScanned: number
  skipped?: boolean
  reason?: string
}

async function runNightlyJob(cronAwareRequest: Request, method: string): Promise<ReminderSummary> {
  if (isReadOnly(cronAwareRequest)) {
    throw new Error('__READ_ONLY__')
  }

  const rawBody = method === 'GET' ? {} : await cronAwareRequest.json().catch(() => ({}))
  const body = rawBody as {
    name?: string
    to?: string
    items?: unknown
  }

  const name = typeof body?.name === 'string' && body.name.trim() ? body.name : 'Teammate'
  const envRedirect = process.env.EMAIL_REDIRECT?.trim()
  const to =
    envRedirect && envRedirect.length > 0
      ? envRedirect
      : typeof body?.to === 'string' && body.to.trim()
        ? body.to
        : 'you@example.com'

  const usingPayloadItems = Array.isArray(body?.items)
  const pending = usingPayloadItems ? null : await getPendingForEmail(to)
  const items = usingPayloadItems ? (body.items as unknown[]) : pending?.items ?? []

  const lock = await acquireSendLock(prisma, 'nightly-reminders', to)
  if (!lock.ok) {
    console.log(
      '[nightly-reminders] idempotent-skip recipient=%s reason=%s',
      to,
      'already-sent-today'
    )
    return {
      method,
      recipient: to,
      itemsQueued: Array.isArray(items) ? items.length : 0,
      sent: 0,
      itemsSource: usingPayloadItems ? 'payload' : 'database',
      actionsScanned: pending?.actionsScanned ?? 0,
      metricsScanned: pending?.metricsScanned ?? 0,
      skipped: true,
      reason: 'already-sent-today',
    }
  }

  const href = magicLinkFor(to, '/me')
  const html = personalReminderHtml(name, items, href)

  const info = await sendEmail({
    to,
    subject: `[Bloodwall] Quick update before MAM`,
    html,
    text: 'Please update your UDEs before MAM.',
  })

  const summary: ReminderSummary = {
    method,
    recipient: to,
    itemsQueued: Array.isArray(items) ? items.length : 0,
    sent: 1,
    itemsSource: usingPayloadItems ? 'payload' : 'database',
    actionsScanned: pending?.actionsScanned ?? 0,
    metricsScanned: pending?.metricsScanned ?? 0,
  }

  if (info.messageId) {
    summary.messageId = info.messageId
  }

  if (info.previewUrl) {
    summary.previewUrl = info.previewUrl
  }

  return summary
}

async function processNightlyReminders(request: NextRequest) {
  if (process.env.READ_ONLY === '1') {
    return readOnlyResponse()
  }

  const cronAwareRequest = prepareRequestWithCronSecret(request)
  const method = toUpperMethod(request.method)

  const execute = async () => {
    try {
      const summary = await runNightlyJob(cronAwareRequest, method)
      const result = { ok: true, summary }
      console.log('[nightly-reminders] result:', JSON.stringify(result))
      return NextResponse.json(result)
    } catch (error) {
      if (error instanceof Error && error.message === '__READ_ONLY__') {
        return cronReadOnlyResponse()
      }
      console.error('[cron nightly-reminders] job failed', error)
      return internalError()
    }
  }

  try {
    if (getCronSecret()) {
      const response = await withCronBypass(cronAwareRequest, execute)
      return response
    }
    return await execute()
  } catch (error) {
    if (error instanceof Error && error.message === '__CRON_FORBIDDEN__') {
      return forbidden()
    }
    console.error('[cron nightly-reminders] unexpected error', error)
    return internalError()
  }
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return unauthorized()
  }
  return processNightlyReminders(request)
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
