import nodemailer, { type Transporter } from "nodemailer"

type SendEmailPayload = {
  to: string
  subject: string
  html?: string
  text?: string
}

let cachedTransporter: Transporter | null = null
let usingEthereal = false

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL = "no-reply@bloodwall.local",
  FROM_NAME = "Bloodwall",
} = process.env

const smtpConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)

async function createTransporter(): Promise<Transporter> {
  if (cachedTransporter) {
    return cachedTransporter
  }

  if (smtpConfigured) {
    const port = Number.parseInt(SMTP_PORT ?? "587", 10)
    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
    usingEthereal = false
    return cachedTransporter
  }

  const account = await nodemailer.createTestAccount()
  cachedTransporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  })
  usingEthereal = true
  return cachedTransporter
}

export async function sendEmail({ to, subject, html, text }: SendEmailPayload) {
  const transporter = await createTransporter()

  const info = await transporter.sendMail({
    from: {
      name: FROM_NAME,
      address: FROM_EMAIL,
    },
    to,
    subject,
    text,
    html,
  })

  const previewUrl = usingEthereal ? nodemailer.getTestMessageUrl(info) ?? undefined : undefined

  return {
    messageId: info.messageId,
    previewUrl,
  }
}

