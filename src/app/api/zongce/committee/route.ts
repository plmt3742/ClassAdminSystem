import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { COMMITTEE_MEMBERS, DEFAULT_YEAR, RATING_MIN, RATING_MAX } from "@/lib/committee"
import { guestName } from "@/lib/guest-data"

// 班委评议已锁定：不再接受新的评分/修改（最终结果已导出）
const RATING_LOCKED = true
const LOCK_MSG = "本次班委民主评议已结束，评分已锁定，不再接受提交或修改"

// GET /api/zongce/committee?year=2025-2026
// 返回班委名单（含 userId）+ 当前用户最新一次评分的各分（互不可见：只返回自己的）
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = searchParams.get("year") || DEFAULT_YEAR

  // 游客模式：返回演示班委名单（姓名脱敏）
  if (session.user.role === "guest") {
    const members = COMMITTEE_MEMBERS.map((m, i) => ({
      name: guestName(i),
      role: m.role,
      targetId: `guest-committee-${i + 1}`,
    }))
    return NextResponse.json({
      year,
      members,
      mine: {},
      submittedAt: null,
      submittedCount: 0,
      currentVersion: 0,
      locked: RATING_LOCKED,
    })
  }

  // 按姓名匹配班委的 userId
  const users = await prisma.user.findMany({
    where: { name: { in: COMMITTEE_MEMBERS.map(m => m.name) } },
    select: { id: true, name: true },
  })
  const idByName = new Map(users.map(u => [u.name, u.id]))

  const members = COMMITTEE_MEMBERS.map(m => ({
    name: m.name,
    role: m.role,
    targetId: idByName.get(m.name) || null,
  }))

  // 我的全部评分记录（按 target + version 倒序，取每个 target 最新一条）
  const mineAll = await prisma.committeeRating.findMany({
    where: { year, raterId: session.user.id },
    orderBy: [{ targetId: "asc" }, { version: "desc" }],
  })
  const latestByTarget = new Map<string, (typeof mineAll)[number]>()
  for (const r of mineAll) {
    if (!latestByTarget.has(r.targetId)) latestByTarget.set(r.targetId, r)
  }
  const latest = [...latestByTarget.values()]
  const currentVersion = latest.length > 0 ? Math.max(...latest.map(r => r.version)) : 0
  const submittedAt = latest.length > 0
    ? new Date(Math.max(...latest.map(r => r.updatedAt.getTime()))).toISOString()
    : null

  return NextResponse.json({
    year,
    members,
    mine: Object.fromEntries(latest.map(r => [r.targetId, r.score])),
    submittedAt,
    submittedCount: latest.length,
    currentVersion,
    locked: RATING_LOCKED,
  })
}

// PUT /api/zongce/committee?year=2025-2026
// 提交评分 { scores: { targetId: string, score: number }[] }
// 每次提交 = 新版本（version +1），保留全部历史；计分以最后一次为准
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  if (RATING_LOCKED) {
    return NextResponse.json({ error: LOCK_MSG }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = searchParams.get("year") || DEFAULT_YEAR

  try {
    const { scores } = await req.json()
    if (!Array.isArray(scores) || scores.length !== COMMITTEE_MEMBERS.length) {
      return NextResponse.json({ error: "需为全部班委打分" }, { status: 400 })
    }

    // 校验目标都是班委 + 分数 0-100 整数
    const validNames = new Set(COMMITTEE_MEMBERS.map(m => m.name))
    const targets = await prisma.user.findMany({
      where: { name: { in: [...validNames] } },
      select: { id: true, name: true },
    })
    const nameById = new Map(targets.map(u => [u.id, u.name]))

    for (const s of scores) {
      const targetId = s?.targetId
      const score = Number(s?.score)
      if (!targetId || !nameById.has(targetId) || !validNames.has(nameById.get(targetId)!)) {
        return NextResponse.json({ error: "无效的评分对象" }, { status: 400 })
      }
      if (!Number.isInteger(score) || score < RATING_MIN || score > RATING_MAX) {
        return NextResponse.json({ error: `评分须为 ${RATING_MIN}-${RATING_MAX} 的整数` }, { status: 400 })
      }
    }

    const raterId = session.user.id
    const now = new Date()

    // 各 target 的当前版本号
    const existing = await prisma.committeeRating.findMany({
      where: { year, raterId },
      select: { targetId: true, version: true },
    })
    const maxVersionByTarget = new Map<string, number>()
    for (const e of existing) {
      maxVersionByTarget.set(e.targetId, Math.max(maxVersionByTarget.get(e.targetId) || 0, e.version))
    }

    // 事务：插入一组新版本记录（同批 createdAt 一致，用于历史分组）
    await prisma.$transaction(
      scores.map(s => {
        const targetId = s.targetId as string
        const version = (maxVersionByTarget.get(targetId) || 0) + 1
        return prisma.committeeRating.create({
          data: { year, raterId, targetId, score: Number(s.score), version, createdAt: now, updatedAt: now },
        })
      })
    )

    const newVersion = Math.max(...scores.map(s => (maxVersionByTarget.get(s.targetId as string) || 0) + 1))
    return NextResponse.json({ ok: true, version: newVersion, submittedAt: now.toISOString() })
  } catch (e: any) {
    console.error("[committee PUT]", e?.message)
    return NextResponse.json({ error: "提交失败" }, { status: 500 })
  }
}
