import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Admin manually assigns specific students to an activity
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可指定" }, { status: 403 })
  }
  const { id } = await params

  const { userIds, source } = await req.json()
  const drawSource = source === "volunteered" ? "volunteered" : "assigned"
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "请选择至少一名学生" }, { status: 400 })
  }

  const activity = await prisma.activity.findUnique({ where: { id } })
  if (!activity) return NextResponse.json({ error: "活动不存在" }, { status: 404 })

  // Global round
  const maxRound = await prisma.activityDraw.aggregate({ _max: { round: true } })
  const currentRound = maxRound._max.round || 1

  // Create draws for each selected student
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, studentId: true },
  })

  const draws = await Promise.all(
    users.map(u =>
      prisma.activityDraw.create({
        data: { activityId: id, userId: u.id, studentId: u.studentId, round: currentRound, status: "drawn", source: drawSource },
        include: { user: { select: { id: true, name: true, studentId: true } } },
      })
    )
  )

  if (activity.status === "pending") {
    await prisma.activity.update({ where: { id }, data: { status: "drawn" } })
  }

  // If any assigned user was targeted by a pending delegation, reset that delegation:
  // the delegatee is now independently participating, so the delegation fails.
  // The original drawn user gets their draw back as "drawn" so they can try again.
  const conflictingDelegations = await prisma.activityDraw.findMany({
    where: { activityId: id, delegateTo: { in: userIds }, status: "delegated", delegateApproved: false },
    select: { id: true, userId: true },
  })

  for (const cd of conflictingDelegations) {
    await prisma.activityDraw.update({
      where: { id: cd.id },
      data: { delegateTo: null, status: "drawn" },
    })
  }

  return NextResponse.json({ draws, count: draws.length, failedDelegations: conflictingDelegations.length })
}
