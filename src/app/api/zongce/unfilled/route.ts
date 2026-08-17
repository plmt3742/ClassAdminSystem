import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SECTION_META, SECTION_ORDER } from "@/lib/zongce-utils"

// GET /api/zongce/unfilled
// 未填写清单：按板块列出 未填写 / 草稿 / 待审核 / 已退回 名单（仅超级管理员可见）
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "仅超级管理员可查看" }, { status: 403 })
  }

  const [users, sections] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, studentId: true }, orderBy: { studentId: "asc" } }),
    prisma.zongceSection.findMany(),
  ])

  // userId+section → section
  const secByKey = new Map<string, (typeof sections)[number]>()
  for (const s of sections) secByKey.set(`${s.userId}|${s.section}`, s)

  const groups = SECTION_ORDER.map(key => {
    const notStarted: { name: string; studentId: string }[] = []
    const draft: { name: string; studentId: string }[] = []
    const submitted: { name: string; studentId: string }[] = []
    const returned: { name: string; studentId: string }[] = []
    const approved: { name: string; studentId: string }[] = []

    for (const u of users) {
      const sec = secByKey.get(`${u.id}|${key}`)
      const status = sec?.status || "not_started"
      const item = { name: u.name, studentId: u.studentId }
      if (status === "approved") approved.push(item)
      else if (status === "not_started") notStarted.push(item)
      else if (status === "draft") draft.push(item)
      else if (status === "submitted") submitted.push(item)
      else if (status === "returned") returned.push(item)
    }

    // 未填写 = 未开始 + 草稿（填了未提交视同未填写完），按学号合并排序
    const unfilled = [...notStarted, ...draft].sort((a, b) => a.studentId.localeCompare(b.studentId))

    return {
      section: key,
      label: SECTION_META[key]?.label || key,
      reviewer: SECTION_META[key]?.reviewer || "",
      total: users.length,
      approvedCount: approved.length,
      approved,
      unfilled,
      notStartedCount: notStarted.length,
      draftCount: draft.length,
      submitted,
      returned,
    }
  })

  return NextResponse.json({ sections: groups, totalStudents: users.length })
}
