import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkManager } from "@/lib/permissions"

// D 文体活动审核列表: 仅文体委员或管理员可查看
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const isAdmin = session.user.role === "admin"
  if (!isAdmin) {
    const isCommittee = await checkManager(session)
    const tags: string[] = session.user.tags ?? []
    if (!isCommittee || !tags.includes("文体委员")) {
      return NextResponse.json({ error: "仅文体委员或管理员可查看" }, { status: 403 })
    }
  }

  const [users, dSections] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, studentId: true }, orderBy: { studentId: "asc" } }),
    prisma.zongceSection.findMany({ where: { section: "D" } }),
  ])

  const sectionByUser = new Map(dSections.map(s => [s.userId, s]))

  const cards = users.map(u => {
    const section = sectionByUser.get(u.id)
    let itemCount = 0
    if (section?.data) {
      try {
        const d = JSON.parse(section.data)
        itemCount = Array.isArray(d.items) ? d.items.length : 0
      } catch { /* ignore */ }
    }
    return {
      id: u.id,
      name: u.name,
      studentId: u.studentId,
      status: section?.status || "not_started",
      score: section?.score ?? null,
      itemCount,
      sectionId: section?.id || null,
      submittedAt: section?.submittedAt || null,
    }
  })

  return NextResponse.json({ cards })
}
