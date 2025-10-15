export function mamReminderHtml(companyName: string, ctaHref: string) {
  return `
  <div style="font-family:ui-sans-serif,system-ui;line-height:1.6">
    <h2 style="margin:0 0 12px">MAM Reminder — ${companyName}</h2>
    <p>Weekly review is coming up. Take 30 seconds to make sure your cards are current.</p>
    <p><a href="${ctaHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 14px;border:1px solid #111;border-radius:999px;text-decoration:none">Open Dashboard →</a></p>
  </div>`;
}

export function personalReminderHtml(
  name: string,
  items: { title: string; due?: string }[],
  ctaHref: string,
) {
  const list = items
    .map(
      (i) =>
        `<li><b>${i.title}</b>${i.due ? ` — due ${i.due}` : ""}</li>`,
    )
    .join("");

  return `
  <div style="font-family:ui-sans-serif,system-ui;line-height:1.6">
    <h2 style="margin:0 0 12px">Hi ${name || "there"} 👋</h2>
    <p>MAM is coming up. Quick nudge to update your UDEs:</p>
    <ul>${list || "<li>Nothing pending — you’re clear ✅</li>"}</ul>
    <p><a href="${ctaHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 14px;border:1px solid #111;border-radius:999px;text-decoration:none">Open your Me page →</a></p>
  </div>`;
}
