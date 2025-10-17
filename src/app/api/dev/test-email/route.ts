import { NextResponse } from "next/server"
import { isReadOnly } from "@/src/lib/runtimeFlags"
import { magicLinkFor } from "@/lib/magic"
import { sendEmail } from "@/lib/mailer"

const DEFAULT_EMAIL = "you@example.com"

export async function POST(request: Request) {
  if (isReadOnly(request)) {
    return NextResponse.json(
      { error: "Read-only mode: writes are disabled on this deployment." },
      { status: 403 }
    )
  }
  try {
    const body = await request.json().catch(() => ({}))
    const requestedEmail = typeof body?.to === "string" ? body.to.trim() : ""
    const targetEmail = (process.env.EMAIL_REDIRECT || requestedEmail || DEFAULT_EMAIL).toLowerCase()

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
