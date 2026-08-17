import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type DrawUpdate = { status: string; source?: string }

const LABEL_MAP: Record<string, DrawUpdate> = {
  "抽签":    { status: "drawn", source: "drawn" },
  "报名":    { status: "drawn", source: "volunteered" },
  "指定参与": { status: "drawn", source: "assigned" },
  "已完成":   { status: "completed" },
  "已取消":   { status: "cancelled" },
}

export async function PATCH(req: Request, { params }: { params: Promise<{ drawId: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 })
  }
  const { drawId } = await params
  const { label } = await req.json()

  const update = LABEL_MAP[label]
  if (!update) return NextResponse.json({ error: "无效状态" }, { status: 400 })

  const data: Record<string, string> = { status: update.status }
  if (update.source) data.source = update.source

  const draw = await prisma.activityDraw.update({
    where: { id: drawId },
    data,
  })

  return NextResponse.json({ ok: true })
}
