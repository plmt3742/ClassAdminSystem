import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { compare, hash } from "bcryptjs"

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  try {
    const { currentPassword, newPassword } = await req.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "请填写当前密码和新密码" }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "新密码至少 6 位" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })
    if (!user?.password) {
      return NextResponse.json({ error: "账号异常" }, { status: 400 })
    }

    const isValid = await compare(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json({ error: "当前密码错误" }, { status: 400 })
    }

    const hashed = await hash(newPassword, 12)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashed },
    })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error("[password]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "修改失败" }, { status: 500 })
  }
}
