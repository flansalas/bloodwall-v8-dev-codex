import { NextResponse } from 'next/server';
import { isReadOnly, withCronBypass } from '@/lib/runtimeFlags';
import { requireCronAuth } from '@/lib/cronAuth';
import { sendEmail } from '@/lib/mailer';
import { magicLinkFor } from '@/lib/magic';
import { personalReminderHtml } from '@/templates/reminders';
import { getPendingForEmail } from '@/lib/pending';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET ?? '';
  const headerSecret = request.headers.get('x-cron-secret') ?? '';
  const querySecret = new URL(request.url).searchParams.get('secret') ?? '';

  if (!cronSecret || (headerSecret !== cronSecret && querySecret !== cronSecret)) {
    return NextResponse.json(
      { ok: false, error: 'forbidden' },
      { status: 403 }
    );
  }

  if (process.env.READ_ONLY === '1') {
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        reason: 'READ_ONLY: dry-run on serverless sqlite',
      },
      { status: 200 }
    );
  }

  const authorizedRequest =
    headerSecret === cronSecret
      ? request
      : new Request(request, {
          headers: (() => {
            const headers = new Headers(request.headers);
            headers.set('x-cron-secret', cronSecret);
            return headers;
          })(),
        });

  try {
    if (isReadOnly(authorizedRequest)) {
      return NextResponse.json(
        { error: 'Read-only mode: writes are disabled on this deployment.' },
        { status: 403 }
      );
    }

    return await withCronBypass(authorizedRequest, async () => {
      const guard = requireCronAuth(authorizedRequest);
      if (guard) return guard;

      const body = await authorizedRequest.json().catch(() => ({}));
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
