import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkManager } from "@/lib/permissions"
import { calcWeightedGPA, calcSScore } from "@/lib/zongce-utils"

// S 学习成绩审核仪表盘: 仅学习委员或管理员可查看（含全班成绩，必须鉴权）
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const isAdmin = session.user.role === "admin"
  if (!isAdmin) {
    const isCommittee = await checkManager(session)
    const tags: string[] = session.user.tags ?? []
    if (!isCommittee || !tags.includes("学习委员")) {
      return NextResponse.json({ error: "仅学习委员或管理员可查看" }, { status: 403 })
    }
  }

  const [users, courses, allScores, sSections] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, studentId: true }, orderBy: { studentId: "asc" } }),
    prisma.course.findMany(),
    prisma.courseScore.findMany({ include: { course: true } }),
    prisma.zongceSection.findMany({ where: { section: "S" } }),
  ])

  // 服务端统一用 calcWeightedGPA 计算，前端零计算
  const sectionByUser = new Map(sSections.map(s => [s.userId, s]))

  const cards = users.map(u => {
    const userScores = allScores.filter(s => s.userId === u.id)
    const section = sectionByUser.get(u.id)
    const autoGpa = calcWeightedGPA(courses, userScores)
    const autoS = calcSScore(autoGpa)
    // 手填汇总值（教务系统数值）优先，未填则用自动计算
    let sem1Gpa: number | null = null, sem2Gpa: number | null = null
    let yearGpa: number | null = null, totalScore: number | null = null
    if (section?.data) {
      try {
        const d = JSON.parse(section.data)
        const opt = (v: unknown): number | null => (v === null || v === undefined || v === "") ? null : (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null)
        sem1Gpa = opt(d.sem1Gpa); sem2Gpa = opt(d.sem2Gpa)
        yearGpa = opt(d.yearGpa); totalScore = opt(d.totalScore)
      } catch { /* ignore */ }
    }
    const gpa = yearGpa ?? Math.round(autoGpa * 100) / 100
    const sScore = totalScore ?? Math.round(autoS * 100) / 100
    // 挂科统计（仅审阅面板可见，不展示给学生）：百分制 <60 或五级制"不及格"
    // 形势与政策（形策）挂科单独计算，不并入普通挂科数
    const isFailed = (s: (typeof allScores)[number]) => (s.score != null && s.score < 60) || s.grade === "不及格"
    const isPolicy = (s: (typeof allScores)[number]) => (s.course?.name || "").includes("形势与政策") || (s.course?.name || "").includes("形式与政策")
    const failedCount = userScores.filter(s => isFailed(s) && !isPolicy(s)).length
    const failedPolicyCount = userScores.filter(s => isFailed(s) && isPolicy(s)).length
    const repeatCount = userScores.filter(s => s.repeat === true).length
    return {
      id: u.id,
      name: u.name,
      studentId: u.studentId,
      status: section?.status || "not_started",
      gpa: Math.round(gpa * 100) / 100,
      sScore: Math.round(sScore * 100) / 100,
      sem1Gpa: sem1Gpa != null ? Math.round(sem1Gpa * 100) / 100 : null,
      sem2Gpa: sem2Gpa != null ? Math.round(sem2Gpa * 100) / 100 : null,
      totalScore: totalScore != null ? Math.round(totalScore * 100) / 100 : null,
      autoGpa: Math.round(autoGpa * 100) / 100,
      autoS: Math.round(autoS * 100) / 100,
      filled: userScores.filter(s => s.score != null || s.grade != null).length,
      total: courses.length,
      failedCount,
      failedPolicyCount,
      repeatCount,
      sectionId: section?.id || null,
      submittedAt: section?.submittedAt || null,
    }
  })

  return NextResponse.json({ cards, courseCount: courses.length })
}
