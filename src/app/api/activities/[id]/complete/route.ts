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

  // Mark drawn draws as completed
  await prisma.activityDraw.updateMany({
    where: { activityId: id, status: "drawn" },
    data: { status: "completed" },
  })
  // Mark delegated+approved draws as completed
  await prisma.activityDraw.updateMany({
    where: { activityId: id, status: "delegated", delegateApproved: true },
    data: { status: "completed" },
  })

  // Update participation counts for completed users
  const completedDraws = await prisma.activityDraw.findMany({
    where: { activityId: id, status: "completed" },
    select: { userId: true, delegateTo: true, delegateApproved: true },
  })
  for (const d of completedDraws) {
    const effectiveUser = d.delegateApproved && d.delegateTo ? d.delegateTo : d.userId
    await prisma.activityParticipation.upsert({
      where: { userId: effectiveUser },
      update: { completedCount: { increment: 1 } },
      create: { userId: effectiveUser, completedCount: 1 },
    })
  }

  await prisma.activity.update({ where: { id }, data: { status: "completed" } })
  return NextResponse.json({ ok: true })
}
