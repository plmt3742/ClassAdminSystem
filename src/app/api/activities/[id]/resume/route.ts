import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 })
  }
  const { id } = await params

  const activity = await prisma.activity.findUnique({ where: { id } })
  if (!activity) return NextResponse.json({ error: "活动不存在" }, { status: 404 })
  if (!["completed", "cancelled"].includes(activity.status)) {
    return NextResponse.json({ error: "活动未完成，无需恢复" }, { status: 400 })
  }

  // Revert completed/cancelled draws back to "drawn"
  const updated = await prisma.activityDraw.updateMany({
    where: { activityId: id, status: { in: ["completed", "cancelled"] } },
    data: { status: "drawn" },
  })

  // Revert participation counts
  const revertedDraws = await prisma.activityDraw.findMany({
    where: { activityId: id, status: "drawn" },
    select: { userId: true, delegateTo: true, delegateApproved: true },
  })
  for (const d of revertedDraws) {
    const effectiveUser = d.delegateApproved && d.delegateTo ? d.delegateTo : d.userId
    await prisma.activityParticipation.update({
      where: { userId: effectiveUser },
      data: { completedCount: { decrement: 1 } },
    })
  }

  await prisma.activity.update({ where: { id }, data: { status: "drawn" } })
  return NextResponse.json({ ok: true, reverted: updated.count })
}
