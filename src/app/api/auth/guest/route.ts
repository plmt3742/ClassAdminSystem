import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { buildGuestToken } from "@/lib/guest"

// POST /api/auth/guest → 进入游客模式（无需账号，数据全部为演示 mock）
export async function POST() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.getAll().find(c => c.name.includes("session-token"))

  const token = await buildGuestToken(sessionCookie?.name ?? "authjs.session-token")
  if (!token) return NextResponse.json({ error: "游客会话生成失败" }, { status: 500 })

  console.log("[guest] 游客模式会话已签发")

  const res = NextResponse.json({ ok: true })
  res.cookies.set(sessionCookie?.name ?? "authjs.session-token", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: (sessionCookie?.name ?? "").startsWith("__Secure-"),
    maxAge: 30 * 24 * 60 * 60,
  })
  return res
}
