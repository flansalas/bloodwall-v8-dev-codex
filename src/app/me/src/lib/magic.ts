import crypto from "crypto"

const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

type MagicTokenPayload = {
  email: string
  exp: number
  to?: string
}

function getSecret() {
  const secret = process.env.APP_SECRET
  if (!secret) {
    throw new Error("APP_SECRET is not set")
  }
  return secret
}

function encodePayload(payload: MagicTokenPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

function decodePayload(encoded: string): MagicTokenPayload {
  const json = Buffer.from(encoded, "base64url").toString("utf8")
  return JSON.parse(json) as MagicTokenPayload
}

function sign(encodedPayload: string) {
  const secret = getSecret()
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url")
  return signature
}

export function signMagicToken(email: string, options?: { to?: string; expiresInMs?: number }) {
  const payload: MagicTokenPayload = {
    email: email.toLowerCase().trim(),
    exp: Date.now() + (options?.expiresInMs ?? DEFAULT_EXPIRY_MS),
    to: options?.to,
  }

  const encoded = encodePayload(payload)
  const signature = sign(encoded)
  return `${encoded}.${signature}`
}

export function verifyMagicToken(token: string): MagicTokenPayload {
  const [encoded, signature] = token.split(".")
  if (!encoded || !signature) {
    throw new Error("Invalid token format")
  }

  const expectedSignature = sign(encoded)
  const actualBuffer = Buffer.from(signature, "utf8")
  const expectedBuffer = Buffer.from(expectedSignature, "utf8")
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error("Invalid token signature")
  }

  const payload = decodePayload(encoded)
  if (payload.exp < Date.now()) {
    throw new Error("Token expired")
  }

  return payload
}

export function magicLinkFor(email: string, to = "/me") {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const normalizedEmail = email.toLowerCase().trim()
  const token = signMagicToken(normalizedEmail, { to })
  const url = new URL("/auth/magic", appUrl)
  url.searchParams.set("e", normalizedEmail)
  url.searchParams.set("t", token)
  if (to) {
    url.searchParams.set("to", to)
  }
  return url.toString()
}

