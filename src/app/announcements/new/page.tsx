"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import SendOutlined from "@ant-design/icons/SendOutlined"
import PushpinOutlined from "@ant-design/icons/PushpinOutlined"

export default function NewAnnouncementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) { router.replace("/welcome"); return }
  }, [status, session, router])

  // Check if user is committee member
  const isCommittee = (() => {
    if (!session?.user) return false
    if (session.user.role === "admin") return true
    const tags = session.user.tags || []
    const committeeTags = ["班长", "副班长", "团支书", "副团支书", "心理委员", "学习委员", "生活委员", "文体委员", "志愿队长", "组织委员", "宣传委员"]
    return committeeTags.some(t => tags.includes(t))
  })()

  useEffect(() => {
    if (status !== "loading" && !isCommittee) router.replace("/")
  }, [status, isCommittee, router])

  const handleSubmit = async () => {
    if (!title.trim()) { setError("请输入公告标题"); return }
    if (!content.trim()) { setError("请输入公告内容"); return }
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), pinned }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || "发布失败")
        setSaving(false)
        return
      }
      router.push("/")
      router.refresh()
    } catch {
      setError("发布失败，请重试")
      setSaving(false)
    }
  }

  if (status === "loading") return <p className="empty-state">加载中...</p>
  if (!isCommittee) return null

  // ===== 移动版（设计稿 announcement-new.html · 真实 API，≤640px 显示） =====
  const mobileView = (
    <div className="m-page-root">
      <style>{`
        @media (max-width: 640px) {
          .frm { padding: 18px 16px 0; }
          .frm-label { display: block; font-family: var(--font-mono); font-size: 9.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--color-muted); margin-bottom: 7px; }
          .form-input { width: 100%; height: 38px; padding: 0 12px; border: 1.5px solid #E3E7EB; border-radius: var(--radius); background: var(--color-surface); color: var(--color-fg); font-family: var(--font-ui); font-size: 14px; outline: none; transition: border-color .18s, box-shadow .18s; }
          .form-input:focus { border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-accent-glow); }
          .form-input::placeholder { color: var(--color-muted-light); }
          textarea.form-input { height: auto; min-height: 112px; padding: 10px 12px; resize: vertical; line-height: 1.6; }
          .frm-row { margin-bottom: 16px; }
          .frm-hint { font-family: var(--font-mono); font-size: 9px; color: var(--color-muted-light); margin-top: 6px; letter-spacing: .04em; }
          .frm-error { font-family: var(--font-mono); font-size: 10px; color: var(--color-danger); margin-bottom: 12px; }
          .pin-switch { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 13px 14px; }
          .pin-switch .txt { font-size: 13px; color: var(--color-fg-secondary); }
          .pin-switch .txt b { display: block; font-family: var(--font-display); font-size: 14px; color: var(--color-fg); font-weight: 700; }
          .pin-switch .txt small { display: block; font-family: var(--font-mono); font-size: 8.5px; color: var(--color-muted-light); margin-top: 2px; letter-spacing: .05em; }
          .pin-chip { flex: none; display: inline-flex; align-items: center; gap: 6px; padding: 6px 13px; border-radius: 999px; cursor: pointer; font-size: 11px; font-weight: 600; background: #F1F4F8; color: var(--color-muted); border: 1px solid var(--color-border); transition: background .18s, color .18s, border-color .18s; }
          .pin-chip .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-muted-light); transition: background .18s; }
          .pin-switch input { position: absolute; opacity: 0; pointer-events: none; }
          .pin-switch input:checked + .pin-chip { background: var(--color-warning-bg); color: var(--color-warning); border-color: rgba(217,160,61,.5); }
          .pin-switch input:checked + .pin-chip .dot { background: var(--color-warning); }
          .pub-bar { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(66px + env(safe-area-inset-bottom)); width: 100%; max-width: 480px; padding: 0 16px; z-index: 90; }
          .pub-bar .btn-primary { width: 100%; }
          .pub-bar .btn-primary svg { width: 14px; height: 14px; }
        }
      `}</style>

      <header className="m-topbar">
        <Link className="m-back" href="/announcements" aria-label="返回公告中心"><ArrowLeft size={18} /></Link>
        <span className="m-title">发布公告<small>NEW ANNOUNCEMENT</small></span>
      </header>

      <form className="frm" onSubmit={e => e.preventDefault()}>
        <div className="frm-row">
          <label className="frm-label" htmlFor="annTitle">公告标题</label>
          <input className="form-input" id="annTitle" type="text" placeholder="请输入公告标题" maxLength={40}
            value={title} onChange={e => setTitle(e.target.value)} />
          <div className="frm-hint">40 字以内 · 建议简明扼要</div>
        </div>

        <div className="frm-row">
          <label className="frm-label" htmlFor="annContent">公告内容</label>
          <textarea className="form-input" id="annContent" rows={4} placeholder="请输入公告正文内容…"
            value={content} onChange={e => setContent(e.target.value)} />
        </div>

        {error && <div className="frm-error">{error}</div>}

        <div className="frm-row">
          <span className="frm-label">公告设置</span>
          <label className="pin-switch">
            <span className="txt">
              <b>置顶公告</b>
              <small>置顶后显示在公告列表首位</small>
            </span>
            <input type="checkbox" id="annPin" checked={pinned} onChange={e => setPinned(e.target.checked)} />
            <span className="pin-chip"><span className="dot" />置顶</span>
          </label>
        </div>
      </form>

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        发布后将推送给全班同学<br /><b>CLASS ADMIN</b> · 班委权限
      </div>

      <div className="pub-bar">
        <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
          <Plus size={14} /> {saving ? "发布中..." : "发布"}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {mobileView}
    <div className="annn-desktop">
    <main className="m-main" style={{ width: "min(680px, calc(100vw - 56px))", margin: "0 auto", padding: "36px 0 80px" }}>
      <button className="btn-ghost" onClick={() => router.back()} style={{ marginBottom: 16 }}>
        ← 返回
      </button>

      <div className="card">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>发布公告</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: 4 }}>公告将显示在首页通知栏，所有同学可见</p>
          </div>
          <span className="tag tag-accent">班委功能</span>
        </div>

        {error && (
          <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        <div className="form-group">
          <label className="form-label">公告标题</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="如：关于期末考试安排的通知" autoFocus />
        </div>

        <div className="form-group">
          <label className="form-label">公告内容</label>
          <textarea className="form-input" value={content} onChange={e => setContent(e.target.value)}
            placeholder="输入公告正文，支持换行..." rows={8}
            style={{ minHeight: 180, lineHeight: 1.7, resize: "vertical" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <input type="checkbox" id="pinned" checked={pinned} onChange={e => setPinned(e.target.checked)}
            style={{ accentColor: "var(--color-accent)", width: 16, height: 16, cursor: "pointer" }} />
          <label htmlFor="pinned" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--color-fg-secondary)", cursor: "pointer", fontWeight: 500 }}>
            <PushpinOutlined style={{ color: "var(--color-warning)", fontSize: 14 }} />
            置顶此公告
          </label>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            <SendOutlined /> {saving ? "发布中..." : "发布公告"}
          </button>
          <button className="btn-ghost" onClick={() => router.back()}>取消</button>
        </div>
      </div>
    </main>
    </div>
    </>
  )
}
