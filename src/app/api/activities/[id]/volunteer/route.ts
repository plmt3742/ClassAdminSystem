import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Self-register as volunteer (creates a draw record with source=volunteered)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id } = await params

  const activity = await prisma.activity.findUnique({ where: { id } })
  if (!activity) return NextResponse.json({ error: "活动不存在" }, { status: 404 })

  // Check if already has a draw/volunteer record for this activity
  const existing = await prisma.activityDraw.findFirst({
    where: { activityId: id, userId: session.user.id },
  })
  if (existing) return NextResponse.json({ error: "已报名或已参与" }, { status: 400 })

  // Global round
  const maxRound = await prisma.activityDraw.aggregate({ _max: { round: true } })
  const round = maxRound._max.round || 1

  const draw = await prisma.activityDraw.create({
    data: {
      activityId: id,
      userId: session.user.id,
      studentId: session.user.studentId || "",
      round,
      status: "drawn",
      source: "volunteered",
    },
    include: { user: { select: { id: true, name: true, studentId: true } } },
  })

  return NextResponse.json({ ok: true })
}

// Admin: remove a volunteer's draw record
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 })
  }
  const { id } = await params
  const { drawId } = await req.json()

  await prisma.activityDraw.delete({ where: { id: drawId } })
  return NextResponse.json({ ok: true })
}
