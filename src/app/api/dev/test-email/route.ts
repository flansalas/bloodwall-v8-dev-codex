import { NextRequest, NextResponse } from "next/server"
import { isReadOnly } from "@/src/lib/runtimeFlags"
import { magicLinkFor } from "@/lib/magic"
import { sendEmail } from "@/lib/mailer"

const DEFAULT_EMAIL = "you@example.com"

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
  if (isReadOnly(req)) {
    return readOnlyResponse()
  }

  const { searchParams } = new URL(req.url)
  const to = (searchParams.get("to") ?? process.env.TEST_EMAIL_TO ?? "").trim()
  if (!to) {
    return NextResponse.json({ ok: false, error: 'Missing "to" email' }, { status: 400 })
  }

  try {
    const result = await sendTestEmail(to)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[GET /api/dev/test-email]", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to send" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  if (isReadOnly(req)) {
    return readOnlyResponse()
  }

  const body = await req.json().catch(() => ({} as { to?: string }))
  const to = (typeof body?.to === "string" ? body.to : process.env.TEST_EMAIL_TO ?? "").trim()
  if (!to) {
    return NextResponse.json({ ok: false, error: 'Missing "to" email' }, { status: 400 })
  }

  try {
    const result = await sendTestEmail(to)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[POST /api/dev/test-email]", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to send" },
      { status: 500 },
    )
  }
}

// Force dynamic rendering so this route is never statically optimized.
export const dynamic = "force-dynamic"
