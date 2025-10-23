import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isReadOnly, withCronBypass } from '@/lib/runtimeFlags'
import { sendEmail } from '@/lib/mailer'
import { magicLinkFor } from '@/lib/magic'
import { personalReminderHtml } from '@/templates/reminders'
import { getPendingForEmail } from '@/lib/pending'

export const dynamic = 'force-dynamic'

const unauthorized = () =>
  NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

const forbidden = () =>
  NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

const internalError = () =>
  NextResponse.json({ ok: false, error: 'Internal Error' }, { status: 500 })

const readOnlyResponse = () =>
  NextResponse.json(
    {
      ok: true,
      skipped: true,
      reason: 'READ_ONLY: dry-run on serverless sqlite',
    },
    { status: 200 }
  )

function getCronSecret() {
  return process.env.CRON_SECRET ?? ''
}

function getDevKey() {
  return process.env.API_DEV_KEY ?? ''
}

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

function prepareRequestWithCronSecret(request: NextRequest): Request {
  const cronSecret = getCronSecret()
  if (!cronSecret) {
    return request
  }

  const headers = new Headers(request.headers)
  headers.set('x-cron-secret', cronSecret)
  return new Request(request, { headers })
}

async function processNightlyReminders(request: NextRequest) {
  if (process.env.READ_ONLY === '1') {
    return readOnlyResponse()
  }

  const cronAwareRequest = prepareRequestWithCronSecret(request)
  const method = request.method?.toUpperCase?.() ?? 'GET'

  const execute = async () => {
    if (isReadOnly(cronAwareRequest)) {
      return NextResponse.json(
        { error: 'Read-only mode: writes are disabled on this deployment.' },
        { status: 403 }
      )
    }

    const rawBody =
      method === 'GET'
        ? {}
        : ((await cronAwareRequest.json().catch(() => ({}))) as Record<string, unknown>)

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

    const items = Array.isArray(body?.items) ? body.items : await getPendingForEmail(to)

    const href = magicLinkFor(to, '/me')
    const html = personalReminderHtml(name, items, href)

    const info = await sendEmail({
      to,
      subject: `[Bloodwall] Quick update before MAM`,
      html,
      text: 'Please update your UDEs before MAM.',
    })

    const result: {
      ok: true
      sent: number
      to: string
      messageId?: string
      previewUrl?: string
    } = {
      ok: true,
      sent: 1,
      to,
    }

    if (info.messageId) {
      result.messageId = info.messageId
    }

    if (info.previewUrl) {
      result.previewUrl = info.previewUrl
    }

    return NextResponse.json(result)
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
    console.error('[cron nightly-reminders] Unexpected error', error)
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
