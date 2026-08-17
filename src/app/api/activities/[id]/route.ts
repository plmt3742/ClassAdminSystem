import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { guestActivities } from "@/lib/guest-data"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id } = await params

  // 游客模式：返回演示活动详情（不暴露真实内容/名单）
  if (session.user.role === "guest") {
    const act = guestActivities().find(a => a.id === id)
    if (!act) return NextResponse.json({ error: "活动不存在" }, { status: 404 })
    return NextResponse.json({ activity: act })
  }

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      volunteers: { include: { user: { select: { id: true, name: true, studentId: true } } } },
      draws: {
        include: {
          user: { select: { id: true, name: true, studentId: true } },
          delegate: { select: { id: true, name: true, studentId: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })
  if (!activity) return NextResponse.json({ error: "活动不存在" }, { status: 404 })
  return NextResponse.json({ activity })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可编辑" }, { status: 403 })
  }
  const { id } = await params
  const { title, description, eventTime, location, link } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "标题不能为空" }, { status: 400 })

  const activity = await prisma.activity.update({
    where: { id },
    data: {
      title: title.trim(),
      description: description?.trim() || "",
      eventTime: eventTime?.trim() || null,
      location: location?.trim() || null,
      link: link?.trim() || null,
    },
  })
  return NextResponse.json({ activity })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可删除" }, { status: 403 })
  }
  const { id } = await params
  await prisma.activity.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
