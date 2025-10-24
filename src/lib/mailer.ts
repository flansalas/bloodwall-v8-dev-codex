import nodemailer, { type Transporter } from "nodemailer"

type SendEmailPayload = {
  to: string
  subject: string
  html?: string
  text?: string
}

let cachedTransporter: Transporter | null = null
let usingEthereal = false
let transporterVerified = false
let transporterInfo: { host: string; port: number; secure: boolean } | null = null

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
    if (!SMTP_HOST) {
      throw new Error("SMTP_HOST is required when using SMTP transport")
    }
    if (!SMTP_USER) {
      throw new Error("SMTP_USER is required when using SMTP transport")
    }
    if (!SMTP_PASS) {
      throw new Error("SMTP_PASS is required when using SMTP transport")
    }

    const parsedPort = Number.parseInt(SMTP_PORT ?? "587", 10)
    const port = Number.isNaN(parsedPort) ? 587 : parsedPort
    const secure =
      SMTP_SECURE === "true" || (SMTP_SECURE === undefined && port === 465)

    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
    usingEthereal = false
    transporterInfo = { host: SMTP_HOST, port, secure }
    transporterVerified = false
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
  transporterInfo = {
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
  }
  transporterVerified = false
  return cachedTransporter
}

export async function sendEmail({ to, subject, html, text }: SendEmailPayload) {
  const transporter = await createTransporter()

  if (!transporterVerified) {
    try {
      await transporter.verify()
      const info = transporterInfo ?? { host: "unknown", port: 0, secure: false }
      console.info(
        `[mailer] transporter verified host=${info.host} port=${info.port} secure=${info.secure}`
      )
    } catch (error) {
      console.error("[mailer] transporter verification failed", error)
      throw error
    }
    transporterVerified = true
  }

  const redirectAddress = process.env.EMAIL_REDIRECT?.trim()
  const finalTo: string | string[] =
    redirectAddress && redirectAddress.length > 0 ? redirectAddress : to

  const recipientList = Array.isArray(finalTo) ? finalTo : [finalTo]
  const toList = recipientList.join(", ")

  const smtpUser = process.env.SMTP_USER?.trim()
  const displayFrom =
    process.env.MAIL_FROM?.trim() || smtpUser || FROM_EMAIL

  const envelopeFrom = usingEthereal ? displayFrom : smtpUser

  if (!envelopeFrom) {
    throw new Error("Unable to determine envelope sender address")
  }

  const info = await transporter.sendMail({
    from: `${FROM_NAME} <${displayFrom}>`,
    to: toList,
    subject,
    text,
    html,
    envelope: {
      from: envelopeFrom,
      to: recipientList,
    },
    sender: envelopeFrom,
    replyTo: displayFrom,
  })

  const previewUrl = usingEthereal ? nodemailer.getTestMessageUrl(info) ?? undefined : undefined

  return {
    messageId: info.messageId,
    previewUrl,
  }
}
