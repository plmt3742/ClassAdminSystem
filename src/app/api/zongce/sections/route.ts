import { NextResponse } from "next/server"
import { unlink } from "fs/promises"
import path from "path"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SECTION_META, OPEN_SECTIONS, FORM_LOCKED, calcWeightedGPA, calcSScore, calcAScore, calcDScore, calcEScore, calcFScore } from "@/lib/zongce-utils"
import { guestSectionDetail } from "@/lib/guest-data"

// GET — get sections
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  // 游客模式：返回演示板块数据
  if (session.user.role === "guest") {
    const sections = ["S", "A", "D", "E", "F"].map(s => guestSectionDetail(s))
    return NextResponse.json({ sections, courseScores: [] })
  }

  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get("userId") || session.user.id

  // Non-admin can only see their own
  if (targetUserId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "无权查看" }, { status: 403 })
  }

  const sections = await prisma.zongceSection.findMany({
    where: { userId: targetUserId },
  })

  const courseScores = targetUserId === session.user.id || session.user.role === "admin"
    ? await prisma.courseScore.findMany({
        where: { userId: targetUserId },
        include: { course: true },
      })
    : []

  return NextResponse.json({ sections, courseScores })
}

// PUT — update/create a section (submit, save draft, etc.)
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  try {
    const { section, data, status, evidence } = await req.json()
    if (!section || !SECTION_META[section]) {
      return NextResponse.json({ error: "无效的板块" }, { status: 400 })
    }
    // 综测填报已截止：全部板块只读，仅管理员可后台调整
    if (FORM_LOCKED && session.user.role !== "admin") {
      return NextResponse.json({ error: "综测填报已截止，仅可查看" }, { status: 403 })
    }
    // 未开发的板块上锁
    if (!OPEN_SECTIONS.includes(section)) {
      return NextResponse.json({ error: "该板块暂未开放" }, { status: 403 })
    }
    // B/C 板块：由对应班委评定填写，学生不可自行提交
    if ((section === "B" && session.user.role !== "admin" && !(session.user.tags ?? []).includes("团支书")) ||
        (section === "C" && session.user.role !== "admin" && !(session.user.tags ?? []).includes("生活委员"))) {
      return NextResponse.json({ error: `该板块由${SECTION_META[section].reviewer}评定填写` }, { status: 403 })
    }
    // 状态白名单: 学生只能保存草稿或提交审核
    const safeStatus = status === "submitted" ? "submitted" : "draft"

    const userId = session.user.id

    // 得分一律服务端计算，忽略前端传入的 score（防篡改）
    let calculatedScore = 0
    const parsedData: any = data ? (typeof data === "string" ? JSON.parse(data) : data) : {}
    if (section === "S") {
      const [courses, courseScores] = await Promise.all([
        prisma.course.findMany(),
        prisma.courseScore.findMany({ where: { userId } }),
      ])
      const autoGpa = calcWeightedGPA(courses, courseScores)
      const autoScore = calcSScore(autoGpa)
      // 手填汇总值优先（教务系统数值），空值回退到系统自动计算；GPA 钳制 0~5，S 分钳制 0~130
      const opt = (v: unknown): number | null => {
        if (v === null || v === undefined || v === "") return null
        const n = Number(v)
        return Number.isFinite(n) && n >= 0 ? n : null
      }
      const yearGpa = opt(parsedData.yearGpa) ?? autoGpa
      const total = opt(parsedData.totalScore) ?? calcSScore(Math.min(yearGpa, 5))
      calculatedScore = Math.round(Math.min(130, Math.max(0, total)) * 100) / 100

      // 提交审核必须全部课程已填成绩（防绕过前端直接调 API）
      if (safeStatus === "submitted") {
        const filledIds = new Set(
          courseScores
            .filter(s => s.score != null || s.grade || s.gpa != null)
            .map(s => s.courseId)
        )
        const missing = courses.filter(c => !filledIds.has(c.id))
        if (missing.length > 0) {
          return NextResponse.json({
            error: `还有 ${missing.length} 门课程未填写成绩（${missing.map(c => c.name).slice(0, 5).join("、")}${missing.length > 5 ? " 等" : ""}），请全部填完后再提交`,
          }, { status: 400 })
        }
      }
    } else if (section === "A") {
      // 自动计算：旷课-1/次、迟到-0.25/次、特殊情况请假不扣分，钳制 0~5
      calculatedScore = calcAScore(Number(parsedData.absences) || 0, Number(parsedData.tardies) || 0)
    } else if (section === "D") {
      // 文体活动：参与类固定加分 + 获奖按级别×名次表，封顶 5
      const items = Array.isArray(parsedData.items) ? parsedData.items : []
      calculatedScore = calcDScore(items)
    } else if (section === "E") {
      // 社会实践/公益：队长/分队奖/个人荣誉/志愿时长，封顶 5
      calculatedScore = calcEScore(parsedData)
    } else if (section === "F") {
      // 奖惩附加：F1-F5 五组，封顶 10
      calculatedScore = calcFScore(parsedData)
    }

    // Check if section exists
    const existing = await prisma.zongceSection.findUnique({
      where: { userId_section: { userId, section } },
    })

    const updateData: any = {
      data: data ? JSON.stringify(data) : undefined,
      score: calculatedScore,
      status: safeStatus,
      evidence: evidence ? JSON.stringify(evidence) : undefined,
    }

    // If submitting, set timestamp
    if (safeStatus === "submitted") {
      updateData.submittedAt = new Date()
    }

    if (existing) {
      const updated = await prisma.zongceSection.update({
        where: { id: existing.id },
        data: updateData,
      })
      return NextResponse.json({ ok: true, section: updated, score: calculatedScore })
    } else {
      const created = await prisma.zongceSection.create({
        data: {
          userId,
          section,
          data: data ? JSON.stringify(data) : "{}",
          score: calculatedScore,
          status: safeStatus,
          evidence: evidence ? JSON.stringify(evidence) : "[]",
          ...(safeStatus === "submitted" ? { submittedAt: new Date() } : {}),
        },
      })
      return NextResponse.json({ ok: true, section: created, score: calculatedScore })
    }
  } catch (e: any) {
    console.error("[zongce/sections PUT]", e.message)
    return NextResponse.json({ error: "保存失败" }, { status: 500 })
  }
}

// DELETE ?section=X — 学生重置自己的板块（清空数据 + 佐证照片文件；B/C 为班委评定，学生不可重置）
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const sectionKey = searchParams.get("section")
  if (!sectionKey || !SECTION_META[sectionKey]) {
    return NextResponse.json({ error: "无效的板块" }, { status: 400 })
  }

  const userId = session.user.id
  const isAdmin = session.user.role === "admin"
  const tags: string[] = (session.user.tags ?? []) as string[]

  // B/C 板块由班委评定，学生不可重置
  if (sectionKey === "B" && !isAdmin && !tags.includes("团支书")) {
    return NextResponse.json({ error: "B 板块由团支书评定，不可自行重置" }, { status: 403 })
  }
  if (sectionKey === "C" && !isAdmin && !tags.includes("生活委员")) {
    return NextResponse.json({ error: "C 板块由生活委员评定，不可自行重置" }, { status: 403 })
  }

  const section = await prisma.zongceSection.findUnique({
    where: { userId_section: { userId, section: sectionKey } },
  })

  if (section) {
    // 收集并删除佐证照片文件（evidence 数组 + data 内嵌 photos）
    const urls: string[] = []
    try { urls.push(...JSON.parse(section.evidence || "[]")) } catch { /* ignore */ }
    const m = (section.data || "").match(/\/?(?:api\/)?uploads\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+/g) || []
    urls.push(...m)
    for (const u of new Set(urls)) {
      const clean = u.replace(/^\//, "").replace(/^api\/uploads\//, "uploads/").replace(/^uploads\//, "uploads/")
      try { await unlink(path.join(process.cwd(), "public", clean)) } catch { /* 文件不存在则忽略 */ }
    }
    await prisma.zongceSection.delete({ where: { id: section.id } })
  }

  // S 板块同时清空课程成绩
  if (sectionKey === "S") {
    await prisma.courseScore.deleteMany({ where: { userId } })
  }

  return NextResponse.json({ ok: true })
}
