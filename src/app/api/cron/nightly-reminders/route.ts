import { NextResponse } from 'next/server';
import { isReadOnly, withCronBypass } from '@/lib/runtimeFlags';
import { requireCronAuth } from '@/lib/cronAuth';
import { sendEmail } from '@/lib/mailer';
import { magicLinkFor } from '@/lib/magic';
import { personalReminderHtml } from '@/templates/reminders';
import { getPendingForEmail } from '@/lib/pending';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (isReadOnly(request)) {
      return NextResponse.json(
        { error: 'Read-only mode: writes are disabled on this deployment.' },
        { status: 403 }
      );
    }

    return await withCronBypass(request, async () => {
      const guard = requireCronAuth(request);
      if (guard) return guard;

      const body = await request.json().catch(() => ({}));
      const name = body.name || 'Teammate';
      const envRedirect = process.env.EMAIL_REDIRECT?.trim();
      const to = envRedirect || body.to || 'you@example.com';
      const items = Array.isArray(body.items)
        ? body.items
        : await getPendingForEmail(to);

      const href = magicLinkFor(to, '/me');
      const html = personalReminderHtml(name, items, href);

      const info = await sendEmail({
        to,
        subject: `[Bloodwall] Quick update before MAM`,
        html,
        text: 'Please update your UDEs before MAM.',
      });

      const result: any = {
        ok: true,
        sent: 1,
        to,
        messageId: (info as any)?.messageId,
      };

      if ((info as any)?.previewUrl) result.previewUrl = (info as any).previewUrl;

      return NextResponse.json(result);
    });
  } catch (e: any) {
    if (e?.message === '__CRON_FORBIDDEN__') {
      return NextResponse.json(
        { ok: false, error: 'Forbidden' },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Internal Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'Method Not Allowed' },
    { status: 405 }
  );
}
