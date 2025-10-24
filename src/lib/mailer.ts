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
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL = "no-reply@bloodwall.local",
  FROM_NAME = "Bloodwall",
} = process.env

const smtpConfigured = Boolean(SMTP_HOST)

async function createTransporter(): Promise<Transporter> {
  if (cachedTransporter) {
    return cachedTransporter
  }

  if (smtpConfigured) {
    const parsedPort = Number.parseInt(SMTP_PORT ?? "587", 10)
    const port = Number.isNaN(parsedPort) ? 587 : parsedPort
    const secure =
      SMTP_SECURE === "true" || (SMTP_SECURE === undefined && port === 465)

    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure,
      auth:
        SMTP_USER && SMTP_PASS
          ? {
              user: SMTP_USER,
              pass: SMTP_PASS,
            }
          : undefined,
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
  const redirectAddress = process.env.EMAIL_REDIRECT?.trim()
  const recipient = redirectAddress && redirectAddress.length > 0 ? redirectAddress : to

  const info = await transporter.sendMail({
    from: {
      name: FROM_NAME,
      address: FROM_EMAIL,
    },
    to: recipient,
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
