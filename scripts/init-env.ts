import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"

const ENV_PATH = path.resolve(process.cwd(), ".env")

async function fileExists(target: string) {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

function randomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex")
}

async function main() {
  if (await fileExists(ENV_PATH)) {
    console.log(`.env already exists at ${ENV_PATH}. Skipping generation.`)
    return
  }

  const redirectFallback = process.env.REDIRECT || "you@example.com"

  const contents = [
    `NEXT_PUBLIC_APP_URL="http://localhost:3000"`,
    `APP_SECRET="${randomHex()}"`,
    `CRON_SECRET="${randomHex()}"`,
    `SMTP_HOST=""`,
    `SMTP_PORT=587`,
    `SMTP_USER=""`,
    `SMTP_PASS=""`,
    `FROM_EMAIL="no-reply@bloodwall.local"`,
    `FROM_NAME="Bloodwall"`,
    `EMAIL_REDIRECT="${redirectFallback}"`,
    "",
  ].join("\n")

  await fs.writeFile(ENV_PATH, contents, { encoding: "utf8", flag: "wx" })

  console.log(`Generated .env at ${ENV_PATH}`)
  console.log(`EMAIL_REDIRECT set to "${redirectFallback}"`)
}

main().catch((error) => {
  console.error("Failed to initialize .env:", error)
  process.exitCode = 1
})

