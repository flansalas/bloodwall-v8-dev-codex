export function isCronAuthorized(req: Request): boolean {
  const ua = req.headers.get('user-agent') || '';
  const headerSecret =
    req.headers.get('x-cron-secret') ||
    (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');

  const envSecret = process.env.CRON_SECRET;

  // If a secret is configured, accept either a matching header OR (for now) Vercel cron UA.
  if (envSecret) {
    return headerSecret === envSecret || ua.toLowerCase().includes('vercel-cron');
  }
  // Fallback: allow only Vercel cron user-agent in prod, everything in non-prod.
  if (process.env.NODE_ENV === 'production') {
    return ua.toLowerCase().includes('vercel-cron');
  }
  return true;
}
