import { NextResponse } from "next/server"
import { FORM_LOCKED } from "@/lib/zongce-utils"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkManager } from "@/lib/permissions"
import { calcBScore } from "@/lib/zongce-utils"

// GET — 全班 B 集会学习评定列表（团支书/管理员）
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  if (FORM_LOCKED && session.user.role !== "admin") return NextResponse.json({ error: "综测填报已截止，仅可查看" }, { status: 403 })

  const isAdmin = session.user.role === "admin"
  if (!isAdmin) {
    const isCommittee = await checkManager(session)
    const tags: string[] = session.user.tags ?? []
    if (!isCommittee || !tags.includes("团支书")) {
      return NextResponse.json({ error: "仅团支书或管理员可评定" }, { status: 403 })
    }
  }

  const [users, bSections] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, studentId: true }, orderBy: { studentId: "asc" } }),
    prisma.zongceSection.findMany({ where: { section: "B" } }),
  ])

  const sectionByUser = new Map(bSections.map(s => [s.userId, s]))

  const cards = users.map(u => {
    const section = sectionByUser.get(u.id)
    let excellentMember = false
    let partyMember = false
    let youthStudyCount = 0
    if (section?.data) {
      try {
        const d = JSON.parse(section.data)
        excellentMember = !!d.excellentMember
        partyMember = !!d.partyMember
        youthStudyCount = Number(d.youthStudyCount) || 0
      } catch { /* ignore */ }
    }
    return {
      id: u.id,
      name: u.name,
      studentId: u.studentId,
      excellentMember,
      partyMember,
      youthStudyCount,
      score: section ? section.score : null,
      sectionId: section?.id || null,
    }
  })

  return NextResponse.json({ cards })
}

// PUT — 保存某位同学的 B 评定（团支书/管理员），保存即生效（approved）
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const isAdmin = session.user.role === "admin"
  if (!isAdmin) {
    const isCommittee = await checkManager(session)
    const tags: string[] = session.user.tags ?? []
    if (!isCommittee || !tags.includes("团支书")) {
      return NextResponse.json({ error: "仅团支书或管理员可评定" }, { status: 403 })
    }
  }

  const { userId, excellentMember, partyMember, youthStudyCount } = await req.json()
  if (!userId) return NextResponse.json({ error: "缺少学生" }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) return NextResponse.json({ error: "学生不存在" }, { status: 404 })

  const data = {
    excellentMember: !!excellentMember,
    partyMember: !!partyMember,
    youthStudyCount: Math.max(0, Math.min(200, Math.round(Number(youthStudyCount) || 0))),
  }
  const score = calcBScore(data)

  const existing = await prisma.zongceSection.findUnique({
    where: { userId_section: { userId, section: "B" } },
  })

  if (existing) {
    await prisma.zongceSection.update({
      where: { id: existing.id },
      data: { data: JSON.stringify(data), score, status: "approved", reviewedAt: new Date(), reviewNote: null },
    })
  } else {
    await prisma.zongceSection.create({
      data: {
        userId,
        section: "B",
        data: JSON.stringify(data),
        score,
        status: "approved",
        submittedAt: new Date(),
        reviewedAt: new Date(),
      },
    })
  }

  return NextResponse.json({ ok: true, score })
}

// DELETE ?userId=xxx — 删除某位同学的 B 评定（恢复未评定状态）
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const isAdmin = session.user.role === "admin"
  if (!isAdmin) {
    const isCommittee = await checkManager(session)
    const tags: string[] = session.user.tags ?? []
    if (!isCommittee || !tags.includes("团支书")) {
      return NextResponse.json({ error: "仅团支书或管理员可评定" }, { status: 403 })
    }
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "缺少学生" }, { status: 400 })

  await prisma.zongceSection.deleteMany({ where: { userId, section: "B" } })
  return NextResponse.json({ ok: true })
}
