import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkManager } from "@/lib/permissions"
import { calcAScore } from "@/lib/zongce-utils"

// A 学风考勤审核列表: 仅班长或管理员可查看
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const isAdmin = session.user.role === "admin"
  if (!isAdmin) {
    const isCommittee = await checkManager(session)
    const tags: string[] = session.user.tags ?? []
    if (!isCommittee || !tags.includes("班长")) {
      return NextResponse.json({ error: "仅班长或管理员可查看" }, { status: 403 })
    }
  }

  const [users, aSections] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, studentId: true }, orderBy: { studentId: "asc" } }),
    prisma.zongceSection.findMany({ where: { section: "A" } }),
  ])

  const sectionByUser = new Map(aSections.map(s => [s.userId, s]))

  const cards = users.map(u => {
    const section = sectionByUser.get(u.id)
    let absences = 0, tardies = 0, specialLeaves = 0
    if (section?.data) {
      try {
        const data = JSON.parse(section.data)
        absences = Number(data.absences) || 0
        tardies = Number(data.tardies) || 0
        specialLeaves = Number(data.specialLeaves) || 0
      } catch { /* ignore */ }
    }
    return {
      id: u.id,
      name: u.name,
      studentId: u.studentId,
      status: section?.status || "not_started",
      score: section ? (section.score ?? calcAScore(absences, tardies)) : null,
      absences,
      tardies,
      specialLeaves,
      sectionId: section?.id || null,
      submittedAt: section?.submittedAt || null,
    }
  })

  return NextResponse.json({ cards })
}
