import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

// POST /api/upload — 上传佐证图片（登录用户可用）
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "未收到文件" }, { status: 400 })
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "仅支持图片文件" }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "图片不能超过 5MB" }, { status: 400 })

  const rawExt = (file.name.split(".").pop() || "").toLowerCase()
  const safeExt = /^(png|jpe?g|gif|webp|bmp|heic)$/.test(rawExt) ? rawExt : "png"

  const dir = path.join(process.cwd(), "public", "uploads", session.user.id)
  await mkdir(dir, { recursive: true })
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${safeExt}`
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()))

  // 通过动态路由读取（Turbopack 生产模式不会服务运行时新增的 public 静态文件）
  return NextResponse.json({ ok: true, url: `/api/uploads/${session.user.id}/${filename}` })
}
