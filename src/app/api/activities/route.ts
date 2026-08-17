import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { guestActivities } from "@/lib/guest-data"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  // 游客模式：返回演示活动（不暴露真实活动内容/名单）
  if (session.user.role === "guest") {
    return NextResponse.json({ activities: guestActivities(), currentRound: 2 })
  }

  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      volunteers: true,
      draws: { include: { user: { select: { id: true, name: true, studentId: true } }, delegate: { select: { id: true, name: true, studentId: true } } } },
    },
  })

  // Current global round
  const maxRound = await prisma.activityDraw.aggregate({ _max: { round: true } })
  const currentRound = maxRound._max.round || 1

  return NextResponse.json({ activities, currentRound })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可创建活动" }, { status: 403 })
  }
  const { title, description, eventTime, location, link } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "请输入活动标题" }, { status: 400 })

  const activity = await prisma.activity.create({
    data: {
      title: title.trim(),
      description: description?.trim() || "",
      eventTime: eventTime?.trim() || null,
      location: location?.trim() || null,
      link: link?.trim() || null,
      createdBy: session.user.id,
    },
  })
  return NextResponse.json({ activity })
}
