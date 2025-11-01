import { NextRequest, NextResponse } from "next/server";

export function requireAdmin(req: NextRequest) {
  // Allow all in non-prod to avoid blocking local dev
  if (process.env.NODE_ENV !== "production") return null;

  const incoming = req.headers.get("x-admin-key") ?? "";
  const expected = process.env.ADMIN_KEY ?? "";
  const ok = expected.length > 0 && incoming === expected;

  if (!ok) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}
