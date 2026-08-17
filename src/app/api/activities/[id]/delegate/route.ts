import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Request delegation: drawn user asks another student to go instead
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id } = await params

  const { drawId, targetUserId } = await req.json()
  if (!drawId || !targetUserId) return NextResponse.json({ error: "参数不完整" }, { status: 400 })

  const draw = await prisma.activityDraw.findUnique({ where: { id: drawId } })
  if (!draw || draw.userId !== session.user.id) {
    return NextResponse.json({ error: "只能委托自己的抽签结果" }, { status: 403 })
  }
  if (draw.status === "delegated" && draw.delegateApproved) {
    return NextResponse.json({ error: "已委托成功" }, { status: 400 })
  }

  const updated = await prisma.activityDraw.update({
    where: { id: drawId },
    data: { delegateTo: targetUserId, status: "delegated", delegateApproved: false },
    include: {
      user: { select: { id: true, name: true, studentId: true } },
      delegate: { select: { id: true, name: true, studentId: true } },
    },
  })

  // Notify target
  const activity = await prisma.activity.findUnique({ where: { id }, select: { title: true } })
  await prisma.delegationNotification.create({
    data: {
      userId: targetUserId,
      drawId: drawId,
      activityId: id,
      fromName: session.user.name || "",
    },
  })

  return NextResponse.json({ draw: updated })
}

// Approve/reject incoming delegation request
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id } = await params

  const { drawId, approve } = await req.json()
  if (!drawId) return NextResponse.json({ error: "参数不完整" }, { status: 400 })

  const draw = await prisma.activityDraw.findUnique({ where: { id: drawId } })
  if (!draw || draw.delegateTo !== session.user.id) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 })
  }

  const updated = await prisma.activityDraw.update({
    where: { id: drawId },
    data: {
      delegateApproved: approve,
      ...(approve ? {} : { delegateTo: null, status: "drawn" }),
    },
    include: {
      user: { select: { id: true, name: true, studentId: true } },
      delegate: { select: { id: true, name: true, studentId: true } },
    },
  })
  return NextResponse.json({ draw: updated })
}
