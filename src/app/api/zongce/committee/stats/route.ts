import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { COMMITTEE_MEMBERS, DEFAULT_YEAR } from "@/lib/committee"

// GET /api/zongce/committee/stats?year=2025-2026
// 班委评议统计面板：仅 班长 或 管理员 可见
// 返回：
//   rows      — 排名总览（按最后一次计分聚合：avg/count/min/max）
//   detail    — 打分明细（每个打分人给每个班委的最新分）
//   history   — 修改记录（每个打分人每次提交的完整分数 + 时间 + 版本）
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const isAdmin = session.user.role === "admin"
  const tags: string[] = (session.user.tags ?? []) as string[]
  if (!isAdmin && !tags.includes("班长")) {
    return NextResponse.json({ error: "仅班长或管理员可查看统计" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = searchParams.get("year") || DEFAULT_YEAR

  const ratings = await prisma.committeeRating.findMany({ where: { year } })
  const users = await prisma.user.findMany({
    where: { name: { in: COMMITTEE_MEMBERS.map(m => m.name) } },
    select: { id: true, name: true },
  })
  const raterIds = [...new Set(ratings.map(r => r.raterId))]
  const raters = raterIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: raterIds } }, select: { id: true, name: true, studentId: true } })
    : []

  // ===== 0) 未填写名单：全班同学（按学号排序）减去已参与评分的人 =====
  const allStudents = await prisma.user.findMany({
    orderBy: { studentId: "asc" },
    select: { id: true, name: true, studentId: true },
  })
  const ratedSet = new Set(raterIds)
  const missing = allStudents
    .filter(u => !ratedSet.has(u.id))
    .map(u => ({ id: u.id, name: u.name, studentId: u.studentId }))

  const nameById = new Map(users.map(u => [u.id, u.name]))
  const raterNameById = new Map(raters.map(u => [u.id, u.name]))
  const raterSidById = new Map(raters.map(u => [u.id, u.studentId]))

  // ===== 1) 最新分（每组 raterId+targetId 取 version 最大） =====
  const latestMap = new Map<string, { score: number; version: number }>() // key raterId|targetId
  for (const r of ratings) {
    const k = `${r.raterId}|${r.targetId}`
    const cur = latestMap.get(k)
    if (!cur || r.version > cur.version) latestMap.set(k, { score: r.score, version: r.version })
  }

  // ===== 2) 排名总览：按被评班委聚合（末次计分） =====
  const byTarget = new Map<string, number[]>()
  for (const [k, v] of latestMap) {
    const targetId = k.split("|")[1]
    if (!byTarget.has(targetId)) byTarget.set(targetId, [])
    byTarget.get(targetId)!.push(v.score)
  }

  const rows = COMMITTEE_MEMBERS.map(m => {
    const target = users.find(u => u.name === m.name)
    const scores = target ? (byTarget.get(target.id) || []) : []
    const avg = scores.length > 0 ? scores.reduce((s, x) => s + x, 0) / scores.length : null
    return {
      name: m.name,
      role: m.role,
      count: scores.length,
      avg: avg != null ? Math.round(avg * 100) / 100 : null,
      min: scores.length > 0 ? Math.min(...scores) : null,
      max: scores.length > 0 ? Math.max(...scores) : null,
    }
  }).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1))

  // ===== 3) 打分明细：每人给每个班委的最新分 =====
  const detail = raters.map(r => {
    const perTarget: Record<string, number> = {}
    for (const m of COMMITTEE_MEMBERS) {
      const target = users.find(u => u.name === m.name)
      if (target) {
        const v = latestMap.get(`${r.id}|${target.id}`)
        if (v) perTarget[m.name] = v.score
      }
    }
    return {
      raterId: r.id,
      name: raterNameById.get(r.id) || r.name,
      studentId: raterSidById.get(r.id) || "",
      scores: perTarget,
      ratedCount: Object.keys(perTarget).length,
    }
  }).filter(d => d.ratedCount > 0)

  // ===== 4) 修改记录：按 (rater, 批次时间) 分组 =====
  // 同一次提交的 12 条记录 createdAt 完全一致（PUT 时统一写入）
  const historyMap = new Map<string, { raterId: string; at: Date; scores: { name: string; score: number }[]; version: number }>()
  for (const r of ratings) {
    const key = `${r.raterId}|${r.createdAt.getTime()}`
    if (!historyMap.has(key)) historyMap.set(key, { raterId: r.raterId, at: r.createdAt, scores: [], version: r.version })
    const name = nameById.get(r.targetId) || "未知"
    historyMap.get(key)!.scores.push({ name, score: r.score })
    historyMap.get(key)!.version = Math.max(historyMap.get(key)!.version, r.version)
  }
  const history = [...historyMap.values()]
    .map(h => ({
      name: raterNameById.get(h.raterId) || "未知",
      studentId: raterSidById.get(h.raterId) || "",
      at: h.at.toISOString(),
      version: h.version,
      scores: h.scores.sort((a, b) => COMMITTEE_MEMBERS.findIndex(m => m.name === a.name) - COMMITTEE_MEMBERS.findIndex(m => m.name === b.name)),
    }))
    .sort((a, b) => (a.at < b.at ? 1 : -1))

  const raterCount = raters.length

  return NextResponse.json({
    year,
    rows,
    detail,
    history,
    missing,
    raterCount,
    totalStudents: allStudents.length,
    totalMembers: COMMITTEE_MEMBERS.length,
  })
}
