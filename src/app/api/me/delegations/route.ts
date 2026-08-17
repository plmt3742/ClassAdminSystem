import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { guestDelegations } from "@/lib/guest-data"

// List pending delegation requests (incoming = someone asked me)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  // 游客模式：返回空委托记录
  if (session.user.role === "guest") {
    return NextResponse.json(guestDelegations())
  }

  const incoming = await prisma.activityDraw.findMany({
    where: { delegateTo: session.user.id, delegateApproved: false, status: "delegated" },
    include: {
      activity: { select: { id: true, title: true } },
      user: { select: { id: true, name: true, studentId: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const outgoing = await prisma.activityDraw.findMany({
    where: { userId: session.user.id, status: "delegated" },
    include: {
      activity: { select: { id: true, title: true } },
      delegate: { select: { id: true, name: true, studentId: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ incoming, outgoing })
}
