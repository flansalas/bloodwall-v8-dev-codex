import { NextRequest, NextResponse } from "next/server"
import { isReadOnly } from "@/src/lib/runtimeFlags"
import { magicLinkFor } from "@/lib/magic"
import { sendEmail } from "@/lib/mailer"

const DEFAULT_EMAIL = "you@example.com"

async function sendTestEmail(to: string): Promise<Response> {
  const requestedEmail = typeof to === "string" ? to.trim() : ""
  const targetEmail = (process.env.EMAIL_REDIRECT || requestedEmail || DEFAULT_EMAIL).toLowerCase()
  try {
    const magicLink = magicLinkFor(targetEmail)
    const { messageId, previewUrl } = await sendEmail({
      to: targetEmail,
      subject: "Your Bloodwall magic link",
      text: `Use this link to access Bloodwall: ${magicLink}`,
      html: `<p>Use this link to access Bloodwall:</p><p><a href="${magicLink}">${magicLink}</a></p>`,
    })

    return NextResponse.json({
      ok: true,
      messageId,
      previewUrl: previewUrl ?? undefined,
      to: targetEmail,
    })
  } catch (error) {
    console.error("[POST /api/dev/test-email]", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  if (isReadOnly(req)) {
    return NextResponse.json(
      { error: "Read-only mode: writes are disabled on this deployment." },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => ({} as { to?: string }))
  const { to } = body
  return sendTestEmail(typeof to === "string" ? to : "")
}

export async function GET(req: NextRequest) {
  if (isReadOnly(req)) {
    return NextResponse.json(
      { error: "Read-only mode: writes are disabled on this deployment." },
      { status: 403 }
    )
  }

  const url = new URL(req.url)
  const address = url.searchParams.get("to") ?? ""
  return sendTestEmail(address)
}

export const dynamic = "force-dynamic"
