import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkManager } from "@/lib/permissions"
import { guestAnnouncements } from "@/lib/guest-data"

// Get single announcement detail
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 游客模式：返回演示公告详情（不暴露真实公告内容）
  const session = await auth()
  if (session?.user?.role === "guest") {
    const ann = guestAnnouncements().find(a => a.id === id)
    return NextResponse.json({ announcement: ann ?? guestAnnouncements()[0] })
  }

  const announcement = await prisma.announcement.findUnique({ where: { id } })
  if (!announcement) return NextResponse.json({ error: "公告不存在" }, { status: 404 })
  return NextResponse.json({ announcement })
}

// Update announcement (author or admin only)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!(await checkManager(session))) {
    return NextResponse.json({ error: "仅班委可编辑公告" }, { status: 403 })
  }

  const { id } = await params
  const { title, content, pinned } = await req.json()

  if (!title?.trim()) return NextResponse.json({ error: "请输入标题" }, { status: 400 })
  if (!content?.trim()) return NextResponse.json({ error: "请输入内容" }, { status: 400 })

  const existing = await prisma.announcement.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "公告不存在" }, { status: 404 })

  // Only author or admin can edit
  if (existing.authorId !== session!.user!.id && session!.user!.role !== "admin") {
    return NextResponse.json({ error: "只能编辑自己发布的公告" }, { status: 403 })
  }

  const announcement = await prisma.announcement.update({
    where: { id },
    data: { title: title.trim(), content: content.trim(), pinned: !!pinned },
  })

  return NextResponse.json({ announcement })
}

// Delete announcement (author or admin only)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!(await checkManager(session))) {
    return NextResponse.json({ error: "仅班委可删除公告" }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.announcement.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "公告不存在" }, { status: 404 })

  if (existing.authorId !== session!.user!.id && session!.user!.role !== "admin") {
    return NextResponse.json({ error: "只能删除自己发布的公告" }, { status: 403 })
  }

  await prisma.announcement.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
