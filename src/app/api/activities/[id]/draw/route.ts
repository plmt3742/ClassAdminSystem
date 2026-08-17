import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可抽签" }, { status: 403 })
  }
  const { id } = await params
  const activity = await prisma.activity.findUnique({ where: { id } })
  if (!activity) return NextResponse.json({ error: "活动不存在" }, { status: 404 })
  const { count } = await req.json().catch(() => ({ count: 1 }))
  const drawCount = Math.max(1, Math.min(Number(count) || 1, 45))

  // Already drawn in THIS activity (all rounds) — never re-draw them
  const alreadyInThis = await prisma.activityDraw.findMany({
    where: { activityId: id },
    select: { userId: true },
    distinct: ["userId"],
  })
  const alreadySet = new Set(alreadyInThis.map(d => d.userId))

  // Global round
  const maxRound = await prisma.activityDraw.aggregate({ _max: { round: true } })
  let currentRound = maxRound._max.round || 1

  // Drawn in current global round (across ALL activities)
  const drawnGlobal = await prisma.activityDraw.findMany({
    where: { round: currentRound },
    select: { userId: true },
    distinct: ["userId"],
  })
  const globalSet = new Set(drawnGlobal.map(d => d.userId))

  // Candidates: not drawn in this round globally, AND not already in this activity
  let pool = await prisma.user.findMany({
    where: { AND: [{ NOT: { id: { in: [...globalSet] } } }, { NOT: { id: { in: [...alreadySet] } } }] },
    select: { id: true, name: true, studentId: true },
  })

  const draws: Awaited<ReturnType<typeof prisma.activityDraw.create>>[] = []
  let remaining = drawCount
  let roundAdvanced = false

  while (remaining > 0 && pool.length > 0) {
    const take = Math.min(remaining, pool.length)
    const shuffled = pool.sort(() => Math.random() - 0.5)
    const batch = shuffled.slice(0, take)

    const created = await Promise.all(
      batch.map(s =>
        prisma.activityDraw.create({
          data: { activityId: id, userId: s.id, studentId: s.studentId, round: currentRound, source: "drawn" },
          include: { user: { select: { id: true, name: true, studentId: true } } },
        })
      )
    )
    draws.push(...created)
    remaining -= take
    for (const s of batch) { globalSet.add(s.id); alreadySet.add(s.id) }

    if (remaining === 0) break

    // Pool exhausted in this round — advance and rebuild pool
    currentRound += 1
    roundAdvanced = true

    // New pool: all students, minus already-in-this-activity, minus just-drawn (alreadySet covers both)
    pool = await prisma.user.findMany({
      where: { NOT: { id: { in: [...alreadySet] } } },
      select: { id: true, name: true, studentId: true },
    })
  }

  if (activity.status === "pending") await prisma.activity.update({ where: { id }, data: { status: "drawn" } })

  // Auto-resolve conflicting delegations
  const drawnIds = draws.map(d => d.userId)
  const conflicting = await prisma.activityDraw.findMany({
    where: { activityId: id, delegateTo: { in: drawnIds }, status: "delegated", delegateApproved: false },
    select: { id: true },
  })
  for (const cd of conflicting) {
    await prisma.activityDraw.update({ where: { id: cd.id }, data: { delegateTo: null, status: "drawn" } })
  }

  return NextResponse.json({ draws, currentRound, roundAdvanced, remainingInRound: pool.length })
}
