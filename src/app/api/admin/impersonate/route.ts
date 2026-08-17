import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildSessionTokenForUser } from "@/lib/impersonate"

// POST /api/admin/impersonate { userId }     → 超级管理员切换为学生视角
// POST /api/admin/impersonate { back: true } → 从学生视角切回管理员
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.getAll().find(c => c.name.includes("session-token"))
  if (!sessionCookie) return NextResponse.json({ error: "会话异常" }, { status: 400 })

  const adminId = session.user.id
  const adminName = session.user.name

  let targetId: string
  let extra: Record<string, unknown> | undefined

  if (body.back) {
    // 切回：允许处于切换视角状态者执行（此时身份可能是学生），恢复为原管理员
    const imp = (session.user as { impersonator?: { id?: string; name?: string | null } | null }).impersonator
    if (!imp?.id) return NextResponse.json({ error: "当前不是切换视角状态" }, { status: 400 })
    targetId = imp.id
  } else {
    // 切换：仅超级管理员
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "仅超级管理员可切换视角" }, { status: 403 })
    }
    targetId = String(body.userId || "")
    if (!targetId || targetId === adminId) {
      return NextResponse.json({ error: "无效的目标用户" }, { status: 400 })
    }
    const target = await prisma.user.findUnique({ where: { id: targetId } })
    if (!target) return NextResponse.json({ error: "目标用户不存在" }, { status: 404 })
    extra = { impersonator: { id: adminId, name: adminName } }
  }

  const token = await buildSessionTokenForUser(targetId, sessionCookie.name, extra)
  if (!token) return NextResponse.json({ error: "生成会话失败" }, { status: 500 })

  console.log(`[impersonate] ${adminName ?? adminId} ${body.back ? "恢复为管理员" : `→ 切换视角 ${targetId}`}`)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(sessionCookie.name, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookie.name.startsWith("__Secure-"),
    maxAge: 30 * 24 * 60 * 60,
  })
  return res
}
