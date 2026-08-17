import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SECTION_META, calcDScore } from "@/lib/zongce-utils"
import { checkManager } from "@/lib/permissions"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { id } = await params
  const tags: string[] = (session.user as any).tags ?? []
  const isAdmin = session.user.role === "admin"

  const section = await prisma.zongceSection.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, studentId: true } } },
  })

  if (!section) {
    return NextResponse.json({ error: "不存在" }, { status: 404 })
  }

  // Only admin or the responsible committee member can review
  if (!isAdmin) {
    const isCommittee = await checkManager(session)
    if (!isCommittee) {
      return NextResponse.json({ error: "无权审核" }, { status: 403 })
    }
    const reviewerTag = SECTION_META[section.section]?.reviewer
    if (!tags.includes(reviewerTag)) {
      return NextResponse.json({ error: "该板块不属于您的审核范围" }, { status: 403 })
    }
  }

  // S 板块附带课程成绩明细，供审核人逐项核对
  type CourseScoreWithCourse = Awaited<ReturnType<typeof prisma.courseScore.findMany>>
  let courseScores: CourseScoreWithCourse = []
  if (section.section === "S") {
    courseScores = await prisma.courseScore.findMany({
      where: { userId: section.userId },
      include: { course: true },
    })
  }

  // 同板块全部学生（按学号排序），供详情页翻页与学生面板使用
  const siblings = await prisma.zongceSection.findMany({
    where: { section: section.section },
    include: { user: { select: { id: true, name: true, studentId: true } } },
    orderBy: { user: { studentId: "asc" } },
  })

  return NextResponse.json({
    section,
    courseScores,
    siblings: siblings.map(s => ({
      sectionId: s.id,
      name: s.user.name,
      studentId: s.user.studentId,
      status: s.status,
    })),
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { id } = await params
  const tags: string[] = (session.user as any).tags ?? []
  const isAdmin = session.user.role === "admin"

  const section = await prisma.zongceSection.findUnique({ where: { id } })
  if (!section) {
    return NextResponse.json({ error: "不存在" }, { status: 404 })
  }

  // Auth check
  if (!isAdmin) {
    const isCommittee = await checkManager(session)
    if (!isCommittee) {
      return NextResponse.json({ error: "无权审核" }, { status: 403 })
    }
    const reviewerTag = SECTION_META[section.section]?.reviewer
    if (!tags.includes(reviewerTag)) {
      return NextResponse.json({ error: "该板块不属于您的审核范围" }, { status: 403 })
    }
  }

  const { approved, reviewNote, action, manualScores } = await req.json()

  // 撤销驳回: returned → submitted（重新进入待审核队列，分数保留）
  if (action === "reopen") {
    if (section.status !== "returned") {
      return NextResponse.json({ error: "该板块不是退回状态" }, { status: 400 })
    }
    await prisma.zongceSection.update({
      where: { id },
      data: { status: "submitted", reviewNote: null, submittedAt: new Date() },
    })
    return NextResponse.json({ ok: true })
  }

  // 撤销通过: approved → submitted（误点通过可撤回，重新进入待审核队列）
  if (action === "unapprove") {
    if (section.status !== "approved") {
      return NextResponse.json({ error: "该板块不是已通过状态" }, { status: 400 })
    }
    await prisma.zongceSection.update({
      where: { id },
      data: { status: "submitted", reviewedAt: null, submittedAt: new Date() },
    })
    return NextResponse.json({ ok: true })
  }

  if (section.status !== "submitted") {
    return NextResponse.json({ error: "该板块不是待审核状态" }, { status: 400 })
  }

  if (approved) {
    const updateData: any = {
      status: "approved",
      reviewNote: null,
      reviewedAt: new Date(),
    }

    // D 文体活动：审核员手动确认"其他"名次项目的加分（manualScores: { 项目下标: 分数 }）
    if (section.section === "D" && manualScores && typeof manualScores === "object") {
      try {
        const parsed = JSON.parse(section.data || "{}")
        const items = Array.isArray(parsed.items) ? parsed.items : []
        let changed = false
        for (const [idx, sc] of Object.entries(manualScores)) {
          const i = Number(idx)
          const s = Number(sc)
          if (!Number.isInteger(i) || i < 0 || i >= items.length) continue
          if (!Number.isFinite(s) || s < 0 || s > 5) continue
          const rounded = Math.round(s * 100) / 100
          if (items[i].score !== rounded) { items[i] = { ...items[i], score: rounded }; changed = true }
        }
        if (changed) {
          parsed.items = items
          updateData.data = JSON.stringify(parsed)
          updateData.score = calcDScore(items)
        }
      } catch (e: any) {
        console.error("[review D manualScores]", e?.message)
      }
    }

    await prisma.zongceSection.update({
      where: { id },
      data: updateData,
    })
  } else {
    if (!reviewNote) {
      return NextResponse.json({ error: "退回必须填写理由" }, { status: 400 })
    }
    await prisma.zongceSection.update({
      where: { id },
      data: {
        status: "returned",
        reviewNote,
        reviewedAt: new Date(),
      },
    })
  }

  return NextResponse.json({ ok: true })
}
