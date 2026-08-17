import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { guestTimeline } from "@/lib/guest-data"

interface TimelineEvent {
  id: string; type: string; text: string; time: string
  activityId?: string; activityTitle?: string
  userId?: string; userName?: string; userStudentId?: string
  targetName?: string; round?: number
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  // 游客模式：返回演示时间线（不暴露真实学生姓名）
  if (session.user.role === "guest") {
    return NextResponse.json({ events: guestTimeline() })
  }

  const events: TimelineEvent[] = []

  // 1. Activity created
  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  for (const a of activities) {
    events.push({
      id: `act-${a.id}`, type: "activity_created",
      text: `发布了活动`, time: a.createdAt.toISOString(),
      activityId: a.id, activityTitle: a.title,
    })
  }

  // 2. Draws & Delegations
  const draws = await prisma.activityDraw.findMany({
    include: {
      user: { select: { id: true, name: true, studentId: true } },
      delegate: { select: { id: true, name: true, studentId: true } },
      activity: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  })

  // Dedup: one "活动完成" event per activity
  const completedActivityIds = new Set<string>()

  for (const d of draws) {
    if (d.status === "delegated" && d.delegateApproved) {
      events.push({
        id: `del-accept-${d.id}`, type: "delegation_accepted",
        text: `${d.delegate!.name} 接受了 ${d.user.name} 的委托`, time: d.createdAt.toISOString(),
        activityId: d.activityId, activityTitle: d.activity.title,
        userName: d.user.name, userStudentId: d.user.studentId,
        targetName: d.delegate!.name,
        round: d.round,
      })
    } else if (d.status === "delegated") {
      events.push({
        id: `del-req-${d.id}`, type: "delegation_requested",
        text: `${d.user.name} 委托 ${d.delegate?.name || "同学"}`, time: d.createdAt.toISOString(),
        activityId: d.activityId, activityTitle: d.activity.title,
        userName: d.user.name, userStudentId: d.user.studentId,
        targetName: d.delegate?.name,
        round: d.round,
      })
    } else if (d.status === "completed") {
      if (!completedActivityIds.has(d.activityId)) {
        completedActivityIds.add(d.activityId)
        events.push({
          id: `completed-${d.activityId}`, type: "activity_completed",
          text: `活动完成`, time: d.createdAt.toISOString(),
          activityId: d.activityId, activityTitle: d.activity.title,
        })
      }
    } else {
      const sourceText = (d as any).source === "volunteered" ? `${d.user.name} 自行报名`
        : (d as any).source === "assigned" ? `${d.user.name} 被指定参与`
        : `${d.user.name} 被抽中`
      events.push({
        id: `drawn-${d.id}`, type: "student_drawn",
        text: sourceText, time: d.createdAt.toISOString(),
        activityId: d.activityId, activityTitle: d.activity.title,
        userName: d.user.name, userStudentId: d.user.studentId,
        round: d.round,
      })
    }
  }

  // 3. Round completed detection
  const rounds = await prisma.activityDraw.groupBy({
    by: ["round"],
    _count: { userId: true },
  })
  for (const r of rounds) {
    // Need distinct count, not total
    const distinctUsers = await prisma.activityDraw.findMany({
      where: { round: r.round },
      select: { userId: true },
      distinct: ["userId"],
    })
    if (distinctUsers.length >= 45) {
      events.push({
        id: `round-${r.round}`, type: "round_completed",
        text: `第 ${r.round} 轮全部同学抽签完成`, time: new Date().toISOString(),
        round: r.round,
      })
    }
  }

  // Sort by time desc, limit
  events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  return NextResponse.json({ events: events.slice(0, 50) })
}
