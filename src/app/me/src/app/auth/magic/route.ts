import { NextRequest, NextResponse } from "next/server"
import { verifyMagicToken } from "@/lib/magic"

const COOKIE_NAME = "userEmail"
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const emailParam = searchParams.get("e")
  const token = searchParams.get("t")
  const requestedTarget = searchParams.get("to") || "/me"

  if (!emailParam || !token) {
    return NextResponse.json({ ok: false, error: "Missing token or email" }, { status: 400 })
  }

  try {
    const payload = verifyMagicToken(token)
    const normalizedEmail = emailParam.toLowerCase().trim()

    if (payload.email !== normalizedEmail) {
      throw new Error("Email does not match token")
    }

    const target = payload.to || (requestedTarget.startsWith("/") ? requestedTarget : "/me")
    const redirectUrl = new URL(target, request.nextUrl.origin)

    const response = NextResponse.redirect(redirectUrl)
    response.cookies.set({
      name: COOKIE_NAME,
      value: normalizedEmail,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    })
    return response
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid token" },
      { status: 400 },
    )
  }
}

