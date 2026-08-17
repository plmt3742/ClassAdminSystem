import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkManager } from "@/lib/permissions"

// F 奖惩附加 审核列表: 仅班长或管理员可查看
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

  const [users, fSections] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, studentId: true }, orderBy: { studentId: "asc" } }),
    prisma.zongceSection.findMany({ where: { section: "F" } }),
  ])

  const sectionByUser = new Map(fSections.map(s => [s.userId, s]))

  const cards = users.map(u => {
    const section = sectionByUser.get(u.id)
    let summary = ""
    if (section?.data) {
      try {
        const d = JSON.parse(section.data)
        const parts: string[] = []
        if (Array.isArray(d.f1) && d.f1.length) parts.push(`职位${d.f1.length}`)
        if (Array.isArray(d.f2) && d.f2.length) parts.push(`竞赛${d.f2.length}`)
        if (Array.isArray(d.f3) && d.f3.length) parts.push(`荣誉${d.f3.length}`)
        if (Array.isArray(d.f4) && d.f4.length) parts.push(`科研${d.f4.length}`)
        if (Array.isArray(d.f5) && d.f5.length) parts.push(`处分${d.f5.length}`)
        summary = parts.join("·") || "—"
      } catch { /* ignore */ }
    }
    return {
      id: u.id,
      name: u.name,
      studentId: u.studentId,
      status: section?.status || "not_started",
      score: section?.score ?? null,
      summary,
      sectionId: section?.id || null,
      submittedAt: section?.submittedAt || null,
    }
  })

  return NextResponse.json({ cards })
}
