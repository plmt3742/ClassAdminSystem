"use client"

import { useCallback, useEffect, useState, type CSSProperties } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { ArrowLeft, Plus, UserCheck, Users, Pencil, Trash2, Send, Check, X, Clock, FileText, Target, RefreshCw, Star, UserPlus, Mail, MapPin } from "lucide-react"

interface DrawUser { id: string; name: string; studentId: string }
interface DrawItem {
  id: string; userId: string; status: string; round: number
  delegateTo: string | null; delegateApproved: boolean
  user: DrawUser; delegate: DrawUser | null
}
interface DelegateItem {
  id: string; userId: string; delegateTo: string | null; delegateApproved: boolean
  user: DrawUser; delegate: DrawUser | null
  activity: { id: string; title: string }
}
interface TimelineEvent {
  id: string; type: string; text: string; time: string
  activityId?: string; activityTitle?: string
  userName?: string; targetName?: string; round?: number
}

const eventIcons: Record<string, string> = {
  activity_created: "file",
  student_drawn: "target",
  delegation_requested: "send",
  delegation_accepted: "check",
  activity_completed: "check-circle",
  round_completed: "star",
  volunteered: "user-plus",
}
interface Activity {
  id: string; title: string; description?: string; status: string; round: number; createdAt: string
  eventTime?: string; location?: string; link?: string
  draws: DrawItem[]
  volunteers: { userId: string }[]
}

const statusLabel: Record<string, string> = { pending: "进行中", drawn: "进行中", completed: "已完成", cancelled: "已取消" }
const statusColor: Record<string, string> = { pending: "tag-accent", drawn: "tag-accent", completed: "tag", cancelled: "tag" }

export default function ActivitiesPage() {
  const { data: session } = useSession()
  const [activities, setActivities] = useState<Activity[]>([])
  const [currentRound, setCurrentRound] = useState(1)
  const [remaining, setRemaining] = useState<{ id: string; name: string; studentId: string }[]>([])
  const [incoming, setIncoming] = useState<DelegateItem[]>([])
  const [outgoing, setOutgoing] = useState<DelegateItem[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [location, setLocation] = useState("")
  const [link, setLink] = useState("")
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")

  const isAdmin = session?.user?.role === "admin"
  const myId = session?.user?.id

  const fetchActivities = useCallback(async () => {
    const [res, grRes, delRes, tlRes] = await Promise.all([
      fetch("/api/activities"),
      fetch("/api/global-round"),
      fetch("/api/me/delegations"),
      fetch("/api/activity-events"),
    ])
    if (res.ok) {
      const data = await res.json()
      setActivities(data.activities)
      setCurrentRound(data.currentRound)
    }
    if (grRes.ok) {
      const gr = await grRes.json()
      setRemaining(gr.remaining || [])
    }
    if (delRes.ok) {
      const del = await delRes.json()
      setIncoming(del.incoming || [])
      setOutgoing(del.outgoing || [])
    }
    if (tlRes.ok) {
      const tl = await tlRes.json()
      setTimeline(tl.events || [])
    }
  }, [])

  const handleDelegateAction = async (drawId: string, activityId: string, approve: boolean) => {
    await fetch(`/api/activities/${activityId}/delegate`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drawId, approve }),
    })
    fetchActivities()
  }

  useEffect(() => { fetchActivities() }, [fetchActivities])

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    await fetch("/api/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description: desc, eventTime, location, link }) })
    setCreating(false); setTitle(""); setDesc(""); setEventTime(""); setLocation(""); setLink(""); setShowCreate(false)
    fetchActivities()
  }

  const handleEdit = async (id: string) => {
    if (!editTitle.trim()) return
    await fetch(`/api/activities/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: editTitle, description: editDesc }) })
    setEditingId(null); setEditTitle(""); setEditDesc("")
    fetchActivities()
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定删除「${title}」？此操作不可撤销。`)) return
    await fetch(`/api/activities/${id}`, { method: "DELETE" })
    fetchActivities()
  }

  const startEdit = (a: Activity) => {
    setEditingId(a.id); setEditTitle(a.title); setEditDesc(a.description || "")
  }

  // Activities I'm involved in
  const myActivities = activities.filter(a => {
    const drawn = a.draws.some(d => d.userId === myId)
    const delegating = a.draws.some(d => d.delegateTo === myId)
    return drawn || delegating
  })

  // Get drawn users for an activity (current round, active)
  const drawnUsers = (a: Activity) => a.draws
    .filter(d => d.round === currentRound && (d.status === "drawn" || d.status === "completed"))
    .map(d => d.delegateApproved && d.delegate ? d.delegate : d.user)

  // ===== 移动版（设计稿 activities.html · 真实数据，≤640px 显示） =====
  const totalStudents = 45 // 班级总人数（与桌面版统计一致）
  const mCard: CSSProperties = {
    display: "block", background: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: 6, padding: "14px 16px", color: "inherit", textDecoration: "none",
    transition: "transform .16s ease, border-color .16s ease",
  }
  const mChipMeta: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4 }
  const mSectMore: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--color-muted)", letterSpacing: ".04em" }
  const mBtnGhost: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "6px 11px", borderRadius: 6, fontSize: 12, cursor: "pointer", background: "transparent", color: "var(--color-fg-secondary)", border: "1px solid var(--color-border)" }
  const mBtnPrimary: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "6px 13px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "var(--color-accent)", color: "#fff", border: "none" }

  const mobileView = (
    <div className="m-page-root">
      <header className="m-topbar">
        <Link className="m-back" href="/modules" aria-label="返回模块"><ArrowLeft size={18} /></Link>
        <span className="m-title">活动参与<small>ACTIVITIES</small></span>
        <span className="m-year">2025-2026</span>
      </header>

      {/* 第 N 轮未参与 · 统计卡 */}
      <section className="m-pad fx-item" style={{ paddingTop: 16 }}>
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "15px 16px 13px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
            <span className="m-eyebrow">第 {currentRound} 轮未参与 · Round {currentRound}</span>
            <span className={`chip ${remaining.length > 0 ? "pending" : "ok"}`}><span className="lamp" />{remaining.length > 0 ? "抽签进行中" : "本轮已完成"}</span>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 700, color: "var(--color-accent-hover)", lineHeight: 1, letterSpacing: "-.01em" }}>
            {remaining.length}<small style={{ fontSize: 12, fontWeight: 400, color: "var(--color-muted)", marginLeft: 4, letterSpacing: ".02em" }}>/ {totalStudents} 人</small>
          </div>
          <div style={{ height: 5, background: "#EBEFF5", borderRadius: 999, overflow: "hidden", marginTop: 13 }}>
            <div style={{ height: "100%", width: `${Math.round(((totalStudents - remaining.length) / totalStudents) * 100)}%`, background: "var(--color-accent)", borderRadius: 999, transition: "width .9s cubic-bezier(.2,.7,.3,1)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted)", letterSpacing: ".04em", marginTop: 8 }}>
            <span>已参与 <b style={{ color: "var(--color-fg-secondary)", fontWeight: 600 }}>{totalStudents - remaining.length}</b> 人</span>
            <span>抽签截止前可委托</span>
          </div>
        </div>
      </section>

      {/* 委托管理（incoming：同意/拒绝调真实 API） */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <section className="m-pad fx-item" style={{ paddingTop: 18 }}>
          <div className="m-panel">
            <div className="m-panel-head">
              <span className="m-eyebrow">委托管理 · Delegations</span>
              <span className="more">{incoming.length > 0 ? `${incoming.length} 条待处理` : `${outgoing.length} 条进行中`}</span>
            </div>
            {incoming.map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 2px 10px", borderBottom: "1px solid var(--color-border)" }}>
                <span style={{ width: 36, height: 36, borderRadius: 6, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-warning-bg)", color: "var(--color-warning)" }}><Mail size={17} strokeWidth={1.8} /></span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--color-fg-secondary)", lineHeight: 1.5 }}><b style={{ color: "var(--color-fg)" }}>{d.user?.name}</b> 请你代替参加「{d.activity?.title || "活动"}」</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
                  <button onClick={() => handleDelegateAction(d.id, d.activity?.id || "", false)} style={{ ...mBtnGhost, color: "var(--color-danger)" }}><X size={13} /> 拒绝</button>
                  <button onClick={() => handleDelegateAction(d.id, d.activity?.id || "", true)} style={mBtnPrimary}><Check size={13} /> 同意</button>
                </span>
              </div>
            ))}
            {outgoing.map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 2px 10px", borderBottom: "1px solid var(--color-border)", opacity: 0.7 }}>
                <span style={{ width: 36, height: 36, borderRadius: 6, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "#EBEFF5", color: "var(--color-muted)" }}><Send size={17} strokeWidth={1.8} /></span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--color-fg-secondary)", lineHeight: 1.5 }}>委托 <b style={{ color: "var(--color-fg)" }}>{d.delegate?.name}</b> 代替参加「{d.activity?.title || "活动"}」</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)", flex: "none" }}>{d.delegateApproved ? "已同意" : "等待回复"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 我的活动 */}
      <section className="m-pad fx-item" style={{ paddingTop: 18 }}>
        <div className="m-section-head">
          <span className="m-eyebrow">我的活动 · Mine</span>
          <span style={mSectMore}>{myActivities.length} 项</span>
        </div>
        {myActivities.length === 0 ? (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "22px 16px", textAlign: "center", color: "var(--color-muted)", fontSize: 12 }}>暂无涉及的活动，等待管理员抽签</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myActivities.map((a, i) => {
              const myDraw = a.draws.find(dd => dd.userId === myId)
              const myDelegation = a.draws.find(dd => dd.delegateTo === myId)
              let myStatus = ""
              if (myDelegation?.delegateApproved) myStatus = `代 ${myDelegation.user.name} 参加`
              else if (myDelegation && !myDelegation.delegateApproved) myStatus = "委托待确认"
              else if (myDraw?.status === "completed") myStatus = "已完成"
              else if (myDraw?.status === "cancelled") myStatus = "已取消"
              else if (myDraw?.status === "delegated" && myDraw.delegateApproved) myStatus = `已转交 ${myDraw.delegate?.name || ""}`
              else if (myDraw?.status === "delegated") myStatus = "委托待确认"
              else if (myDraw && (myDraw as any).source === "volunteered") myStatus = "自行报名"
              else if (myDraw && (myDraw as any).source === "assigned") myStatus = "被指定"
              else if (myDraw) myStatus = "被抽中"
              else myStatus = "关注中"
              const active = a.status === "pending" || a.status === "drawn"
              return (
                <Link key={a.id} href={`/activities/${a.id}`} className="fx-item" style={{ ...mCard, animationDelay: `${i * 45}ms` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--color-fg)", lineHeight: 1.35 }}>{a.title}</span>
                    <span className={`chip ${active ? "ok" : "none"}`}><span className="lamp" />{active ? "进行中" : statusLabel[a.status]}</span>
                  </div>
                  {(a.eventTime || a.location) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 14px", marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)" }}>
                      {a.eventTime && <span style={mChipMeta}><Clock size={11} strokeWidth={1.8} />{a.eventTime}</span>}
                      {a.location && <span style={mChipMeta}><MapPin size={11} strokeWidth={1.8} />{a.location}</span>}
                    </div>
                  )}
                  {myStatus && <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--color-muted)", letterSpacing: ".04em", marginTop: 8 }}>{myStatus}</div>}
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* 全部活动 */}
      <section className="m-pad fx-item" style={{ paddingTop: 18 }}>
        <div className="m-section-head">
          <span className="m-eyebrow">全部活动 · All</span>
          <span style={mSectMore}>{activities.length} 项 · 第 {currentRound} 轮</span>
        </div>
        {activities.length === 0 ? (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "28px 16px", textAlign: "center", color: "var(--color-muted)", fontSize: 12 }}>暂无活动</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activities.map((a, i) => {
              const names = drawnUsers(a)
              const active = a.status === "pending" || a.status === "drawn"
              return (
                <Link key={a.id} href={`/activities/${a.id}`} className="fx-item" style={{ ...mCard, animationDelay: `${i * 45}ms` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--color-fg)", lineHeight: 1.35 }}>{a.title}</span>
                    <span className={`chip ${active ? "ok" : "none"}`}><span className="lamp" />{active ? "进行中" : statusLabel[a.status]}</span>
                  </div>
                  {(a.eventTime || a.location) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 14px", marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)" }}>
                      {a.eventTime && <span style={mChipMeta}><Clock size={11} strokeWidth={1.8} />{a.eventTime}</span>}
                      {a.location && <span style={mChipMeta}><MapPin size={11} strokeWidth={1.8} />{a.location}</span>}
                    </div>
                  )}
                  {names.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--color-border)" }}>
                      {names.slice(0, 5).map((u, j) => (
                        <span key={j} style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--color-fg-secondary)", background: "#F1F4F8", border: "1px solid var(--color-border)", padding: "1.5px 8px", borderRadius: 999 }}>{u.name}</span>
                      ))}
                      {names.length > 5 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--color-muted)", border: "1px dashed var(--color-border-strong)", background: "transparent", padding: "1.5px 8px", borderRadius: 999 }}>+{names.length - 5}</span>}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* 管理员操作（班委可见） */}
      {isAdmin && (
        <section className="m-pad fx-item" style={{ paddingTop: 18 }}>
          <div className="m-panel">
            <div className="m-panel-head">
              <span className="m-eyebrow">管理员操作 · Admin</span>
              <span className="more">仅班委可见</span>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "10px 2px 4px", flexWrap: "wrap" }}>
              <button onClick={() => setShowCreate(!showCreate)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--color-accent)", background: "var(--color-accent-subtle)", border: "1px solid var(--color-border-strong)", borderRadius: 6, padding: "9px 13px", cursor: "pointer" }}>
                {showCreate ? <X size={13} /> : <Plus size={13} />} {showCreate ? "关闭创建" : "创建活动"}
              </button>
            </div>
            {showCreate && (
              <div style={{ padding: "6px 2px 14px" }}>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="活动标题" style={{ marginBottom: 8 }} />
                <textarea className="form-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="活动描述（可选）" rows={2} style={{ marginBottom: 8 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <input className="form-input" value={eventTime} onChange={e => setEventTime(e.target.value)} placeholder="时间（如: 周三 14:00）" />
                  <input className="form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="地点" />
                </div>
                <input className="form-input" value={link} onChange={e => setLink(e.target.value)} placeholder="相关链接（可选）" style={{ marginBottom: 10 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" onClick={handleCreate} disabled={creating} style={{ minHeight: 40 }}>{creating ? "创建中..." : "创建"}</button>
                  <button className="btn-ghost" onClick={() => setShowCreate(false)} style={{ minHeight: 40 }}>取消</button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        工业软件二班 · 班级事务平台<br /><b style={{ fontWeight: 600 }}>CLASS ADMIN</b> · 数据每日 23:00 同步
      </div>
    </div>
  )

  return (
    <>
      {mobileView}
      <div className="act-desktop">
      <main className="act-main" style={{ width: "min(1200px, calc(100vw - 56px))", margin: "0 auto", padding: "36px 0 80px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: 36, alignItems: "start" }}>
      <div style={{ minWidth: 0 }}>
      <div className="section-head">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/" className="zs-back" style={{ marginBottom: 0 }}>
            <ArrowLeft size={15} /> 返回首页
          </Link>
          <div>
            <div className="eyebrow">活动参与</div>
            <h2>活动列表</h2>
          </div>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowCreate(!showCreate)} style={{ padding: "8px 18px", fontSize: "0.8rem", minHeight: 36 }}>
            <Plus size={15} /> 创建活动
          </button>
        )}
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: 24 }}>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="活动标题" style={{ marginBottom: 12 }} />
          <textarea className="form-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="活动描述（可选）" rows={2} style={{ marginBottom: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <input className="form-input" value={eventTime} onChange={e => setEventTime(e.target.value)} placeholder="时间（如: 周三 14:00-16:00）" />
            <input className="form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="地点（如: 6A-301）" />
          </div>
          <input className="form-input" value={link} onChange={e => setLink(e.target.value)} placeholder="相关链接（可选）" style={{ marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" onClick={handleCreate} disabled={creating}>{creating ? "创建中..." : "创建"}</button>
            <button className="btn-ghost" onClick={() => setShowCreate(false)}>取消</button>
          </div>
        </div>
      )}

      {/* Global round remaining */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={18} style={{ color: "var(--color-accent)" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>第 {currentRound} 轮未参与</h3>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>剩余 {remaining.length} / 45 人</span>
        </div>
        {remaining.length > 0 ? (
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {remaining.map(u => (
                <span key={u.id} className="tag" style={{ fontSize: "0.74rem", padding: "4px 12px" }}>{u.name}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="card" style={{ textAlign: "center", padding: "20px 0", background: "var(--color-success-bg)", borderColor: "rgba(13,148,136,0.15)", color: "var(--color-success)", fontWeight: 600, fontSize: "0.88rem" }}>
            全部同学已参与，进入第 {currentRound + 1} 轮
          </div>
        )}
      </section>

      {/* My Activities */}
      {myActivities.length > 0 ? (
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <UserCheck size={18} style={{ color: "var(--color-accent)" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>我的活动</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myActivities.map(a => {
              const myDraw = a.draws.find(d => d.userId === myId)
              const myDelegation = a.draws.find(d => d.delegateTo === myId)
              let myStatus = ""
              if (myDelegation?.delegateApproved) myStatus = `代 ${myDelegation.user.name} 参加`
              else if (myDelegation && !myDelegation.delegateApproved) myStatus = "委托待确认"
              else if (myDraw?.status === "completed") myStatus = "已完成"
              else if (myDraw?.status === "cancelled") myStatus = "已取消"
              else if (myDraw?.status === "delegated" && myDraw.delegateApproved) myStatus = `已转交 ${myDraw.delegate?.name || ""}`
              else if (myDraw?.status === "delegated") myStatus = "委托待确认"
              else if (myDraw && (myDraw as any).source === "volunteered") myStatus = "自行报名"
              else if (myDraw && (myDraw as any).source === "assigned") myStatus = "被指定"
              else if (myDraw) myStatus = "被抽中"
              else myStatus = "关注中"

              return (
                <Link key={a.id} href={`/activities/${a.id}`} className="card" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderLeft: "3px solid var(--color-accent)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>{a.title}</span>
                    <span style={{ marginLeft: 10, fontSize: "0.78rem", color: "var(--color-muted)" }}>{myStatus}</span>
                  </div>
                  {a.status === "pending" || a.status === "drawn" ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 100, background: "var(--color-accent-subtle)", color: "var(--color-accent)", fontFamily: "var(--font-ui)", fontSize: "0.7rem", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-accent)", animation: "pulse-dot 2.5s ease-in-out infinite" }} />
                      进行中
                    </span>
                  ) : (
                    <span className="tag" style={{ flexShrink: 0, fontSize: "0.7rem" }}>{statusLabel[a.status]}</span>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      ) : (
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <UserCheck size={18} style={{ color: "var(--color-muted)" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>我的活动</h3>
          </div>
          <div className="card" style={{ textAlign: "center", padding: "28px 0", color: "var(--color-muted)", fontSize: "0.85rem" }}>
            暂无涉及的活动，等待管理员抽签
          </div>
        </section>
      )}

      {/* Delegation panel */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Send size={18} style={{ color: incoming.length > 0 ? "var(--color-accent)" : "var(--color-muted)" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>委托管理</h3>
            {incoming.length > 0 && (
              <span className="tag tag-warning" style={{ marginLeft: 4 }}>{incoming.length} 条待处理</span>
            )}
          </div>

          {/* Incoming */}
          {incoming.map(d => (
            <div key={d.id} className="card" style={{ marginBottom: 8, padding: 16, borderLeft: "3px solid var(--color-accent)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span style={{ fontSize: "0.9rem" }}>
                    <strong>{d.user?.name}</strong>（{d.user?.studentId}）请你代替参加
                  </span>
                  <Link href={`/activities/${d.activity?.id}`} style={{ marginLeft: 8, fontSize: "0.82rem", fontWeight: 600 }}>
                    {d.activity?.title}
                  </Link>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-primary" onClick={() => handleDelegateAction(d.id, d.activity?.id || "", true)} style={{ padding: "5px 14px", fontSize: "0.8rem", minHeight: 32 }}>
                    <Check size={14} /> 同意
                  </button>
                  <button className="btn-ghost" onClick={() => handleDelegateAction(d.id, d.activity?.id || "", false)} style={{ color: "var(--color-danger)" }}>
                    <X size={14} /> 拒绝
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Outgoing */}
          {outgoing.map(d => (
            <div key={d.id} className="card" style={{ marginBottom: 8, padding: 16, opacity: 0.7 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: "0.88rem" }}>
                  委托 <strong>{d.delegate?.name}</strong> 代替参加
                  <Link href={`/activities/${d.activity?.id}`} style={{ marginLeft: 8, fontSize: "0.82rem" }}>
                    {d.activity?.title}
                  </Link>
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                  {d.delegateApproved ? "已同意" : "等待回复"}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* All Activities */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Users size={18} style={{ color: "var(--color-muted)" }} />
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>全部活动</h3>
        </div>

        {activities.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--color-muted)" }}>暂无活动</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {activities.map(a => {
              const names = drawnUsers(a)
              return (
                <Link key={a.id} href={`/activities/${a.id}`} className="card" style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: names.length > 0 ? 10 : 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        {a.status === "pending" || a.status === "drawn" ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 100, background: "var(--color-accent-subtle)", color: "var(--color-accent)", fontFamily: "var(--font-ui)", fontSize: "0.7rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-accent)", animation: "pulse-dot 2.5s ease-in-out infinite" }} />
                              进行中
                            </span>
                          ) : (
                            <span className="tag">{statusLabel[a.status]}</span>
                          )}
                        {editingId === a.id ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexGrow: 1 }}>
                            <input className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="标题" style={{ padding: "4px 10px", fontSize: "0.85rem", flex: 1 }} />
                            <button className="btn-primary" onClick={(ev) => { ev.preventDefault(); handleEdit(a.id) }} style={{ padding: "4px 12px", fontSize: "0.75rem", minHeight: 28 }}>保存</button>
                            <button className="btn-ghost" onClick={(ev) => { ev.preventDefault(); setEditingId(null) }} style={{ padding: 0, width: 24, height: 24, fontSize: "0.75rem" }}>✕</button>
                          </div>
                        ) : (
                          <>
                            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{a.title}</span>
                            {isAdmin && (
                              <span style={{ display: "inline-flex", gap: 2, marginLeft: 4 }}>
                                <button className="btn-ghost" onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); startEdit(a) }} style={{ padding: 2, width: 26, height: 26 }} title="编辑"><Pencil size={12} /></button>
                                <button className="btn-ghost" onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); handleDelete(a.id, a.title) }} style={{ padding: 2, width: 26, height: 26, color: "var(--color-danger)" }} title="删除"><Trash2 size={12} /></button>
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {a.description && <p style={{ color: "var(--color-muted)", fontSize: "0.82rem", margin: "0 0 4px" }}>{a.description}</p>}
                      {(a.eventTime || a.location) && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-muted-light)", display: "flex", gap: 12, marginTop: 2 }}>
                          {a.eventTime && <span>{a.eventTime}</span>}
                          {a.location && <span>{a.location}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--color-muted)", flexShrink: 0 }}>
                      <div>{new Date(a.createdAt).toLocaleDateString("zh-CN")}</div>
                    </div>
                  </div>
                  {names.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid var(--color-border)" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--color-muted)", flexShrink: 0 }}>本轮参与：</span>
                      {names.slice(0, 8).map((u, i) => (
                        <span key={i} className="tag tag-accent" style={{ fontSize: "0.7rem" }}>{u.name}</span>
                      ))}
                      {names.length > 8 && <span style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>+{names.length - 8}</span>}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Timeline: move to sidebar */}
      </div>

      {/* Sidebar */}
      <aside style={{ position: "sticky", top: 80 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Clock size={16} style={{ color: "var(--color-muted)" }} />
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700 }}>最近动态</h3>
        </div>
        <div className="card" style={{ padding: 12 }}>
          {timeline.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", textAlign: "center", padding: "20px 0" }}>暂无动态</p>
          ) : (
            timeline.slice(0, 20).map((ev, i) => {
              const d = new Date(ev.time)
              const timeStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
              return (
                <div key={ev.id} style={{ padding: "10px 0", borderBottom: i < Math.min(timeline.length, 20) - 1 ? "1px solid var(--color-border)" : "none" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ marginTop: 2, flexShrink: 0 }}>
                      {ev.type === "activity_created" && <FileText size={14} style={{ color: "var(--color-accent)" }} />}
                      {ev.type === "student_drawn" && <Target size={14} style={{ color: "var(--color-warning)" }} />}
                      {ev.type === "delegation_requested" && <Send size={14} style={{ color: "var(--color-muted)" }} />}
                      {ev.type === "delegation_accepted" && <Check size={14} style={{ color: "var(--color-success)" }} />}
                      {ev.type === "activity_completed" && <Check size={14} style={{ color: "var(--color-success)" }} />}
                      {ev.type === "round_completed" && <Star size={14} style={{ color: "var(--color-accent)" }} />}
                      {ev.type === "volunteered" && <UserPlus size={14} style={{ color: "var(--color-muted)" }} />}
                      {!["activity_created","student_drawn","delegation_requested","delegation_accepted","activity_completed","round_completed","volunteered"].includes(ev.type) && <Clock size={14} style={{ color: "var(--color-muted)" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.78rem", lineHeight: 1.5 }}>
                        {ev.activityId ? (
                          <Link href={`/activities/${ev.activityId}`} style={{ fontWeight: 600, display: "inline" }}>
                            {ev.activityTitle}
                          </Link>
                        ) : ev.activityTitle ? (
                          <span style={{ fontWeight: 600 }}>{ev.activityTitle}</span>
                        ) : null}
                        {ev.activityId || ev.activityTitle ? " " : ""}
                        <span style={{ color: "var(--color-fg-secondary)" }}>{ev.text}</span>
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--color-muted-light)", marginTop: 2 }}>
                        {timeStr}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>
      </main>
      </div>
    </>
  )
}
