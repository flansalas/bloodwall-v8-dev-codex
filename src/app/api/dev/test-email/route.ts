import { NextRequest, NextResponse } from "next/server"
import { isReadOnly } from "@/src/lib/runtimeFlags"
import { magicLinkFor } from "@/lib/magic"
import { sendEmail } from "@/lib/mailer"

export const dynamic = "force-dynamic"
const enabled = process.env.DEV_TEST_EMAIL === "1"
const disabled = () => new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } })

const DEFAULT_EMAIL = "you@example.com"

async function sendTestEmail(to: string): Promise<{ ok: boolean; messageId?: string; previewUrl?: string; to?: string }> {
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

export async function GET(req: NextRequest) {
  if (!enabled) return disabled()

  if (isReadOnly(req)) {
    return readOnlyResponse()
  }

  const url = new URL(req.url)
  const to = (url.searchParams.get("to") ?? "").trim()
  const key = url.searchParams.get("key") ?? ""
  const required = process.env.DEV_TEST_KEY ?? ""

  if (required && key !== required) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }

  if (!to) {
    return NextResponse.json({ ok: false, error: 'Missing "to"' }, { status: 400 })
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
  if (!enabled) return disabled()

  if (isReadOnly(req)) {
    return readOnlyResponse()
  }

  const body = (await req.json().catch(() => ({}))) as { to?: string; key?: string }
  const to = (body?.to ?? "").trim()
  const key = body?.key ?? ""
  const required = process.env.DEV_TEST_KEY ?? ""

  if (required && key !== required) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }

  if (!to) {
    return NextResponse.json({ ok: false, error: 'Missing "to"' }, { status: 400 })
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

export const runtime = "nodejs"
