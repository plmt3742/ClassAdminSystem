"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"

interface Announcement {
  id: string; title: string; content: string; pinned: boolean
  authorId: string; authorName: string; createdAt: string; updatedAt: string
}

/** Format an ISO timestamp as MM-DD (timeline meta). */
const mmdd = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** 公告中心（设计稿 announcements.html · 纯移动页，桌面隐藏）。
    API 已按「置顶 + 时间」排序（/api/announcements），
    第一条即置顶头条（有置顶时），其余进入次级列表。 */
export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/announcements")
      .then(r => r.json())
      .then(d => setAnnouncements(d.announcements || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  const featured = announcements[0]
  const rest = announcements.slice(1)

  return (
    <div className="m-page-root">
      <style>{`
        @media (max-width: 640px) {
          .ann-panel { margin-top: 14px; }
          .m-mini .author { font-family: var(--font-mono); font-size: 8.5px; color: var(--color-muted-light); letter-spacing: .05em; flex: none; }
          .ann-head-actions { display: flex; align-items: center; }
          .ann-pub-btn { min-height: 30px; padding: 4px 12px; font-size: 12px; border: 1px solid var(--color-border); color: var(--color-accent); border-radius: 999px; gap: 4px; }
          .ann-pub-btn svg { width: 13px; height: 13px; }
        }
      `}</style>

      <header className="m-topbar">
        <Link className="m-back" href="/modules" aria-label="返回模块"><ArrowLeft size={18} /></Link>
        <span className="m-title">公告中心<small>ANNOUNCEMENTS</small></span>
        <span className="m-year">{announcements.length} 条</span>
      </header>

      <section className="m-pad">
        <div className="m-section-head" style={{ paddingTop: 16 }}>
          <span className="m-eyebrow">公告 · Announcements</span>
          <span className="ann-head-actions">
            <Link className="btn-ghost ann-pub-btn" href="/announcements/new">
              <Plus size={13} /> 发布
            </Link>
          </span>
        </div>

        <div className="m-panel ann-panel">
          {featured && (
            <Link className="m-feature" href={`/announcements/${featured.id}`}>
              <span className="kicker">
                {featured.pinned && <span className="pin">置顶</span>}
                {featured.authorName} · {mmdd(featured.createdAt)}
              </span>
              <span className="title">{featured.title}</span>
              <span className="meta">
                <span>{featured.authorName}</span>
                <span>{mmdd(featured.createdAt)} · 全班</span>
              </span>
            </Link>
          )}
          {rest.map(a => (
            <Link key={a.id} className="m-mini" href={`/announcements/${a.id}`}>
              <span className="date">{mmdd(a.createdAt)}</span>
              <span className="title">{a.title}</span>
              <span className="author">{a.authorName}</span>
            </Link>
          ))}
          {announcements.length === 0 && (
            <div className="m-mini"><span className="title">暂无公告</span></div>
          )}
        </div>
      </section>

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        班级事务 · 一体化管理平台<br /><b>CLASS ADMIN</b> · 数据每日 23:00 同步
      </div>
    </div>
  )
}
