import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calcWeightedGPA, calcSScore, calcMScore, calcTotalScore, SECTION_META, SECTION_ORDER, OPEN_SECTIONS } from "@/lib/zongce-utils"
import { checkManager } from "@/lib/permissions"
import { guestDashboard } from "@/lib/guest-data"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  // 游客模式：返回演示综测看板（不暴露真实分数）
  if (session.user.role === "guest") {
    return NextResponse.json(guestDashboard())
  }

  const { searchParams } = new URL(req.url)
  const isAdmin = session.user.role === "admin"
  const requestedUserId = searchParams.get("userId")
  const overviewMode = searchParams.get("overview") === "true"

  // Admin overview mode: explicitly requested via ?overview=true
  if (isAdmin && overviewMode) {
    return getAdminOverview()
  }

  // Admin can view any student via ?userId=; others can only view themselves
  const userId = (isAdmin && requestedUserId) ? requestedUserId : session.user.id
  const tags: string[] = (session.user as any).tags ?? []

  // Fetch courses & scores for S calculation
  const [courses, courseScores, sections] = await Promise.all([
    prisma.course.findMany({ orderBy: [{ semester: "asc" }, { sortOrder: "asc" }] }),
    prisma.courseScore.findMany({ where: { userId } }),
    prisma.zongceSection.findMany({ where: { userId } }),
  ])

  // Calculate S score（手填汇总值优先，未填则自动计算）
  const weightedGPA = calcWeightedGPA(courses, courseScores)
  let effGpa = weightedGPA
  let sScore = calcSScore(weightedGPA)
  const sSection = sections.find(s => s.section === "S")
  if (sSection?.data) {
    try {
      const d = JSON.parse(sSection.data)
      const opt = (v: unknown): number | null => (v === null || v === undefined || v === "") ? null : (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null)
      const y = opt(d.yearGpa), t = opt(d.totalScore)
      if (y != null) effGpa = y
      if (t != null) sScore = Math.min(130, t)
    } catch { /* ignore */ }
  }

  // Build section map
  const sectionMap: Record<string, any> = {}
  for (const s of sections) {
    sectionMap[s.section] = s
  }

  // Build section list with status
  const sectionsList = SECTION_ORDER.map(key => {
    const existing = sectionMap[key]
    return {
      section: key,
      label: SECTION_META[key].label,
      max: SECTION_META[key].max,
      reviewer: SECTION_META[key].reviewer,
      icon: SECTION_META[key].icon,
      status: existing?.status || "not_started",
      score: key === "S" ? sScore : (existing?.score || 0),
      data: key === "S" ? { gpa: Math.round(effGpa * 100) / 100 } : (existing?.data ? JSON.parse(existing.data) : {}),
      locked: !OPEN_SECTIONS.includes(key),
    }
  })

  // Calculate M score from approved sections
  const mScores: Record<string, number> = {}
  for (const s of sections) {
    if (s.section !== "S" && s.status === "approved") {
      mScores[s.section] = s.score
    }
  }
  const mScore = calcMScore(mScores)
  const totalScore = calcTotalScore(sScore, mScore)

  // Pending reviews (for class committee or admin)
  const isManager = isAdmin || await checkManager(session)
  let pendingReviews: any[] = []
  if (isManager) {
    const submitted = await prisma.zongceSection.findMany({
      where: { status: "submitted" },
      include: { user: { select: { id: true, name: true, studentId: true } } },
      orderBy: { submittedAt: "asc" },
    })
    pendingReviews = submitted
      .filter(s => {
        // Admin sees all; class committee only see their own sections
        if (isAdmin) return true
        const reviewerTag = SECTION_META[s.section]?.reviewer
        return tags.includes(reviewerTag)
      })
      .map(s => ({
        id: s.id,
        section: s.section,
        sectionLabel: SECTION_META[s.section]?.label || s.section,
        userName: s.user.name,
        userStudentId: s.user.studentId,
        submittedAt: s.submittedAt,
        status: s.status,
      }))
  }

  // All students (for admin selector)
  const allStudents = isAdmin
    ? (await prisma.user.findMany({ select: { id: true, name: true, studentId: true, role: true }, orderBy: { studentId: "asc" } }))
    : []

  // Photo count (佐证照片汇总：evidence 数组 + data 内嵌 photos，供班委照片中心入口显示)
  const photoSections = isManager
    ? await prisma.zongceSection.findMany({ where: { evidence: { not: "[]" } } })
    : []
  let photoCount = 0
  for (const s of photoSections) {
    try { photoCount += JSON.parse(s.evidence || "[]").length } catch { /* ignore */ }
    const m = (s.data || "").match(/\/?(?:api\/)?uploads\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+/g) || []
    photoCount += m.length
  }

  // Viewing student info
  const viewingUser = userId !== session.user.id
    ? await prisma.user.findUnique({ where: { id: userId }, select: { name: true, studentId: true, physicalTest: true } })
    : null

  return NextResponse.json({
    sScore,
    mScore,
    totalScore,
    weightedGPA: Math.round(weightedGPA * 100) / 100,
    sections: sectionsList,
    pendingReviews,
    courseCount: courses.length,
    filledScoreCount: courseScores.filter(s => s.score != null || s.grade != null).length,
    allStudents,
    viewingUser,
    isAdmin,
    photoCount,
  })
}

// Admin overview: all students' total scores
async function getAdminOverview() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, studentId: true, role: true },
    orderBy: { studentId: "asc" },
  })

  const courses = await prisma.course.findMany()
  const allScores = await prisma.courseScore.findMany({ include: { course: true } })
  const allSections = await prisma.zongceSection.findMany()

  const overview = users.map(u => {
    // Calculate S score（手填汇总值优先）
    const userScores = allScores.filter(s => s.userId === u.id)
    const weightedGPA = calcWeightedGPA(courses, userScores)
    let effGpa = weightedGPA
    let s = calcSScore(weightedGPA)

    // Calculate M score
    const userSections = allSections.filter(s => s.userId === u.id)
    const sSection = userSections.find(sec => sec.section === "S")
    if (sSection?.data) {
      try {
        const d = JSON.parse(sSection.data)
        const opt = (v: unknown): number | null => (v === null || v === undefined || v === "") ? null : (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null)
        const y = opt(d.yearGpa), t = opt(d.totalScore)
        if (y != null) effGpa = y
        if (t != null) s = Math.min(130, t)
      } catch { /* ignore */ }
    }
    const mScores: Record<string, number> = {}
    for (const sec of userSections) {
      if (sec.section !== "S" && sec.status === "approved") {
        mScores[sec.section] = sec.score
      }
    }
    const m = calcMScore(mScores)
    const t = calcTotalScore(s, m)

    // Section status counts
    const statusCounts: Record<string, number> = { not_started: 0, draft: 0, submitted: 0, approved: 0, returned: 0 }
    for (const sec of userSections) {
      if (sec.section !== "S") statusCounts[sec.status] = (statusCounts[sec.status] || 0) + 1
    }

    return {
      id: u.id,
      name: u.name,
      studentId: u.studentId,
      role: u.role,
      sScore: s,
      mScore: m,
      totalScore: t,
      gpa: Math.round(effGpa * 100) / 100,
      statusCounts,
      hasScores: userScores.length > 0,
      sectionCount: userSections.length,
      approvedCount: statusCounts.approved,
      totalSections: 7,
    }
  })

  return NextResponse.json({
    overview,
    courseCount: courses.length,
    totalStudents: users.length,
    isAdmin: true,
  })
}
