import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GUEST_NAME } from "@/lib/guest"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  // 游客模式：返回游客演示资料
  if (session.user.role === "guest") {
    return NextResponse.json({
      user: {
        id: "guest",
        uid: "0000",
        studentId: "GUEST",
        name: GUEST_NAME,
        email: null,
        image: null,
        bio: "游客模式 · 演示账号",
        phone: null,
        tags: [],
        role: "guest",
        physicalTest: null,
        createdAt: new Date().toISOString(),
      },
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, uid: true, studentId: true, name: true, email: true, image: true, bio: true, phone: true, tags: true, role: true, physicalTest: true, createdAt: true },
  })

  return NextResponse.json({ user })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  try {
    const { name, bio, phone } = await req.json()
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(phone !== undefined && { phone }),
      },
      select: { id: true, uid: true, studentId: true, name: true, email: true, image: true, bio: true, phone: true, role: true },
    })
    return NextResponse.json({ ok: true, user: updated })
  } catch (e: unknown) {
    console.error("[me/update]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
}
