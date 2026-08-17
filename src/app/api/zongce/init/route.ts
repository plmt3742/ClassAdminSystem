import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const PRESET_COURSES = [
  // Semester 1
  { name: "高等数学A-1", credits: 5, semester: 1, isElective: false, sortOrder: 1 },
  { name: "线性代数", credits: 3, semester: 1, isElective: false, sortOrder: 2 },
  { name: "国际素养英语A-1", credits: 2, semester: 1, isElective: false, sortOrder: 3 },
  { name: "程序设计基础", credits: 3, semester: 1, isElective: false, sortOrder: 4 },
  { name: "中国近现代史纲要", credits: 3, semester: 1, isElective: false, sortOrder: 5 },
  { name: "计算机导论", credits: 2, semester: 1, isElective: false, sortOrder: 6 },
  { name: "军事技能", credits: 2, semester: 1, isElective: false, sortOrder: 7 },
  { name: "体育1", credits: 1, semester: 1, isElective: false, sortOrder: 8 },
  { name: "大学生心理健康教育", credits: 2, semester: 1, isElective: false, sortOrder: 9 },
  { name: "习近平新时代中国特色社会主义概论", credits: 3, semester: 1, isElective: false, sortOrder: 10 },
  { name: "通识教育-自然科学经典导引", credits: 2, semester: 1, isElective: false, sortOrder: 11 },
  { name: "形势与政策1", credits: 0.5, semester: 1, isElective: false, sortOrder: 12 },
  // Semester 2
  { name: "高等数学A-2", credits: 5, semester: 2, isElective: false, sortOrder: 13 },
  { name: "数据结构与算法", credits: 4, semester: 2, isElective: false, sortOrder: 14 },
  { name: "国际素养英语A2", credits: 2, semester: 2, isElective: false, sortOrder: 15 },
  { name: "离散数学", credits: 3, semester: 2, isElective: false, sortOrder: 16 },
  { name: "思想道德与法治", credits: 3, semester: 2, isElective: false, sortOrder: 17 },
  { name: "AI辅助程序设计实践", credits: 1, semester: 2, isElective: false, sortOrder: 18 },
  { name: "体育2", credits: 1, semester: 2, isElective: false, sortOrder: 19 },
  { name: "通识教育-人文社科经典导引", credits: 2, semester: 2, isElective: false, sortOrder: 20 },
  { name: "军事理论", credits: 2, semester: 2, isElective: false, sortOrder: 21 },
  { name: "劳动教育", credits: 1, semester: 2, isElective: false, sortOrder: 22 },
  { name: "形势与政策2", credits: 0.5, semester: 2, isElective: false, sortOrder: 23 },
  { name: "国家安全教育", credits: 1, semester: 2, isElective: false, sortOrder: 24 },
]

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "仅管理员" }, { status: 403 })

  const count = await prisma.course.count()
  if (count > 0) return NextResponse.json({ ok: true, created: 0, message: "课程已存在" })

  for (const c of PRESET_COURSES) {
    await prisma.course.create({ data: c })
  }

  return NextResponse.json({ ok: true, created: PRESET_COURSES.length })
}
