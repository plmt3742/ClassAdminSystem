import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { guestMembers } from "@/lib/guest-data"

export async function GET() {
  // 游客模式：返回演示成员数据（不暴露真实姓名/学号）
  const session = await auth()
  if (session?.user?.role === "guest") {
    return NextResponse.json({ members: guestMembers() })
  }

  const members = await prisma.user.findMany({
    select: { id: true, studentId: true, name: true, role: true, tags: true, phone: true, createdAt: true },
    orderBy: { studentId: "asc" },
  })
  return NextResponse.json({ members })
}
