import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isAuthorized(req: Request) {
  const expected = process.env.ADMIN_KEY || '';
  const got = req.headers.get('x-admin-key') || '';
  return expected.length > 0 && got === expected;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
  });
}
