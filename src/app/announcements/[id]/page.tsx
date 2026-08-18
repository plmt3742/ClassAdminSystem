"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import EditOutlined from "@ant-design/icons/EditOutlined"
import DeleteOutlined from "@ant-design/icons/DeleteOutlined"
import PushpinOutlined from "@ant-design/icons/PushpinOutlined"

interface Announcement {
  id: string; title: string; content: string; pinned: boolean
  authorId: string; authorName: string; createdAt: string; updatedAt: string
}

const SERIF = "Georgia, 'Songti SC', 'SimSun', serif"
const MONO = "'JetBrains Mono', 'Cascadia Mono', Consolas, monospace"

export default function AnnouncementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const id = params.id as string
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editPinned, setEditPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const fetchAnnouncement = useCallback(async () => {
    try {
      const res = await fetch(`/api/announcements/${id}`)
      if (res.ok) {
        const d = await res.json()
        setAnnouncement(d.announcement)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAnnouncement() }, [fetchAnnouncement])

  const isAuthor = session?.user?.id === announcement?.authorId
  const isAdmin = session?.user?.role === "admin"
  const canEdit = isAuthor || isAdmin

  const startEdit = () => {
    if (!announcement) return
    setEditTitle(announcement.title)
    setEditContent(announcement.content)
    setEditPinned(announcement.pinned)
    setEditing(true)
    setError("")
  }

  const handleSave = async () => {
    if (!editTitle.trim()) { setError("请输入标题"); return }
    if (!editContent.trim()) { setError("请输入内容"); return }
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim(), pinned: editPinned }),
      })
      if (!res.ok) { setError("保存失败"); setSaving(false); return }
      const d = await res.json()
      setAnnouncement(d.announcement)
      setEditing(false)
    } catch { setError("保存失败") }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm("确定删除此公告？此操作不可撤销。")) return
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" })
      if (res.ok) { router.push("/"); router.refresh() }
    } catch { /* ignore */ }
  }

  if (loading) return <p className="empty-state">加载中...</p>
  if (!announcement) return <p className="empty-state">公告不存在</p>

  const formattedDate = new Date(announcement.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  })

  const mmdd = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ""
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }

  // ===== 移动版（设计稿 announcement-detail.html · 真实数据，≤640px 显示） =====
  const mobileView = (
    <div className="m-page-root">
      <style>{`
        @media (max-width: 640px) {
          .dt-head { padding: 22px 16px 0; }
          .dt-kicker { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 9px; color: var(--color-warning); letter-spacing: .1em; }
          .dt-kicker .pin { border: 1px solid rgba(217,160,61,.5); padding: 0 5px; border-radius: 3px; }
          .dt-title { font-family: var(--font-display); font-size: 19px; font-weight: 700; line-height: 1.5; color: var(--color-fg); margin-top: 9px; }
          .dt-meta { font-family: var(--font-mono); font-size: 9.5px; color: var(--color-muted-light); margin-top: 10px; display: flex; gap: 14px; flex-wrap: wrap; padding-bottom: 16px; border-bottom: 1px solid var(--color-border); }
          .dt-body { padding: 18px 16px 0; }
          .dt-body p { font-size: 13.5px; color: var(--color-fg-secondary); line-height: 1.85; margin-bottom: 13px; text-align: justify; }
          .dt-back { padding: 22px 16px 0; display: flex; justify-content: center; }
          .dt-back-link { font-size: 12px; color: var(--color-accent); padding: 8px 16px; border-radius: var(--radius); display: inline-flex; align-items: center; gap: 5px; }
          .dt-back-link svg { width: 13px; height: 13px; }
          .dt-back-link:active { background: var(--color-accent-subtle); }
        }
      `}</style>

      <header className="m-topbar">
        <Link className="m-back" href="/announcements" aria-label="返回公告中心"><ArrowLeft size={18} /></Link>
        <span className="m-title">公告详情<small>ANNOUNCEMENT</small></span>
      </header>

      <div className="dt-head">
        <span className="dt-kicker">
          {announcement.pinned && <span className="pin">置顶</span>}
          通知 · NOTICE
        </span>
        <h1 className="dt-title">{announcement.title}</h1>
        <div className="dt-meta">
          <span>{announcement.authorName}</span>
          <span>{mmdd(announcement.createdAt)}</span>
          <span>全班</span>
        </div>
      </div>

      <div className="dt-body">
        <p style={{ whiteSpace: "pre-wrap" }}>{announcement.content}</p>
      </div>

      <div className="dt-back">
        <Link className="dt-back-link" href="/announcements">
          <ArrowLeft size={13} /> 返回公告列表
        </Link>
      </div>

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        班级事务 · 一体化管理平台<br /><b>CLASS ADMIN</b> · 数据每日 23:00 同步
      </div>
    </div>
  )

  return (
    <>
      {mobileView}
    <div className="annd-desktop">
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F7FA" }}>
      {/* scoped hover rules (no globals.css changes) */}
      <style>{`
        .ann-back-btn:hover { color: #3B6B8A !important; }
        .ann-back-btn:hover svg { stroke: #3B6B8A; }
        .ann-action .btn-ghost { border-color: #E0E5EC; background: transparent; }
        .ann-action .btn-ghost:hover { background: #EBEFF5; color: #3B6B8A !important; }
        .ann-action .ann-del { color: #C4615A !important; border-color: rgba(196,97,90,.35); }
        .ann-action .ann-del:hover { background: #FEF2F2; color: #C4615A !important; }
      `}</style>

      <main className="m-main" style={{ width: "min(680px, calc(100vw - 56px))", margin: "0 auto", padding: "48px 0 80px" }}>
        {/* ── back nav · editorial mono row ── */}
        <button
          className="ann-back-btn"
          onClick={() => router.push("/")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "transparent", border: "none", cursor: "pointer", padding: "4px 0",
            fontFamily: MONO, fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase",
            color: "#8A93A0", transition: "color .2s", marginBottom: 48,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke .2s" }}>
            <path d="M11 6H2.5M6 2 2.5 6 6 10" />
          </svg>
          返回 · BACK
        </button>

        {editing ? (
          /* ── Edit mode ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 8 }}>
            <div>
              <label className="form-label"
                style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#8A93A0", fontWeight: 600, marginBottom: 8 }}>
                标题
              </label>
              <input className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="form-label"
                style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#8A93A0", fontWeight: 600, marginBottom: 8 }}>
                内容
              </label>
              <textarea className="form-input" value={editContent} onChange={e => setEditContent(e.target.value)}
                rows={6} style={{ minHeight: 160, lineHeight: 1.7, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="editPinned" checked={editPinned} onChange={e => setEditPinned(e.target.checked)}
                style={{ accentColor: "#D9A03D", width: 16, height: 16 }} />
              <label htmlFor="editPinned" style={{ fontSize: "0.85rem", color: "#4A5463", cursor: "pointer" }}>
                <PushpinOutlined style={{ color: "#D9A03D", fontSize: 14, marginRight: 4 }} />
                置顶
              </label>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存"}</button>
              <button className="btn-ghost" onClick={() => setEditing(false)}>取消</button>
            </div>
          </div>
        ) : (
          /* ── View mode · editorial article, no card ── */
          <>
            {announcement.pinned && (
              <div style={{ marginBottom: 18 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontFamily: MONO, fontSize: 8.5, letterSpacing: ".1em",
                  color: "#D9A03D", border: "1px solid rgba(217,160,61,.5)",
                  borderRadius: 3, padding: "1px 6px",
                }}>
                  <PushpinOutlined style={{ fontSize: 10 }} /> 置顶
                </span>
              </div>
            )}

            <h2 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, letterSpacing: ".01em", color: "#1A1D22", marginBottom: 14, lineHeight: 1.35 }}>
              {announcement.title}
            </h2>

            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 18 }}>
              <span style={{ fontFamily: SERIF, fontSize: 13, color: "#3B6B8A" }}>{announcement.authorName}</span>
              <span style={{ color: "#B6BDC8", fontSize: 11 }}>·</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#8A93A0", letterSpacing: ".04em" }}>{formattedDate}</span>
            </div>

            <div style={{ height: 1, backgroundColor: "#E0E5EC", marginBottom: 40 }} />

            <div style={{
              fontFamily: SERIF, fontSize: 15, lineHeight: 2.0, color: "#4A5463",
              whiteSpace: "pre-wrap", maxWidth: "60ch",
              borderLeft: "2px solid #E0E5EC", paddingLeft: 24,
            }}>
              {announcement.content}
            </div>

            {canEdit && (
              <div className="ann-action" style={{ display: "flex", gap: 10, marginTop: 48, paddingTop: 18, borderTop: "1px solid #E0E5EC" }}>
                <button className="btn-ghost btn-sm" onClick={startEdit}>
                  <EditOutlined /> 编辑
                </button>
                <button className="btn-ghost btn-sm ann-del" onClick={handleDelete}>
                  <DeleteOutlined /> 删除
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
    </div>
    </>
  )
}
