import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { guestNotifications } from "@/lib/guest-data"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  // 游客模式：返回空通知
  if (session.user.role === "guest") {
    return NextResponse.json(guestNotifications())
  }

  const notifications = await prisma.delegationNotification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  const unreadCount = await prisma.delegationNotification.count({
    where: { userId: session.user.id, read: false },
  })

  return NextResponse.json({ notifications, unreadCount })
}

// Mark all as read
export async function PUT() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  await prisma.delegationNotification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  })

  return NextResponse.json({ ok: true })
}
