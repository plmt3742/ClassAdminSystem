import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: Request, { params }: { params: Promise<{ drawId: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 })
  }
  const { drawId } = await params

  const draw = await prisma.activityDraw.findUnique({ where: { id: drawId } })
  if (!draw) return NextResponse.json({ error: "记录不存在" }, { status: 404 })

  await prisma.activityDraw.delete({ where: { id: drawId } })
  return NextResponse.json({ ok: true })
}
