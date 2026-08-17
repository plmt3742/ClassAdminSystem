import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET — list all courses
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }
  const courses = await prisma.course.findMany({
    orderBy: [{ semester: "asc" }, { sortOrder: "asc" }],
  })
  // Group by semester
  const bySemester: Record<number, typeof courses> = {}
  for (const c of courses) {
    if (!bySemester[c.semester]) bySemester[c.semester] = []
    bySemester[c.semester].push(c)
  }
  return NextResponse.json({ courses, bySemester })
}

// POST — add a course (学习委员 or admin only)
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const isAdmin = session.user.role === "admin"
  const tags: string[] = session.user.tags ?? []
  if (!isAdmin && !tags.includes("学习委员")) {
    return NextResponse.json({ error: "仅学习委员可配置课程" }, { status: 403 })
  }

  try {
    const { name, credits, semester, isElective, sortOrder } = await req.json()
    if (!name || credits == null || !semester) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 })
    }
    const course = await prisma.course.create({
      data: {
        name,
        credits: Number(credits),
        semester: Number(semester),
        isElective: Boolean(isElective),
        sortOrder: sortOrder || 0,
      },
    })
    return NextResponse.json({ ok: true, course })
  } catch (e: any) {
    console.error("[zongce/courses POST]", e.message)
    return NextResponse.json({ error: "创建失败" }, { status: 500 })
  }
}

// DELETE — remove a course
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }
  const isAdmin = session.user.role === "admin"
  const tags: string[] = session.user.tags ?? []
  if (!isAdmin && !tags.includes("学习委员")) {
    return NextResponse.json({ error: "仅学习委员可操作" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "缺少课程ID" }, { status: 400 })

  await prisma.course.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
