import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { guestOnline } from "@/lib/guest-data"

// In-memory session store (ephemeral, resets on server restart)
type SessionRecord = { userId: string; userName: string; lastSeen: number }
const sessions = new Map<string, SessionRecord>()

// History: each hour stores max concurrent users in that hour
// Key: "YYYY-MM-DD-HH", Value: { count: number }
const hourlyHistory = new Map<string, number>()

// Cleanup stale sessions (older than 5 min) and aggregate history
function cleanupAndSnapshot() {
  const now = Date.now()
  const fiveMinAgo = now - 5 * 60 * 1000

  // Remove stale
  for (const [key, s] of sessions) {
    if (s.lastSeen < fiveMinAgo) sessions.delete(key)
  }

  // Snapshot current count to history for this hour
  const hourKey = new Date(now).toISOString().slice(0, 13) // "2026-06-28T14"
  const current = hourlyHistory.get(hourKey) || 0
  hourlyHistory.set(hourKey, Math.max(current, sessions.size))
}

// Run cleanup every 60s
if (typeof setInterval !== "undefined") {
  setInterval(cleanupAndSnapshot, 60000)
}

export async function POST(req: Request) {
  try {
    const { userId, userName } = await req.json()
    if (!userId) return NextResponse.json({ error: "no userId" }, { status: 400 })

    // 游客心跳不上报（避免污染在线统计）
    const session = await auth()
    if (session?.user?.role === "guest") {
      return NextResponse.json({ ok: true, online: sessions.size })
    }

    sessions.set(userId, { userId, userName: userName || "", lastSeen: Date.now() })
    cleanupAndSnapshot()

    return NextResponse.json({ ok: true, online: sessions.size })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET() {
  // 游客模式：返回演示在线数据
  const session = await auth()
  if (session?.user?.role === "guest") {
    return NextResponse.json(guestOnline())
  }

  cleanupAndSnapshot()

  const now = Date.now()
  // Build 24h history array
  const history: { hour: string; count: number }[] = []
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now - i * 3600000)
    const key = d.toISOString().slice(0, 13)
    history.push({ hour: `${d.getHours()}时`, count: hourlyHistory.get(key) || 0 })
  }

  return NextResponse.json({ online: sessions.size, history, users: [...sessions.values()].map(s => ({ userName: s.userName })) })
}
