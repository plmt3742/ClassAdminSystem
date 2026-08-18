"use client"

import { useCallback, useEffect, useState, type CSSProperties } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Check, Download, RefreshCw, Send, UserPlus, X, Trash2, Clock, MapPin, Mail, ExternalLink } from "lucide-react"
import Link from "next/link"
import { toPng } from "html-to-image"

type DrawItem = {
  id: string; userId: string; studentId: string; round: number; status: string
  delegateTo: string | null; delegateApproved: boolean
  user: { id: string; name: string; studentId: string }
  delegate: { id: string; name: string; studentId: string } | null
}
type VolunteerItem = { id: string; userId: string; studentId: string; user: { id: string; name: string; studentId: string } }
type ActivityDetail = {
  id: string; title: string; description?: string; status: string; createdAt: string
  eventTime?: string; location?: string; link?: string
  draws: DrawItem[]; volunteers: VolunteerItem[]
}

export default function ActivityDetailPage() {
  const params = useParams(); const { data: session } = useSession()
  const id = params.id as string; const isAdmin = session?.user?.role === "admin"
  const isGuest = session?.user?.role === "guest"
  const [activity, setActivity] = useState<ActivityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawCount, setDrawCount] = useState(1); const [drawing, setDrawing] = useState(false)
  const [delegating, setDelegating] = useState<string | null>(null)
  const [searchQ, setSearchQ] = useState("")
  const [searchRes, setSearchRes] = useState<{ id: string; name: string; studentId: string }[]>([])
  const [showAssign, setShowAssign] = useState(false)
  const [allStudents, setAllStudents] = useState<{ id: string; name: string; studentId: string }[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [assignSource, setAssignSource] = useState<"assigned" | "volunteered">("assigned")
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editTime, setEditTime] = useState("")
  const [editLoc, setEditLoc] = useState("")
  const [editLink, setEditLink] = useState("")
  const [currentRound, setCurrentRound] = useState(1)
  const [remainingCount, setRemainingCount] = useState(0)

  const fetchActivity = useCallback(async () => {
    const res = await fetch(`/api/activities/${id}`)
    if (res.ok) setActivity((await res.json()).activity)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchActivity() }, [fetchActivity])

  // 本轮次信息（移动版"本轮参与 / 剩余未参与"）
  useEffect(() => {
    fetch("/api/global-round").then(r => r.json()).then(d => {
      setCurrentRound(d.currentRound || 1)
      setRemainingCount(d.remaining?.length || 0)
    }).catch(() => {})
  }, [])

  const handleDraw = async () => {
    setDrawing(true)
    const res = await fetch(`/api/activities/${id}/draw`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: drawCount }) })
    const d = await res.json()
    if (d.roundAdvanced) alert(d.message)
    setDrawing(false); fetchActivity()
  }
  const handleComplete = async () => { await fetch(`/api/activities/${id}/complete`, { method: "POST" }); fetchActivity() }
  const handleCancel = async () => {
    if (!confirm("确定取消此活动？")) return
    await fetch(`/api/activities/${id}/cancel`, { method: "POST" }); fetchActivity()
  }
  const handleResume = async () => {
    if (!confirm("确定重新继续此活动？已完成的抽签将恢复为进行中。")) return
    await fetch(`/api/activities/${id}/resume`, { method: "POST" }); fetchActivity()
  }
  const handleVolunteer = async () => { await fetch(`/api/activities/${id}/volunteer`, { method: "POST" }); fetchActivity() }
  const handleDeleteDraw = async (drawId: string) => {
    if (!confirm("确定删除此抽签记录？")) return
    await fetch(`/api/draws/${drawId}/delete`, { method: "DELETE" }); fetchActivity()
  }
  const handleDrawStatus = async (drawId: string, label: string) => {
    await fetch(`/api/draws/${drawId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) })
    fetchActivity()
  }

  const drawLabel = (d: DrawItem) => {
    if (d.status === "delegated") return d.delegateApproved ? "已转交" : "委托中"
    if (d.status === "completed") return "已完成"
    if (d.status === "cancelled") return "已取消"
    if ((d as any).source === "volunteered") return "报名"
    if ((d as any).source === "assigned") return "指定参与"
    return "抽签"
  }
  const handleApprove = async (drawId: string, approve: boolean) => {
    await fetch(`/api/activities/${id}/delegate`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ drawId, approve }) })
    fetchActivity()
  }
  const handleSearch = async (q: string) => {
    setSearchQ(q)
    if (q.length < 1) { setSearchRes([]); return }
    const res = await fetch(`/api/search-students?q=${encodeURIComponent(q)}`)
    if (res.ok) setSearchRes((await res.json()).students || [])
  }
  const handleDelegate = async (drawId: string, targetUserId: string) => {
    await fetch(`/api/activities/${id}/delegate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ drawId, targetUserId }) })
    setDelegating(null); setSearchQ(""); setSearchRes([]); fetchActivity()
  }
  const handleAssign = async () => {
    if (selectedIds.size === 0) return
    await fetch(`/api/activities/${id}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: [...selectedIds], source: assignSource }) })
    setShowAssign(false); setSelectedIds(new Set()); fetchActivity()
  }
  const loadStudents = async () => {
    if (allStudents.length === 0) {
      const res = await fetch("/api/members")
      if (res.ok) setAllStudents((await res.json()).members || [])
    }
    setShowAssign(!showAssign)
  }

  const startEdit = () => {
    if (!activity) return
    setEditTitle(activity.title)
    setEditDesc(activity.description || "")
    setEditTime(activity.eventTime || "")
    setEditLoc(activity.location || "")
    setEditLink(activity.link || "")
    setEditing(true)
  }

  const handleEdit = async () => {
    if (!editTitle.trim()) return
    await fetch(`/api/activities/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: editTitle, description: editDesc, eventTime: editTime, location: editLoc, link: editLink }) })
    setEditing(false); fetchActivity()
  }

  const handleExport = async () => {
    if (!activity) return
    const draws = activity.draws.filter(d => d.status !== "cancelled")
    const now = new Date().toLocaleString("zh-CN")

    const el = document.createElement("div")
    el.innerHTML = `<div style="font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif;background:#F7F8FA;padding:36px 48px;display:flex;justify-content:center"><div style="background:#fff;width:520px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06)">
<div style="background:#166534;padding:32px 36px;color:#fff">
<div style="display:inline-block;padding:2px 10px;border-radius:6px;font-size:11px;font-weight:600;background:rgba(255,255,255,0.18);margin-bottom:10px">${activity.status === "completed" ? "已完成" : activity.status === "cancelled" ? "已取消" : activity.status === "drawn" ? "进行中" : "待开始"}</div>
<h1 style="font-size:22px;font-weight:800;margin:0;letter-spacing:-0.01em">${activity.title}</h1></div>
<div style="padding:28px 36px">
${activity.description ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:14px;color:#475569"><span style="color:#94A3B8;font-size:12px;font-weight:600;width:56px;flex-shrink:0">简介</span><span style="color:#1E293B;font-weight:500">${activity.description}</span></div>` : ""}
${activity.eventTime ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:14px;color:#475569"><span style="color:#94A3B8;font-size:12px;font-weight:600;width:56px;flex-shrink:0">时间</span><span style="color:#1E293B;font-weight:500">${activity.eventTime}</span></div>` : ""}
${activity.location ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:14px;color:#475569"><span style="color:#94A3B8;font-size:12px;font-weight:600;width:56px;flex-shrink:0">地点</span><span style="color:#1E293B;font-weight:500">${activity.location}</span></div>` : ""}
${activity.link ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:14px;color:#475569"><span style="color:#94A3B8;font-size:12px;font-weight:600;width:56px;flex-shrink:0">链接</span><span style="color:#166534;font-weight:500">${activity.link}</span></div>` : ""}
<div style="display:flex;align-items:center;justify-content:space-between;margin:24px 0 12px"><span style="font-size:15px;font-weight:700;color:#1E293B">参与名单</span><span style="font-size:12px;color:#94A3B8">共 ${draws.length} 人</span></div>
${draws.length === 0 ? '<div style="text-align:center;padding:24px;color:#94A3B8;font-size:13px">暂无参与记录</div>' : draws.map(d => {
  const eff = d.delegateApproved && d.delegate ? d.delegate : d.user
  const tagClass = (d as any).source === "volunteered" ? "tag-volunteer" : (d as any).source === "assigned" ? "tag-assigned" : "tag-draw"
  const tagText = (d as any).source === "volunteered" ? "自行报名" : (d as any).source === "assigned" ? "指定参与" : "抽签"
  return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:13px"><div style="width:32px;height:32px;border-radius:50%;background:#ECFDF5;color:#166534;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">${eff.name[0]}</div><div><div style="font-weight:600;color:#1E293B">${eff.name}${d.delegateApproved && d.delegate ? ' <span style="font-weight:400;color:#94A3B8;font-size:11px">(由 '+d.user.name+' 转交)</span>' : ''}</div><div style="color:#94A3B8;font-size:11px">${eff.studentId}</div></div><div style="display:inline-block;padding:2px 8px;border-radius:100px;font-size:10px;font-weight:600;margin-left:auto;flex-shrink:0;background:${(d as any).source==="volunteered"?'#ECFDF5':(d as any).source==="assigned"?'#FFFBEB':'#ECFDF5'};color:${(d as any).source==="volunteered"?'#059669':(d as any).source==="assigned"?'#D97706':'#166534'}">${tagText}</div></div>`
}).join("")}</div>
<div style="padding:16px 36px;border-top:1px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#CBD5E1"><span>班务管理系统</span><span>导出时间: ${now}</span></div></div></div>`
    el.style.position = "fixed"; el.style.left = "-9999px"; el.style.top = "-9999px"
    el.style.width = "620px"
    document.body.appendChild(el)
    await new Promise(r => requestAnimationFrame(r))

    try {
      const dataUrl = await toPng(el.firstElementChild as HTMLElement, { pixelRatio: 2 })
      const a = document.createElement("a")
      a.download = `${activity.title}.png`
      a.href = dataUrl; a.click()
    } finally { document.body.removeChild(el) }
  }

  if (loading) return <p className="empty-state">加载中...</p>
  if (!activity) return <p className="empty-state">活动不存在</p>

  const draws = activity.draws; const isActive = activity.status === "pending" || activity.status === "drawn"
  const myPending = draws.filter(d => d.delegateTo === session?.user?.id && d.status === "delegated" && !d.delegateApproved)

  // ===== 移动版（设计稿 activity-detail.html · 真实数据，≤640px 显示） =====
  const participants = (isActive ? draws.filter(d => d.round === currentRound && d.status !== "cancelled") : draws.filter(d => d.status !== "cancelled"))
    .map(d => d.delegateApproved && d.delegate ? d.delegate : d.user)
  const myDraw = draws.find(d => d.userId === session?.user?.id && d.status === "drawn" && isActive)
  const dmCell: CSSProperties = { display: "flex", alignItems: "center", gap: 9, background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "9px 11px", minWidth: 0 }
  const dmK: CSSProperties = { display: "block", fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: ".14em", color: "var(--color-muted-light)", textTransform: "uppercase" }
  const dmV: CSSProperties = { display: "block", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--color-fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
  const mBtnGhost: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "6px 11px", borderRadius: 6, fontSize: 12, cursor: "pointer", background: "transparent", color: "var(--color-fg-secondary)", border: "1px solid var(--color-border)" }
  const mBtnPrimary: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "6px 13px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "var(--color-accent)", color: "#fff", border: "none" }
  const admBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--color-accent)", background: "var(--color-accent-subtle)", border: "1px solid var(--color-border-strong)", borderRadius: 6, padding: "9px 13px", cursor: "pointer" }

  const mobileView = (
    <div className="m-page-root">
      <header className="m-topbar">
        <Link className="m-back" href="/activities" aria-label="返回活动列表"><ArrowLeft size={18} /></Link>
        <span className="m-title">{activity.title}<small>ACTIVITY DETAIL</small></span>
        <span className="m-year">2025-2026</span>
      </header>

      {/* 活动信息卡 */}
      <section className="m-pad fx-item" style={{ paddingTop: 16 }}>
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "16px 16px 15px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
            <span className="m-eyebrow">活动详情 · Activity</span>
            <span className={`chip ${isActive ? "ok" : activity.status === "completed" ? "ok" : "none"}`}><span className="lamp" />{isActive ? "进行中" : activity.status === "completed" ? "已完成" : "已取消"}</span>
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--color-fg)", lineHeight: 1.35, margin: 0 }}>{activity.title}</h2>
          {activity.description && <p style={{ fontSize: 12.5, color: "var(--color-fg-secondary)", lineHeight: 1.7, marginTop: 10, whiteSpace: "pre-wrap" }}>{activity.description}</p>}
          {(activity.eventTime || activity.location) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 14 }}>
              {activity.eventTime && (
                <div style={dmCell}>
                  <Clock size={15} strokeWidth={1.8} style={{ color: "var(--color-accent)", flex: "none" }} />
                  <div style={{ minWidth: 0 }}>
                    <span style={dmK}>时间 · Time</span>
                    <span style={dmV}>{activity.eventTime}</span>
                  </div>
                </div>
              )}
              {activity.location && (
                <div style={dmCell}>
                  <MapPin size={15} strokeWidth={1.8} style={{ color: "var(--color-accent)", flex: "none" }} />
                  <div style={{ minWidth: 0 }}>
                    <span style={dmK}>地点 · Venue</span>
                    <span style={dmV}>{activity.location}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {activity.link && (
            <a href={activity.link} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--color-accent)" }}>
              <ExternalLink size={12} strokeWidth={1.8} />{activity.link}
            </a>
          )}
        </div>
      </section>

      {/* 待处理委托（同意/拒绝调真实 API） */}
      {myPending.length > 0 && (
        <section className="m-pad fx-item" style={{ paddingTop: 18 }}>
          <div className="m-panel">
            <div className="m-panel-head">
              <span className="m-eyebrow">委托管理 · Delegations</span>
              <span className="more">{myPending.length} 条待处理</span>
            </div>
            {myPending.map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 2px 10px", borderBottom: "1px solid var(--color-border)" }}>
                <span style={{ width: 36, height: 36, borderRadius: 6, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-warning-bg)", color: "var(--color-warning)" }}><Mail size={17} strokeWidth={1.8} /></span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--color-fg-secondary)", lineHeight: 1.5 }}><b style={{ color: "var(--color-fg)" }}>{d.user.name}</b> 请你代替参加</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
                  <button onClick={() => handleApprove(d.id, false)} style={{ ...mBtnGhost, color: "var(--color-danger)" }}><X size={13} /> 拒绝</button>
                  <button onClick={() => handleApprove(d.id, true)} style={mBtnPrimary}><Check size={13} /> 同意</button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 本轮参与 */}
      <section className="m-pad fx-item" style={{ paddingTop: 18 }}>
        <div className="m-section-head">
          <span className="m-eyebrow">本轮参与 · Participants</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--color-muted)", letterSpacing: ".04em" }}>{participants.length} 人</span>
        </div>
        {participants.length === 0 ? (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "22px 16px", textAlign: "center", color: "var(--color-muted)", fontSize: 12 }}>暂无参与记录</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {participants.map((u, i) => (
              <span key={i} className="fx-item" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-fg-secondary)", background: "#F1F4F8", border: "1px solid var(--color-border)", padding: "3px 10px", borderRadius: 999, animationDelay: `${i * 30}ms` }}>{u.name}</span>
            ))}
          </div>
        )}
      </section>

      {/* 我的操作（报名 / 委托）——游客模式仅展示，不提供操作 */}
      {!isAdmin && !isGuest && isActive && (
        <section className="m-pad fx-item" style={{ paddingTop: 18 }}>
          <div className="m-section-head">
            <span className="m-eyebrow">我的操作 · Actions</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-primary" onClick={handleVolunteer} style={{ flex: 1, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13 }}><UserPlus size={13} /> 报名</button>
            {myDraw && (
              <button className="btn-ghost" onClick={() => setDelegating(myDraw.id)} style={{ flex: 1, minHeight: 44, border: "1px solid var(--color-border-strong)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13 }}><Send size={13} /> 委托</button>
            )}
          </div>
          {delegating && (
            <div style={{ marginTop: 12, position: "relative" }}>
              <input className="form-input" placeholder="搜索姓名或学号..." value={searchQ} onChange={e => handleSearch(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 13 }} autoFocus />
              {searchRes.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,.12)", maxHeight: 220, overflowY: "auto" }}>
                  {searchRes.map(s => (
                    <div key={s.id} onClick={() => handleDelegate(delegating, s.id)} style={{ padding: "11px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--color-border)" }}>
                      <strong>{s.name}</strong><span style={{ color: "var(--color-muted)", fontSize: 11, marginLeft: 8, fontFamily: "var(--font-mono)" }}>{s.studentId}</span>
                    </div>
                  ))}
                </div>
              )}
              <button className="btn-ghost" onClick={() => { setDelegating(null); setSearchQ(""); setSearchRes([]) }} style={{ marginTop: 8, minHeight: 40 }}>取消委托</button>
            </div>
          )}
        </section>
      )}

      {/* 管理员操作（班委可见） */}
      {isAdmin && (
        <section className="m-pad fx-item" style={{ paddingTop: 18 }}>
          <div className="m-panel">
            <div className="m-panel-head">
              <span className="m-eyebrow">管理员操作 · Admin</span>
              <span className="more">剩余 {remainingCount} 人未参与</span>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "10px 2px 4px", flexWrap: "wrap" }}>
              {isActive ? (
                <>
                  <button onClick={handleDraw} style={admBtn}><RefreshCw size={13} /> {drawing ? "抽签中..." : "抽签"}</button>
                  <button onClick={handleComplete} style={admBtn}><Check size={13} /> 标记完成</button>
                  <button onClick={handleCancel} style={{ ...admBtn, color: "var(--color-danger)", background: "var(--color-danger-bg)", borderColor: "rgba(196,97,90,.35)" }}><X size={13} /> 取消活动</button>
                </>
              ) : (
                <button onClick={handleResume} style={admBtn}><RefreshCw size={13} /> 重新继续</button>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        班级事务 · 一体化管理平台<br /><b style={{ fontWeight: 600 }}>CLASS ADMIN</b> · 数据每日 23:00 同步
      </div>
    </div>
  )

  return (
    <>
      {mobileView}
      <div className="actd-desktop">
      <main className="m-main" style={{ width: "min(860px, calc(100vw - 56px))", margin: "0 auto", padding: "36px 0 80px" }}>
      <Link href="/activities" className="btn-ghost" style={{ marginBottom: 16, width: "fit-content" }}><ArrowLeft size={16} /> 返回列表</Link>

      {/* Header */}
      <div className="card" style={{ marginBottom: 20 }}>
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="活动标题" style={{ fontWeight: 700, fontSize: "1.2rem" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input className="form-input" value={editTime} onChange={e => setEditTime(e.target.value)} placeholder="时间" />
              <input className="form-input" value={editLoc} onChange={e => setEditLoc(e.target.value)} placeholder="地点" />
            </div>
            <textarea className="form-input" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="活动描述" rows={2} />
            <input className="form-input" value={editLink} onChange={e => setEditLink(e.target.value)} placeholder="相关链接" />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" onClick={handleEdit}>保存</button>
              <button className="btn-ghost" onClick={() => setEditing(false)}>取消</button>
            </div>
          </div>
        ) : (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              {activity.status !== "completed" && activity.status !== "cancelled" ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 12px", borderRadius: 100, background: "var(--color-accent-subtle)", color: "var(--color-accent)", fontFamily: "var(--font-ui)", fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent)", animation: "pulse-dot 2.5s ease-in-out infinite" }} />
                  进行中
                </span>
              ) : (
                <span className="tag">{activity.status === "completed" ? "已完成" : "已取消"}</span>
              )}
              <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{activity.title}</h2>
            </div>
            {activity.description && <p style={{ color: "var(--color-muted)", fontSize: "0.88rem", margin: 0, whiteSpace: "pre-wrap" }}>{activity.description}</p>}
            {(activity.eventTime || activity.location || activity.link) && (
              <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: "0.8rem", color: "var(--color-muted)", flexWrap: "wrap" }}>
                {activity.eventTime && <span>时间: {activity.eventTime}</span>}
                {activity.location && <span>地点: {activity.location}</span>}
                {activity.link && <a href={activity.link} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem" }}>{activity.link}</a>}
              </div>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: "0.8rem", color: "var(--color-muted)" }}>
              <span>已抽 {draws.filter(d => d.status === "drawn" || d.status === "delegated" || d.status === "completed").length} 人</span>
              <span>{new Date(activity.createdAt).toLocaleDateString("zh-CN")}</span>
            </div>
          </div>
          {isAdmin && isActive && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.82rem", color: "var(--color-muted)" }}>人数</span>
                <input type="number" className="form-input" value={drawCount} onChange={e => setDrawCount(Math.max(1, Number(e.target.value)))} min={1} max={20} style={{ width: 64, padding: "6px 10px", textAlign: "center" }} />
              </div>
              <button className="btn-primary" onClick={handleDraw} disabled={drawing}><RefreshCw size={15} /> {drawing ? "抽签中..." : "抽签"}</button>
              <button className="btn-secondary" onClick={handleComplete}><Check size={15} /> 完成</button>
              <button className="btn-ghost" onClick={handleCancel} style={{ color: "var(--color-danger)" }}><X size={14} /> 取消</button>
            </div>
          )}
          {isAdmin && !isActive && (
            <button className="btn-secondary" onClick={handleResume}><RefreshCw size={15} /> 重新继续</button>
          )}
          {!isAdmin && !isGuest && isActive && <button className="btn-secondary" onClick={handleVolunteer}><UserPlus size={15} /> 我要报名</button>}
          {isAdmin && !editing && (
            <button className="btn-ghost" onClick={startEdit} style={{ marginLeft: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 编辑
            </button>
          )}
          <button className="btn-ghost" onClick={handleExport} title="导出图片">
            <Download size={14} /> 导出图片
          </button>
        </div>
        )}
      </div>

      {/* Assign (admin) */}
      {isAdmin && isActive && (
        <div style={{ marginBottom: 20 }}>
          <button className="btn-secondary" onClick={loadStudents}>{showAssign ? "关闭" : "指定学生"}</button>
          {showAssign && (
            <div className="card" style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>已选 {selectedIds.size} 人</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-ghost" onClick={() => setSelectedIds(new Set(allStudents.map(s => s.id)))} style={{ fontSize: "0.75rem" }}>全选</button>
                  <button className="btn-ghost" onClick={() => setSelectedIds(new Set())} style={{ fontSize: "0.75rem" }}>清空</button>
                  <button className="btn-primary" onClick={handleAssign} style={{ padding: "5px 14px", fontSize: "0.8rem", minHeight: 30 }}><UserPlus size={13} /> 确认指定</button>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginRight: 4 }}>来源:</span>
                <button onClick={() => setAssignSource("assigned")} className="tag" style={{ cursor: "pointer", background: assignSource === "assigned" ? "var(--color-accent)" : "var(--color-bg-alt)", color: assignSource === "assigned" ? "#fff" : "var(--color-muted)", fontWeight: assignSource === "assigned" ? 600 : 400, border: `1px solid ${assignSource === "assigned" ? "var(--color-accent)" : "var(--color-border)"}` }}>管理员指定</button>
                <button onClick={() => setAssignSource("volunteered")} className="tag" style={{ cursor: "pointer", background: assignSource === "volunteered" ? "var(--color-accent)" : "var(--color-bg-alt)", color: assignSource === "volunteered" ? "#fff" : "var(--color-muted)", fontWeight: assignSource === "volunteered" ? 600 : 400, border: `1px solid ${assignSource === "volunteered" ? "var(--color-accent)" : "var(--color-border)"}` }}>自行报名</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {allStudents.map(s => {
                  const sel = selectedIds.has(s.id)
                  return <button key={s.id} className="tag" onClick={() => { const n = new Set(selectedIds); sel ? n.delete(s.id) : n.add(s.id); setSelectedIds(n) }}
                    style={{ cursor: "pointer", background: sel ? "var(--color-accent)" : "var(--color-bg-alt)", color: sel ? "#fff" : "var(--color-muted)", border: `1px solid ${sel ? "var(--color-accent)" : "var(--color-border)"}`, fontWeight: sel ? 600 : 400, transition: "all 120ms" }}
                  >{s.name}</button>
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending delegations (incoming) */}
      {myPending.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: "var(--color-accent)" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: 12 }}>待处理委托请求</h3>
          {myPending.map(d => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
              <span style={{ fontSize: "0.9rem" }}><strong>{d.user.name}</strong>（{d.user.studentId}）请你代替参加</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn-primary" onClick={() => handleApprove(d.id, true)} style={{ padding: "5px 14px", fontSize: "0.8rem", minHeight: 32 }}><Check size={14} /> 同意</button>
                <button className="btn-ghost" onClick={() => handleApprove(d.id, false)} style={{ color: "var(--color-danger)" }}><X size={14} /> 拒绝</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Draw results */}
      <div className="card">
        <h3 style={{ fontSize: "0.95rem", marginBottom: 16 }}>参与名单</h3>
        {draws.length === 0 && <p className="empty-state" style={{ padding: "24px 0" }}>暂无记录</p>}

        {draws.map(d => {
          const isMine = d.userId === session?.user?.id
          const canDelegate = isMine && d.status === "drawn" && isActive
          const isDel = delegating === d.id
          const effUser = d.delegateApproved && d.delegate ? d.delegate : d.user

          return (
            <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span className={`tag ${d.status === "completed" || d.status === "cancelled" ? "tag" : d.status === "delegated" ? (d.delegateApproved ? "tag-accent" : "tag-warning") : "tag-accent"}`}>
                  {drawLabel(d)}
                </span>
                <strong style={{ fontSize: "0.9rem" }}>{effUser.name}</strong>
                <span style={{ color: "var(--color-muted)", fontSize: "0.78rem" }}>{effUser.studentId}</span>
                {d.round && <span style={{ color: "var(--color-muted-light)", fontSize: "0.7rem" }}>第{d.round}轮</span>}
                {d.delegateApproved && d.delegate && <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>（由 {d.user.name} 转交）</span>}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                {isAdmin && d.status !== "delegated" && (
                  <select
                    value={drawLabel(d)}
                    onChange={e => handleDrawStatus(d.id, e.target.value)}
                    style={{ padding: "2px 6px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-fg)", fontFamily: "var(--font-ui)", fontSize: "0.7rem", cursor: "pointer", outline: "none" }}
                  >
                    <option value="抽签">抽签</option>
                    <option value="报名">报名</option>
                    <option value="指定参与">指定参与</option>
                    <option value="已完成">已完成</option>
                    <option value="已取消">已取消</option>
                  </select>
                )}
                {isAdmin && (
                  <button className="btn-ghost" onClick={() => handleDeleteDraw(d.id)} style={{ padding: 2, width: 26, height: 26, color: "var(--color-danger)" }} title="删除"><Trash2 size={12} /></button>
                )}
                {canDelegate && !isDel && (
                  <button className="btn-ghost" onClick={() => setDelegating(d.id)} style={{ fontSize: "0.78rem" }}><Send size={12} /> 委托他人</button>
                )}
                {isDel && (
                  <div style={{ position: "relative" }}>
                    <input className="form-input" placeholder="搜索姓名或学号..." value={searchQ} onChange={e => handleSearch(e.target.value)}
                      style={{ width: 180, padding: "5px 8px", fontSize: "0.8rem" }} autoFocus />
                    {searchRes.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-md)", maxHeight: 200, overflowY: "auto" }}>
                        {searchRes.map(s => (
                          <div key={s.id} onClick={() => handleDelegate(d.id, s.id)} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.82rem" }}
                            onMouseOver={e => (e.currentTarget.style.background = "var(--color-accent-subtle)")} onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
                            <strong>{s.name}</strong><span style={{ color: "var(--color-muted)", fontSize: "0.72rem", marginLeft: 8 }}>{s.studentId}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button className="btn-ghost" onClick={() => { setDelegating(null); setSearchQ(""); setSearchRes([]) }} style={{ padding: 0, width: 24, height: 24, marginLeft: 4 }}><X size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </main>
      </div>
    </>
  )
}
