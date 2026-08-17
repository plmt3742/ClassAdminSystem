import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { guestGlobalRound } from "@/lib/guest-data"

// Get current global round and remaining students
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  // 游客模式：返回演示轮次数据
  if (session.user.role === "guest") {
    return NextResponse.json(guestGlobalRound())
  }

  // Current global round = max round across all draws
  const maxRound = await prisma.activityDraw.aggregate({ _max: { round: true } })
  const currentRound = maxRound._max.round || 1

  // Students drawn in current round (across ALL activities)
  const drawnIds = await prisma.activityDraw.findMany({
    where: { round: currentRound },
    select: { userId: true },
    distinct: ["userId"],
  })
  const drawnSet = new Set(drawnIds.map(d => d.userId))

  // Remaining students
  const remaining = await prisma.user.findMany({
    where: { NOT: { id: { in: [...drawnSet] } } },
    select: { id: true, name: true, studentId: true },
    orderBy: { studentId: "asc" },
  })

  return NextResponse.json({ currentRound, drawnCount: drawnSet.size, totalStudents: 45, remaining })
}
