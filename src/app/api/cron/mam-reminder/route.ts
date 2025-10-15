function mamReminderHtml(companyName: string, ctaHref: string) {
  return `
    <html>
      <body>
        <h1>MAM Reminder for ${companyName}</h1>
        <p>Don't forget to check your MAM dashboard.</p>
        <p><a href="${ctaHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 14px;border:1px solid #111;border-radius:999px;text-decoration:none">Open Dashboard →</a></p>
      </body>
    </html>
  `;
}

function personalReminderHtml(name: string, items: any[], ctaHref: string) {
  return `
    <html>
      <body>
        <h1>Hello ${name}</h1>
        <p>Here are your items:</p>
        <ul>
          ${items.map(item => `<li>${item}</li>`).join('')}
        </ul>
        <p><a href="${ctaHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 14px;border:1px solid #111;border-radius:999px;text-decoration:none">Open your Me page →</a></p>
      </body>
    </html>
  `;
}
