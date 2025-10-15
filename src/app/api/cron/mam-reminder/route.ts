import { isReadOnly } from "@/lib/runtimeFlags";
import { NextResponse } from "next/server";

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
  `;
}

export async function POST(request: Request) {
  const expectedSecret = process.env.CRON_SECRET?.trim();
  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  const querySecret = new URL(request.url).searchParams.get("secret")?.trim();
  const hasValidSecret =
    expectedSecret !== undefined &&
    (headerSecret === expectedSecret || querySecret === expectedSecret);

  if (isReadOnly() && !hasValidSecret) {
    return NextResponse.json(
      { error: "Read-only mode: writes are disabled on this deployment." },
      { status: 403 }
    );
  }
  try {
    const body = await request.json().catch(() => ({} as any));
    const companyName =
      typeof body?.companyName === "string" && body.companyName.trim()
        ? body.companyName
        : "Bloodwall";

    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const ctaHref = `${base}/`;

    const html = mamReminderHtml(companyName, ctaHref);

    // during testing everything goes to EMAIL_REDIRECT
    const to = process.env.EMAIL_REDIRECT || "flansalas@yahoo.com";
    const fromEmail = process.env.FROM_EMAIL || "no-reply@bloodwall.local";
    const fromName = process.env.FROM_NAME || "Bloodwall";

    const { sendMail } = await import("@/lib/mailer");

    const result = await sendMail({
      to,
      subject: `[Bloodwall] MAM Reminder — ${companyName}`,
      html,
      text: `Weekly review is coming up. Open your dashboard: ${ctaHref}`,
      fromEmail,
      fromName,
    });

    return NextResponse.json({ ok: true, sentTo: 1, to, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
