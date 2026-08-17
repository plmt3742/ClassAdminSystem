import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calcWeightedGPA, calcSScore, calcMScore, calcTotalScore } from "@/lib/zongce-utils"
import { guestRanking } from "@/lib/guest-data"

// GET /api/zongce/ranking
// 班级排名总面板：全班学生按总分排名，含全部明细。
// 榜单为全班公开信息：所有登录同学均可查看（含各板块细项得分与提交内容，不含证据照片链接）。
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  // 游客模式：返回演示排名（不暴露真实姓名/分数）
  if (session.user.role === "guest") {
    return NextResponse.json(guestRanking())
  }

  const [users, courses, allScores, allSections] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, studentId: true, physicalTest: true }, orderBy: { studentId: "asc" } }),
    prisma.course.findMany({ orderBy: [{ semester: "asc" }, { sortOrder: "asc" }] }),
    prisma.courseScore.findMany({ include: { course: true } }),
    prisma.zongceSection.findMany(),
  ])

  const isFailed = (s: (typeof allScores)[number]) => (s.score != null && s.score < 60) || s.grade === "不及格"
  const isPolicy = (s: (typeof allScores)[number]) => (s.course?.name || "").includes("形势与政策") || (s.course?.name || "").includes("形式与政策")

  // 解析板块提交内容（剥离照片链接，仅保留文本/数值明细，供全班榜单报表展示）
  const parseDetail = (raw: string | null): Record<string, unknown> => {
    if (!raw) return {}
    try {
      const d = JSON.parse(raw) as Record<string, unknown>
      const clean = (v: unknown): unknown => {
        if (Array.isArray(v)) return v.map(item => clean(item))
        if (v && typeof v === "object") {
          const o: Record<string, unknown> = {}
          for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
            if (k === "photos" || k === "evidence") continue
            o[k] = clean(val)
          }
          return o
        }
        return v
      }
      return clean(d) as Record<string, unknown>
    } catch { return {} }
  }

  const rows = users.map(u => {
    const userScores = allScores.filter(s => s.userId === u.id)
    const userSections = allSections.filter(s => s.userId === u.id)
    const secMap = new Map(userSections.map(s => [s.section, s]))

    // S 得分与学年绩点：一律以系统计算为准（不采信手填值）
    const autoGpa = calcWeightedGPA(courses, userScores)
    const effGpa = autoGpa
    const sScore = calcSScore(autoGpa)

    // M 得分（A-F 已通过板块之和）
    const mScores: Record<string, number> = {}
    for (const s of userSections) {
      if (s.section !== "S" && s.status === "approved") mScores[s.section] = s.score
    }
    const mScore = calcMScore(mScores)
    const totalScore = calcTotalScore(sScore, mScore)

    // 挂科 / 重修
    const failedCount = userScores.filter(s => isFailed(s) && !isPolicy(s)).length
    const failedPolicyCount = userScores.filter(s => isFailed(s) && isPolicy(s)).length
    const repeatCount = userScores.filter(s => s.repeat === true).length

    // 板块明细
    const sectionScores = ["S", "A", "B", "C", "D", "E", "F"].map(k => {
      const sec = secMap.get(k)
      return {
        section: k,
        status: sec?.status || "not_started",
        score: k === "S" ? Math.round(sScore * 100) / 100 : (sec?.score || 0),
      }
    })
    const approvedCount = userSections.filter(s => s.status === "approved").length

    // 板块提交内容明细（报表用，已剥离照片链接）
    const sectionDetails: Record<string, Record<string, unknown>> = {}
    for (const k of ["A", "B", "C", "D", "E", "F"]) {
      const sec = secMap.get(k)
      sectionDetails[k] = sec ? parseDetail(sec.data) : {}
    }

    // 课程明细
    const coursesDetail = userScores.map(s => ({
      name: s.course?.name || s.courseId,
      credits: s.course?.credits ?? 0,
      semester: s.course?.semester ?? 1,
      score: s.score,
      grade: s.grade,
      gpa: s.gpa,
      repeat: s.repeat === true,
      failed: isFailed(s),
    }))

    return {
      id: u.id,
      name: u.name,
      studentId: u.studentId,
      physicalTest: u.physicalTest ?? null,
      gpa: Math.round(effGpa * 100) / 100,
      sScore: Math.round(sScore * 100) / 100,
      mScore,
      totalScore,
      failedCount,
      failedPolicyCount,
      repeatCount,
      approvedCount,
      totalSections: 7,
      sectionScores,
      sectionDetails,
      coursesDetail,
      filledCount: userScores.filter(s => s.score != null || s.grade != null || s.gpa != null).length,
      courseTotal: courses.length,
    }
  }).sort((a, b) => b.totalScore - a.totalScore || b.sScore - a.sScore)

  const avgTotal = rows.length > 0 ? Math.round((rows.reduce((s, r) => s + r.totalScore, 0) / rows.length) * 100) / 100 : 0
  const maxTotal = rows.length > 0 ? rows[0].totalScore : 0
  const totalFailed = rows.reduce((s, r) => s + r.failedCount + r.failedPolicyCount, 0)

  return NextResponse.json({
    rows,
    totalStudents: rows.length,
    avgTotal,
    maxTotal,
    totalFailed,
    courseCount: courses.length,
  })
}
