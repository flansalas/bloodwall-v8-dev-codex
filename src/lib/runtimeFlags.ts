/** Accept a secret from either header 'x-cron-secret' or query param '?secret=' */
export function matchesCronSecret(req?: Request): boolean {
  try {
    const header = req?.headers?.get('x-cron-secret') ?? ''
    const qp = req ? new URL(req.url).searchParams.get('secret') ?? '' : ''
    const secret = process.env.CRON_SECRET ?? ''
    return !!secret && (header === secret || qp === secret)
  } catch {
    return false
  }
}

/** Global per-invocation bypass flag */
export function cronBypassActive(): boolean {
  return process.env.READ_ONLY_BYPASS === '1'
}

/** Read-only if and only if READ_ONLY === '1' and no bypass */
export function isReadOnly(req?: Request): boolean {
  const flag = process.env.READ_ONLY ?? ''
  const bypass = cronBypassActive() || matchesCronSecret(req)
  return flag === '1' && !bypass
}

export function isUnsafeMethod(m?: string) {
  return !!m && !['GET', 'HEAD', 'OPTIONS'].includes(m.toUpperCase())
}

export async function withCronBypass<T>(
  req: Request,
  fn: () => Promise<T>
): Promise<T> {
  if (!matchesCronSecret(req)) {
    throw new Error('__CRON_FORBIDDEN__')
  }

  const prev = process.env.READ_ONLY_BYPASS
  process.env.READ_ONLY_BYPASS = '1'
  try {
    return await fn()
  } finally {
    if (prev === undefined) {
      delete (process.env as any).READ_ONLY_BYPASS
    } else {
      process.env.READ_ONLY_BYPASS = prev
    }
  }
}
