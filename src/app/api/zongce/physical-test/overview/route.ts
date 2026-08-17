import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkManager } from "@/lib/permissions"

// GET /api/zongce/physical-test/overview
// 体测结果面板：全班学生的体测填报汇总（管理员/班委可见）
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const isAdmin = session.user.role === "admin"
  if (!isAdmin) {
    const ok = await checkManager(session)
    if (!ok) return NextResponse.json({ error: "仅管理员或班委可查看" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: { studentId: "asc" },
    select: { id: true, name: true, studentId: true, physicalTest: true },
  })

  const rows = users.map(u => ({
    id: u.id,
    name: u.name,
    studentId: u.studentId,
    physicalTest: u.physicalTest ?? null,
  }))

  const passed = rows.filter(r => r.physicalTest === true).length
  const failed = rows.filter(r => r.physicalTest === false).length
  const unfilled = rows.filter(r => r.physicalTest === null).length

  return NextResponse.json({
    rows,
    stats: {
      total: rows.length,
      filled: passed + failed,
      passed,
      failed,
      unfilled,
    },
  })
}
