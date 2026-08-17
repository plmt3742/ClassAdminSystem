import { prisma } from "@/lib/prisma"

// All class committee (班委) tags
const COMMITTEE_TAGS = [
  "班长", "副班长", "团支书", "副团支书",
  "心理委员", "学习委员", "生活委员", "文体委员",
  "志愿队长", "组织委员", "宣传委员",
]

export async function checkManager(session: any) {
  if (!session?.user?.id) return false
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, tags: true } })
  if (!user) return false
  if (user.role === "admin") return true
  const tags: string[] = typeof user.tags === "string" ? JSON.parse(user.tags || "[]") : (user.tags || [])
  return COMMITTEE_TAGS.some(t => tags.includes(t))
}
