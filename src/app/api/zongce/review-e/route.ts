import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkManager } from "@/lib/permissions"

// E 社会实践/公益 审核列表: 仅组织委员或管理员可查看
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const isAdmin = session.user.role === "admin"
  if (!isAdmin) {
    const isCommittee = await checkManager(session)
    const tags: string[] = session.user.tags ?? []
    if (!isCommittee || !tags.includes("组织委员")) {
      return NextResponse.json({ error: "仅组织委员或管理员可查看" }, { status: 403 })
    }
  }

  const [users, eSections] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, studentId: true }, orderBy: { studentId: "asc" } }),
    prisma.zongceSection.findMany({ where: { section: "E" } }),
  ])

  const sectionByUser = new Map(eSections.map(s => [s.userId, s]))

  const cards = users.map(u => {
    const section = sectionByUser.get(u.id)
    let summary = ""
    let evidenceCount = 0
    if (section) {
      try { evidenceCount = JSON.parse(section.evidence || "[]").length } catch { /* ignore */ }
      try {
        const d = JSON.parse(section.data || "{}")
        const parts: string[] = []
        if (d.isCaptain) parts.push("队长")
        if (d.teamAward === "member") parts.push("优秀成员")
        if (d.teamAward === "captain") parts.push("优秀队长")
        if (d.schoolLevelAward) parts.push("校级积极分子")
        if (d.cityVolunteer) parts.push("市优志愿者")
        if (d.volunteerHours > 0) parts.push(`志愿${d.volunteerHours}h`)
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
      evidenceCount,
      sectionId: section?.id || null,
      submittedAt: section?.submittedAt || null,
    }
  })

  return NextResponse.json({ cards })
}
