import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { COMMITTEE_MEMBERS, DEFAULT_YEAR } from "@/lib/committee"
import { guestCommitteeRanking } from "@/lib/guest-data"

// GET /api/zongce/committee/public-ranking?year=2025-2026
// 班委民主评议排行榜（全班公开）：每位班委的平均分与票数。
// 计分规则：仅统计普通同学（非班委）的投票，班委之间的互评不计入。
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  // 游客模式：返回演示民主评议榜
  if (session.user.role === "guest") {
    return NextResponse.json(guestCommitteeRanking())
  }

  const { searchParams } = new URL(req.url)
  const year = searchParams.get("year") || DEFAULT_YEAR

  const ratings = await prisma.committeeRating.findMany({ where: { year } })

  // 班委名单对应的用户（互评排除）
  const committeeUsers = await prisma.user.findMany({
    where: { name: { in: COMMITTEE_MEMBERS.map(m => m.name) } },
    select: { id: true, name: true },
  })
  const committeeIds = new Set(committeeUsers.map(u => u.id))

  // 最新分（每组 raterId+targetId 取 version 最大）
  const latestMap = new Map<string, { score: number }>()
  for (const r of ratings) {
    const k = `${r.raterId}|${r.targetId}`
    const cur = latestMap.get(k)
    if (!cur || r.version > (cur as { score: number; version: number }).version) latestMap.set(k, { score: r.score, version: r.version } as { score: number; version: number })
  }

  // 每位班委收集"普通同学"的投票（排除班委互评）
  const byTarget = new Map<string, number[]>()
  for (const [k, v] of latestMap) {
    const [raterId, targetId] = k.split("|")
    if (committeeIds.has(raterId)) continue
    if (!byTarget.has(targetId)) byTarget.set(targetId, [])
    byTarget.get(targetId)!.push(v.score)
  }

  const rows = COMMITTEE_MEMBERS.map(m => {
    const target = committeeUsers.find(u => u.name === m.name)
    const scores = target ? (byTarget.get(target.id) || []) : []
    const avg = scores.length > 0 ? scores.reduce((s, x) => s + x, 0) / scores.length : null
    return {
      name: m.name,
      role: m.role,
      count: scores.length,
      avg: avg != null ? Math.round(avg * 100) / 100 : null,
    }
  }).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1))

  return NextResponse.json({
    year,
    rows,
    totalMembers: COMMITTEE_MEMBERS.length,
  })
}
