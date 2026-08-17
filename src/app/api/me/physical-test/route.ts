import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PUT /api/me/physical-test — 学生自填体测是否过关
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  try {
    const { passed } = await req.json()
    if (typeof passed !== "boolean") {
      return NextResponse.json({ error: "参数无效" }, { status: 400 })
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: { physicalTest: passed },
    })
    return NextResponse.json({ ok: true, physicalTest: passed })
  } catch (e: unknown) {
    console.error("[physical-test]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "保存失败" }, { status: 500 })
  }
}
