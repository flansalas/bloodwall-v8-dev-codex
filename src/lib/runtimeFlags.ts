export function isReadOnly() {
  // Production read-only if the env flag is on OR we’re using bundled sqlite in prod
  const ro = process.env.READ_ONLY === '1';
  const usingBundledSqlite =
    process.env.NODE_ENV === 'production' &&
    (process.env.DATABASE_URL?.startsWith('file:') ?? false);
  return ro || usingBundledSqlite;
}
