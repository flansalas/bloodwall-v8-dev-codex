import { NextRequest, NextResponse } from "next/server"
import { isReadOnly } from "@/src/lib/runtimeFlags"
import { magicLinkFor } from "@/lib/magic"
import { sendEmail } from "@/lib/mailer"

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0

const DEFAULT_EMAIL = "you@example.com"
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i

type SendTestEmailResult = {
  ok: boolean
  messageId?: string
  previewUrl?: string
  to?: string
}

async function sendTestEmail(to: string): Promise<SendTestEmailResult> {
  const requestedEmail = to.trim()
  const targetEmail = (process.env.EMAIL_REDIRECT || requestedEmail || DEFAULT_EMAIL).toLowerCase()

  const magicLink = magicLinkFor(targetEmail)
  const { messageId, previewUrl } = await sendEmail({
    to: targetEmail,
    subject: "Your Bloodwall magic link",
    text: `Use this link to access Bloodwall: ${magicLink}`,
    html: `<p>Use this link to access Bloodwall:</p><p><a href="${magicLink}">${magicLink}</a></p>`,
  })

  return {
    ok: true,
    messageId,
    previewUrl: previewUrl ?? undefined,
    to: targetEmail,
  }
}

function readOnlyResponse() {
  return NextResponse.json(
    { error: "Read-only mode: writes are disabled on this deployment." },
    { status: 403 },
  )
}

function hasSession(req: NextRequest): boolean {
  const sessionEmail = req.cookies.get("userEmail")?.value?.trim()
  return typeof sessionEmail === "string" && sessionEmail.length > 0
}

function ensureAuthorized(req: NextRequest): NextResponse | null {
  if (hasSession(req)) {
    return null
  }

  const requiredKey = process.env.API_DEV_KEY ?? ""
  const providedKey = req.headers.get("x-bw-dev-key") ?? ""

  if (requiredKey && providedKey === requiredKey) {
    return null
  }

  return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
}

function missingEmailResponse() {
  return NextResponse.json({ ok: false, error: 'Missing "to"' }, { status: 400 })
}

function invalidEmailResponse() {
  return NextResponse.json({ ok: false, error: 'Invalid "to"' }, { status: 400 })
}

export async function GET(req: Request) {
  if (process.env.DEV_TEST_EMAIL !== '1') {
    return NextResponse.json(
      { ok: true, disabled: true, reason: 'DEV_TEST_EMAIL=0' },
      { status: 200 }
    );
  }

  const nextReq = req as unknown as NextRequest

  const guard = ensureAuthorized(nextReq)
  if (guard) {
    return guard
  }

  if (isReadOnly(nextReq)) {
    return readOnlyResponse()
  }

  const url = new URL(nextReq.url)
  const to = (url.searchParams.get("to") ?? "").trim()

  if (!to) {
    return missingEmailResponse()
  }

  if (!EMAIL_REGEX.test(to)) {
    return invalidEmailResponse()
  }

  try {
    const payload = await sendTestEmail(to)
    return NextResponse.json(payload, { status: 200 })
  } catch (error) {
    console.error("[GET /api/dev/test-email]", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to send" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  if (process.env.DEV_TEST_EMAIL !== "1") {
    return NextResponse.json(
      { ok: true, disabled: true, reason: "DEV_TEST_EMAIL=0" },
      { status: 200 },
    )
  }

  const guard = ensureAuthorized(req)
  if (guard) {
    return guard
  }

  if (isReadOnly(req)) {
    return readOnlyResponse()
  }

  const body = (await req.json().catch(() => ({}))) as { to?: string }
  const to = (body?.to ?? "").trim()

  if (!to) {
    return missingEmailResponse()
  }

  if (!EMAIL_REGEX.test(to)) {
    return invalidEmailResponse()
  }

  try {
    const payload = await sendTestEmail(to)
    return NextResponse.json(payload, { status: 200 })
  } catch (error) {
    console.error("[POST /api/dev/test-email]", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to send" },
      { status: 500 },
    )
  }
}

