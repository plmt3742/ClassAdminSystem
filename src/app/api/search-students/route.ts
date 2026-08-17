import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { guestSearch } from "@/lib/guest-data"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() || ""

  // 游客模式：返回演示搜索结果
  const session = await auth()
  if (session?.user?.role === "guest") {
    return NextResponse.json(guestSearch(q))
  }

  if (!q) return NextResponse.json({ students: [] })

  const students = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { studentId: { contains: q } },
      ],
    },
    select: { id: true, name: true, studentId: true },
    take: 10,
    orderBy: { studentId: "asc" },
  })

  return NextResponse.json({ students })
}
