import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const VALID_TAGS = ["班长","副班长","团支书","副团支书","心理委员","学习委员","生活委员","文体委员","志愿队长","组织委员","宣传委员"]

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 })
  }

  const { userId, tags } = await req.json()
  if (!userId) return NextResponse.json({ error: "缺少 userId" }, { status: 400 })

  const validTags = (Array.isArray(tags) ? tags : []).filter((t: string) => VALID_TAGS.includes(t))

  const user = await prisma.user.update({
    where: { id: userId },
    data: { tags: JSON.stringify(validTags) },
    select: { id: true, name: true, studentId: true, tags: true },
  })

  return NextResponse.json({ user: { ...user, tags: JSON.parse(user.tags || "[]") } })
}
