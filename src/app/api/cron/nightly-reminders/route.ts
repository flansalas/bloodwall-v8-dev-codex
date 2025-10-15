import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cronAuth";
import { sendEmail } from "@/lib/mailer";
import { magicLinkFor } from "@/lib/magic";
import { personalReminderHtml } from "@/templates/reminders";
import { getPendingForEmail } from "@/lib/pending";

export async function POST(req: NextRequest) {
  const guard = requireCronAuth(req);
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  const name = body.name || "Teammate";
  const envRedirect = process.env.EMAIL_REDIRECT?.trim();
  const to = envRedirect || body.to || "you@example.com";
  const items = Array.isArray(body.items)
    ? body.items
    : await getPendingForEmail(to);

  const href = magicLinkFor(to, "/me");
  const html = personalReminderHtml(name, items, href);

  const info = await sendEmail({
    to,
    subject: `[Bloodwall] Quick update before MAM`,
    html,
    text: "Please update your UDEs before MAM.",
  });

  const result: any = {
    ok: true,
    sent: 1,
    to,
    messageId: (info as any)?.messageId,
  };

  if ((info as any)?.previewUrl) result.previewUrl = (info as any).previewUrl;

  return NextResponse.json(result);
}
