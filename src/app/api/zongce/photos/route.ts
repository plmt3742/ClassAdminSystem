import { NextResponse } from "next/server"
import os from "os"
import { statfsSync } from "fs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkManager } from "@/lib/permissions"
import { SECTION_META } from "@/lib/zongce-utils"

// GET /api/zongce/photos — 综测佐证照片汇总（班委/管理员）+ 服务器内存
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const isAdmin = session.user.role === "admin"
  if (!isAdmin) {
    const isCommittee = await checkManager(session)
    if (!isCommittee) return NextResponse.json({ error: "仅负责综测的班委可查看" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId") || undefined

  const sections = await prisma.zongceSection.findMany({
    where: { evidence: { not: "[]" }, ...(userId ? { userId } : {}) },
    include: { user: { select: { id: true, name: true, studentId: true } } },
    orderBy: { updatedAt: "desc" },
  })

  const photos: any[] = []
  const studentSet = new Set<string>()
  for (const s of sections) {
    // 收集照片 URL：evidence 数组 + data 内嵌 photos（D 的 items[].photos、F 的 f1~f4[].photos）
    const urls = new Set<string>()
    try {
      for (const u of JSON.parse(s.evidence || "[]")) if (typeof u === "string") urls.add(u)
    } catch { /* ignore */ }
    const m = (s.data || "").match(/\/?(?:api\/)?uploads\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+/g) || []
    for (const u of m) urls.add(u.startsWith("/") ? u : "/" + u)
    if (urls.size === 0) continue
    studentSet.add(s.userId)
    for (const url of urls) {
      photos.push({
        id: s.id,
        userId: s.userId,
        name: s.user.name,
        studentId: s.user.studentId,
        section: s.section,
        sectionLabel: SECTION_META[s.section]?.label || s.section,
        status: s.status,
        url,
        updatedAt: s.updatedAt,
      })
    }
  }

  // 运行内存（RAM）
  const memTotal = os.totalmem()
  const memFree = os.freemem()
  const memUsed = memTotal - memFree

  // 磁盘存储（照片存放位置，取项目所在分区）
  let disk = { total: 0, free: 0, used: 0, percent: 0 }
  try {
    const st = statfsSync("/")
    const total = st.blocks * st.bsize
    const free = st.bavail * st.bsize
    const used = total - free
    disk = { total, free, used, percent: Math.round((used / total) * 1000) / 10 }
  } catch { /* 某些环境 statfs 不可用时忽略 */ }

  return NextResponse.json({
    photos,
    studentCount: studentSet.size,
    memory: {
      total: memTotal,
      free: memFree,
      used: memUsed,
      percent: Math.round((memUsed / memTotal) * 1000) / 10,
    },
    disk,
  })
}
