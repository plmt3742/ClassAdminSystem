import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { scoreToGPA, gradeToGPA , FORM_LOCKED} from "@/lib/zongce-utils"

// PUT — bulk save/update course scores (each student fills their own)
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  if (FORM_LOCKED && session.user.role !== "admin") return NextResponse.json({ error: "综测填报已截止，仅可查看" }, { status: 403 })

  try {
    interface ScoreInput {
      courseId: string
      score?: number | null
      grade?: string | null
      gpa?: number | string | null
      repeat?: boolean
    }
    const { scores } = await req.json() as { scores?: ScoreInput[] }
    if (!Array.isArray(scores)) {
      return NextResponse.json({ error: "无效数据" }, { status: 400 })
    }

    const userId = session.user.id
    const courseIds = scores.map(s => String(s.courseId))
    const existingCourses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true },
    })
    const validCourseIds = new Set(existingCourses.map(c => c.id))

    // 提交后（submitted/approved）重修标记固定：仅拒绝 repeat 值发生变化的请求
    // （撤回修改时 repeat 值不变，请求可正常通过）
    const sSection = await prisma.zongceSection.findUnique({
      where: { userId_section: { userId, section: "S" } },
      select: { status: true },
    })
    const repeatLocked = !!sSection && (sSection.status === "submitted" || sSection.status === "approved")
    if (repeatLocked) {
      for (const entry of scores) {
        if (entry.repeat === undefined) continue
        const existing = await prisma.courseScore.findUnique({
          where: { courseId_userId: { courseId: String(entry.courseId), userId } },
          select: { repeat: true },
        })
        if ((existing && existing.repeat !== entry.repeat) || (!existing && entry.repeat === true)) {
          return NextResponse.json({ error: "已提交审核，重修标记已固定；如需修改请先撤回修改" }, { status: 400 })
        }
      }
    }

    for (const entry of scores) {
      const { courseId, score, grade, gpa: manualGpa, repeat } = entry
      const cid = String(courseId)
      if (!validCourseIds.has(cid)) continue // 跳过不存在的课程

      let gpa: number | null = null
      // If student manually entered GPA, use it directly
      if (manualGpa != null && manualGpa !== "" && Number(manualGpa) >= 0) {
        gpa = Number(manualGpa)
      } else if (score != null && score > 0) {
        gpa = scoreToGPA(Number(score))
      } else if (grade) {
        gpa = gradeToGPA(String(grade))
      }

      const existing = await prisma.courseScore.findUnique({
        where: { courseId_userId: { courseId: cid, userId } },
      })

      if (existing) {
        await prisma.courseScore.update({
          where: { id: existing.id },
          data: {
            score: score != null ? Number(score) : null,
            grade: grade || null,
            gpa,
            repeat: repeat === true,
          },
        })
      } else {
        await prisma.courseScore.create({
          data: {
            courseId: cid,
            userId,
            score: score != null ? Number(score) : null,
            grade: grade || null,
            gpa,
            repeat: repeat === true,
          },
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error("[zongce/scores PUT]", e.message)
    return NextResponse.json({ error: "保存失败" }, { status: 500 })
  }
}

// GET — get scores (own, or anyone's for admin)
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get("userId") || session.user.id

  if (targetUserId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "无权查看" }, { status: 403 })
  }

  const scores = await prisma.courseScore.findMany({
    where: { userId: targetUserId },
    include: { course: true },
  })

  return NextResponse.json({ scores })
}
