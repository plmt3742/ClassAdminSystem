"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Images,
  Megaphone,
  School,
  Undo2,
  UserCog,
  Users,
} from "lucide-react"
import MobTopBar from "./_components/MobTopBar"
import MobCard from "./_components/MobCard"
import MobChip from "./_components/MobChip"
import MobAvatar from "./_components/MobAvatar"
import MobScoreRing from "./_components/MobScoreRing"
import MobListItem from "./_components/MobListItem"
import MobEmpty from "./_components/MobEmpty"
import MobLoading from "./_components/MobLoading"
import MobButton from "./_components/MobButton"
import MobRoleGate from "./_components/MobRoleGate"

const COMMITTEE_TAGS = ["班长", "副班长", "团支书", "副团支书", "心理委员", "学习委员", "生活委员", "文体委员", "志愿队长", "组织委员", "宣传委员"]
const roleLabel: Record<string, string> = { admin: "管理员", class_leader: "班干部", student: "同学", guest: "游客" }

interface Announcement { id: string; title: string; pinned: boolean; authorName: string; createdAt: string }
interface OnlinePoint { hour: string; count: number }
interface ZongceSection { section: string; label: string; status: string }
interface PendingReview { id: string; section: string; sectionLabel: string; userName: string; submittedAt: string }
interface DashboardData { sScore: number; mScore: number; totalScore: number; sections: ZongceSection[]; pendingReviews: PendingReview[] }

/** Format an ISO timestamp as MM-DD. */
const mmdd = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function MobileHomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const [onlineCount, setOnlineCount] = useState(0)
  const [onlineHistory, setOnlineHistory] = useState<OnlinePoint[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])

  const [switchingBack, setSwitchingBack] = useState(false)

  // 数据加载：公告 + 综测面板（各自 catch，Promise.all 汇总）
  useEffect(() => {
    if (!session) return
    Promise.all([
      fetch("/api/announcements")
        .then(r => r.json())
        .then((d: { announcements?: Announcement[] }) => setAnnouncements(d.announcements || []))
        .catch(() => {}),
      fetch("/api/zongce/dashboard")
        .then(r => r.json())
        .then((d: DashboardData) => setDashboard(d))
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [session])

  // 心跳：POST 上报 + GET 拉取在线人数/24h 曲线，每 60s 一次，卸载时清理
  useEffect(() => {
    if (!session) return
    const beat = () => {
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id, userName: session.user.name ?? "" }),
      }).catch(() => {})
      fetch("/api/heartbeat")
        .then(r => r.json())
        .then((d: { online?: number; history?: OnlinePoint[]; users?: { userName: string }[] }) => {
          setOnlineCount(d.online ?? 0)
          setOnlineHistory(d.history || [])
          setOnlineUsers((d.users || []).map(u => u.userName))
        })
        .catch(() => {})
    }
    beat()
    const t = setInterval(beat, 60000)
    return () => clearInterval(t)
  }, [session])

  // 切回管理员视角（复用 Navbar 的 impersonate back 逻辑）
  const handleBack = async () => {
    if (switchingBack) return
    setSwitchingBack(true)
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ back: true }),
      })
      if (res.ok) window.location.href = "/m"
      else setSwitchingBack(false)
    } catch {
      setSwitchingBack(false)
    }
  }

  if (status === "loading" || !session) return null

  const user = session.user
  const tags = user.tags || []
  const impersonator = user.impersonator
  const isGuest = user.role === "guest"

  // 待办：未填写 + 草稿 + 待审核（按板块聚合）
  const sections = dashboard?.sections || []
  const pendingReviews = dashboard?.pendingReviews || []
  type TodoItem = { key: string; title: string; icon: React.ReactNode; chip: React.ReactNode; href: string }
  const todos: TodoItem[] = []
  for (const s of sections) {
    if (s.status === "not_started") {
      todos.push({ key: `u-${s.section}`, title: s.label, icon: <ClipboardCheck size={20} style={{ color: "var(--danger)" }} />, chip: <MobChip tone="danger">未填写</MobChip>, href: `/m/zongce/section/${s.section}` })
    } else if (s.status === "draft") {
      todos.push({ key: `d-${s.section}`, title: s.label, icon: <FileText size={20} style={{ color: "var(--warn)" }} />, chip: <MobChip tone="warn">草稿</MobChip>, href: `/m/zongce/section/${s.section}` })
    }
  }
  const reviewGroups: { section: string; label: string; count: number }[] = []
  for (const r of pendingReviews) {
    const g = reviewGroups.find(x => x.section === r.section)
    if (g) g.count++
    else reviewGroups.push({ section: r.section, label: r.sectionLabel, count: 1 })
  }
  for (const g of reviewGroups) {
    todos.push({ key: `r-${g.section}`, title: g.label, icon: <ClipboardList size={20} style={{ color: "var(--warn)" }} />, chip: <MobChip tone="warn">{g.count} 待审</MobChip>, href: "/m/zongce/review" })
  }

  // 在线柱状图：24 根 div，当前高亮
  const maxCount = Math.max(...onlineHistory.map(h => h.count), 1)

  // 快捷入口（核心四模块）
  const tiles: { icon: typeof ClipboardCheck; label: string; href: string }[] = [
    { icon: ClipboardCheck, label: "综测", href: "/m/zongce" },
    { icon: CalendarDays, label: "活动", href: "/m/activities" },
    { icon: Megaphone, label: "公告", href: "/m/announcements" },
    { icon: Users, label: "成员", href: "/m/members" },
  ]

  const tileStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    color: "inherit",
  }

  return (
    <div className="mob-page">
      <MobTopBar title="班务管理" icon={<School size={17} />} />

      {/* 切换视角横幅 */}
      {impersonator && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-card)", padding: "10px 12px", boxShadow: "var(--shadow-card)" }}>
          <UserCog size={18} style={{ color: "var(--warn)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5 }}>
            正在以 <b style={{ color: "var(--fg)" }}>{user.name}</b>（{user.studentId || "—"}）的身份操作
          </div>
          <MobButton size="sm" variant="soft" loading={switchingBack} onClick={handleBack}>
            <Undo2 size={14} /> 返回管理员
          </MobButton>
        </div>
      )}

      {/* 身份卡：头像 + 问候 + 学号 + 角色/标签 */}
      <MobCard>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <MobAvatar name={user.name || "?"} src={user.image || undefined} size="lg" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--fg)" }}>你好，{user.name}</div>
            <div style={{ fontFamily: "var(--font-num)", fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{isGuest ? "演示账号 · 游客模式" : `学号 ${user.studentId || "—"}`}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          <MobChip tone="info">{roleLabel[user.role || "student"]}</MobChip>
          {tags.map(t => <MobChip key={t} tone="neutral">{t}</MobChip>)}
        </div>
      </MobCard>

      {/* 快捷入口（核心四模块） */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px 8px" }}>
        {tiles.map(t => (
          <Link key={t.href} href={t.href} style={tileStyle}>
            <span style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary-soft)", color: "var(--primary)" }}>
              <t.icon size={22} strokeWidth={1.8} />
            </span>
            <span style={{ fontSize: 12, color: "var(--fg-2)" }}>{t.label}</span>
          </Link>
        ))}
      </div>

      {/* 在线统计 */}
      <MobCard
        title="在线"
        extra={<span key={onlineCount} className="mob-num-pop" style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 24, padding: "0 10px", borderRadius: 999, background: "rgba(62,142,99,0.13)", color: "var(--ok)", fontSize: 12, fontWeight: 600, lineHeight: 1 }}>{onlineCount} 人在线</span>}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {onlineUsers.length > 0 ? (
            onlineUsers.slice(0, 12).map((n, i) => (
              <span key={n} className="mob-rise-chip" style={{ animationDelay: `${i * 30}ms` }}>
                <MobChip tone="neutral">{n}</MobChip>
              </span>
            ))
          ) : (
            <span style={{ fontSize: 13, color: "var(--fg-3)" }}>暂无人在线</span>
          )}
          {onlineUsers.length > 12 && <MobChip tone="neutral">+{onlineUsers.length - 12}</MobChip>}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 52 }}>
          {onlineHistory.map((h, i) => {
            const isNow = i === onlineHistory.length - 1
            const hPx = Math.max(3, Math.round((h.count / maxCount) * 48))
            return (
              <div
                key={i}
                className="mob-bar mob-bar--grow"
                style={{
                  flex: 1,
                  height: hPx,
                  borderRadius: 2,
                  background: "var(--primary)",
                  opacity: isNow ? 1 : 0.3 + (i / Math.max(onlineHistory.length - 1, 1)) * 0.45,
                  animationDelay: `${i * 22}ms`,
                }}
              />
            )
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>
          <span>-24h</span>
          <span>现在</span>
        </div>
      </MobCard>

      {/* 数据依赖区块：加载中显示骨架屏 */}
      {loading ? (
        <MobLoading rows={5} />
      ) : (
        <>
          {dashboard && (
            <MobCard title="综测成绩" extra={<ChevronRight size={18} style={{ color: "var(--fg-3)" }} />} onClick={() => router.push("/m/zongce")}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--fg-3)" }}>综测总分</div>
                <div key={dashboard.totalScore.toFixed(1)} className="mob-num-pop" style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700, color: "var(--fg)", lineHeight: 1.2 }}>
                  {dashboard.totalScore.toFixed(1)}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <MobScoreRing value={dashboard.sScore} max={130} label="S 学业" tone="s" />
                <MobScoreRing value={dashboard.mScore} max={30} label="M 品德" tone="m" />
                <MobScoreRing value={dashboard.totalScore} max={160} label="T 总分" tone="t" />
              </div>
            </MobCard>
          )}

          {dashboard && (
            <MobCard title="待办" extra={todos.length > 0 ? <span style={{ fontSize: 13, color: "var(--fg-3)" }}>{todos.length} 项</span> : undefined} padding={false}>
              {todos.length === 0 ? (
                <MobEmpty icon={<ClipboardCheck size={28} />} title="暂无待办" desc="综测板块均已填写完毕" />
              ) : (
                todos.map(t => (
                  <MobListItem key={t.key} icon={t.icon} title={t.title} right={t.chip} chevron onClick={() => router.push(t.href)} />
                ))
              )}
            </MobCard>
          )}

          {announcements.length > 0 && (
            <MobCard title="公告" extra={<Link href="/m/announcements" style={{ fontSize: 13, color: "var(--primary)" }}>全部</Link>} padding={false}>
              {announcements.slice(0, 4).map(a => (
                <MobListItem
                  key={a.id}
                  title={a.title}
                  subtitle={mmdd(a.createdAt)}
                  right={a.pinned ? <MobChip tone="info">置顶</MobChip> : undefined}
                  chevron
                  onClick={() => router.push(`/m/announcements/${a.id}`)}
                />
              ))}
            </MobCard>
          )}
        </>
      )}

      {/* 底部版权 */}
      <div style={{ textAlign: "center", padding: "20px 16px 8px", fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.04em" }}>
        工业软件二班 · 数据每日 23:00 同步
      </div>
    </div>
  )
}
