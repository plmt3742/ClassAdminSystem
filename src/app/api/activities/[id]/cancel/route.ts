import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 })
  }
  const { id } = await params

  // Mark all non-completed draws as cancelled
  await prisma.activityDraw.updateMany({
    where: { activityId: id, status: { in: ["drawn", "delegated"] } },
    data: { status: "cancelled" },
  })
  await prisma.activity.update({ where: { id }, data: { status: "cancelled" } })
  return NextResponse.json({ ok: true })
}
