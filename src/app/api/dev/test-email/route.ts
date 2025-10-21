/**
 * DEV test email usage:
 * curl -s "https://<app>/api/dev/test-email?to=you@example.com&key=$DEV_TEST_KEY"
 * curl -s -X POST "https://<app>/api/dev/test-email" -H "content-type: application/json" -d "{\"to\":\"you@example.com\",\"key\":\"$DEV_TEST_KEY\"}"
 */
import { NextRequest, NextResponse } from "next/server"
import { isReadOnly } from "@/src/lib/runtimeFlags"
import { magicLinkFor } from "@/lib/magic"
import { sendEmail } from "@/lib/mailer"

const DEFAULT_EMAIL = "you@example.com"
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i

type SendTestEmailResult = {
  ok: true
  messageId?: string
  previewUrl?: string
  to: string
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

  if (process.env.NODE_ENV !== "production") {
    console.log("[dev/test-email] Sent", targetEmail, messageId ?? "")
  }

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

function featureDisabledResponse() {
  return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
}

function guardFailedResponse() {
  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
}

function missingEmailResponse() {
  return NextResponse.json({ ok: false, error: 'Missing "to" email' }, { status: 400 })
}

function invalidEmailResponse() {
  return NextResponse.json({ ok: false, error: "Invalid email address" }, { status: 400 })
}

function isDevTestEnabled() {
  return process.env.DEV_TEST_EMAIL === "1"
}

function getKeyFromRequest(req: NextRequest, searchParams: URLSearchParams, bodyKey?: unknown) {
  const headerKey = req.headers.get("x-dev-test-key")
  return (
    (typeof bodyKey === "string" ? bodyKey : null) ||
    searchParams.get("key") ||
    (headerKey ? headerKey.trim() : null)
  )
}

function getExpectedKey() {
  return process.env.DEV_TEST_KEY ?? ""
}

function guardAccess(req: NextRequest, searchParams: URLSearchParams, bodyKey?: unknown) {
  if (!isDevTestEnabled()) {
    return featureDisabledResponse()
  }

  const expectedKey = getExpectedKey()
  const providedKey = getKeyFromRequest(req, searchParams, bodyKey)

  if (!expectedKey || providedKey !== expectedKey) {
    return guardFailedResponse()
  }

  return null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const guardResponse = guardAccess(req, searchParams)
  if (guardResponse) {
    return guardResponse
  }

  if (isReadOnly(req)) {
    return readOnlyResponse()
  }

  const to = (searchParams.get("to") ?? process.env.TEST_EMAIL_TO ?? "").trim()
  if (!to) {
    return missingEmailResponse()
  }

  if (!EMAIL_REGEX.test(to)) {
    return invalidEmailResponse()
  }

  try {
    const result = await sendTestEmail(to)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[GET /api/dev/test-email]", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to send" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const body = await req.json().catch(() => ({} as { to?: string; key?: string }))

  const guardResponse = guardAccess(req, searchParams, body?.key)
  if (guardResponse) {
    return guardResponse
  }

  if (isReadOnly(req)) {
    return readOnlyResponse()
  }

  const to = (
    typeof body?.to === "string"
      ? body.to
      : searchParams.get("to") ?? process.env.TEST_EMAIL_TO ?? ""
  ).trim()
  if (!to) {
    return missingEmailResponse()
  }

  if (!EMAIL_REGEX.test(to)) {
    return invalidEmailResponse()
  }

  try {
    const result = await sendTestEmail(to)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[POST /api/dev/test-email]", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to send" },
      { status: 500 },
    )
  }
}

// Force dynamic rendering so this route is never statically optimized.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"
