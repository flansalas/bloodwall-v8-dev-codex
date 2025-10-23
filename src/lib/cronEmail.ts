type DigestActionItem = {
  ownerName: string
  text: string
  dueDate: Date | null
}

const formatDueDate = (due: Date | null) => {
  if (!due || Number.isNaN(due.getTime())) {
    return 'No due date'
  }
  return due.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export function buildNightlyDigestEmail(items: DigestActionItem[]) {
  // Format both HTML and text variants so the route can reuse the output.
  const lines = items.map((item) => ({
    owner: item.ownerName.trim() || 'Unassigned',
    text: item.text.trim() || 'Action',
    due: formatDueDate(item.dueDate),
  }))

  const title = 'Bloodwall — Nightly Digest'

  const listHtml = lines.length
    ? `<ul style="padding-left:1.5rem;">
${lines
  .map(
    (line) =>
      `  <li style="margin:0.5rem 0;">${escapeHtml(line.owner)} — “${escapeHtml(line.text)}” due ${escapeHtml(line.due)}</li>`
  )
  .join('\n')}
</ul>`
    : '<p>No actions due in the next 24 hours 🎉</p>'

  const html = `<!doctype html>
<html>
  <body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:24px;background-color:#f8fafc;color:#0f172a;">
    <h1 style="margin-bottom:16px;font-size:20px;">${title}</h1>
    ${listHtml}
  </body>
</html>`

  const text = lines.length
    ? lines.map((line) => `• ${line.owner} — "${line.text}" due ${line.due}`).join('\n')
    : 'No actions due in the next 24 hours 🎉'

  return { html, text, count: lines.length }
}

export type { DigestActionItem }
