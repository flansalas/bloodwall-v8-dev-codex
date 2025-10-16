// src/lib/runtimeFlags.ts

/**
 * Accept a secret from either header `x-cron-secret` or query param `?secret=...`
 */
export function matchesCronSecret(req: Request): boolean {
  try {
    const header = req.headers.get('x-cron-secret') ?? '';
    const qp = new URL(req.url).searchParams.get('secret') ?? '';
    const secret = process.env.CRON_SECRET ?? '';
    return !!secret && (header === secret || qp === secret);
  } catch {
    return false;
  }
}

/**
 * Global per-invocation bypass flag for cron. Allows deeper code that calls
 * isReadOnly() without a Request to still be bypassed during an authorized cron run.
 */
function cronBypassActive(): boolean {
  return process.env.READ_ONLY_BYPASS === '1';
}

/**
 * Read-only switch:
 * - In production or when READ_ONLY='true', we are read-only
 * - BUT if cron bypass is active OR the provided request carries a valid secret, we are NOT read-only.
 * The `req` parameter is optional to preserve compatibility with existing calls isReadOnly().
 */
export function isReadOnly(req?: Request): boolean {
  if (cronBypassActive()) return false;

  const ro =
    process.env.READ_ONLY === 'true' ||
    process.env.VERCEL_ENV === 'production';

  if (req && matchesCronSecret(req)) return false;
  return ro;
}

/**
 * Run a function with a temporary read-only bypass when the secret matches.
 * Otherwise throw a sentinel error; routes will map this to a 403 response.
 */
export async function withCronBypass<T>(
  req: Request,
  fn: () => Promise<T>
): Promise<T> {
  if (!matchesCronSecret(req)) {
    throw new Error('__CRON_FORBIDDEN__');
  }

  const prev = process.env.READ_ONLY_BYPASS;
  process.env.READ_ONLY_BYPASS = '1';
  try {
    return await fn();
  } finally {
    if (prev === undefined) {
      delete (process.env as any).READ_ONLY_BYPASS;
    } else {
      process.env.READ_ONLY_BYPASS = prev;
    }
  }
}
