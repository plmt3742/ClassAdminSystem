import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkManager } from "@/lib/permissions"
import { guestAnnouncements } from "@/lib/guest-data"

export async function GET() {
  try {
    // 游客模式：返回演示公告（不暴露真实公告内容）
    const session = await auth()
    if (session?.user?.role === "guest") {
      return NextResponse.json({ announcements: guestAnnouncements() })
    }

    const announcements = await prisma.announcement.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 10,
    })
    return NextResponse.json({ announcements })
  } catch (e: unknown) {
    console.error("[announcements]", e instanceof Error ? e.message : e)
    return NextResponse.json({ announcements: [] })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!(await checkManager(session))) {
    return NextResponse.json({ error: "仅班委可发布公告" }, { status: 403 })
  }

  try {
    const { title, content, pinned } = await req.json()
    if (!title?.trim()) return NextResponse.json({ error: "请输入标题" }, { status: 400 })
    if (!content?.trim()) return NextResponse.json({ error: "请输入内容" }, { status: 400 })

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        pinned: !!pinned,
        authorId: session!.user!.id,
        authorName: session!.user!.name || "",
      },
    })
    return NextResponse.json({ announcement })
  } catch (e: unknown) {
    console.error("[announcements/create]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "创建失败" }, { status: 500 })
  }
}
