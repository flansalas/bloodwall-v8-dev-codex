import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isAuthorized(req: Request) {
  const key = process.env.ADMIN_KEY;
  const header = req.headers.get('x-admin-key') ?? '';
  return Boolean(key) && header === key;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    flags: {
      DEV_TEST_EMAIL: process.env.DEV_TEST_EMAIL ?? 'undefined',
    },
    timestamp: new Date().toISOString(),
  });
}
