"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Award, Check, ChevronRight, Search, ShieldAlert, Undo2, X } from "lucide-react"

interface Card {
  id: string; name: string; studentId: string; status: string
  score: number | null; summary: string; evidenceCount: number
  sectionId: string | null; submittedAt: string | null
}

const STATUS_LABEL: Record<string, string> = {
  submitted: "待审核", approved: "已通过", returned: "已退回", not_started: "未提交",
}
const STATUS_DOT: Record<string, string> = {
  submitted: "#C7924B", approved: "#5A8C6F", returned: "#C4615A", not_started: "#A8B4BD",
}
const STATUS_RANK: Record<string, number> = { submitted: 0, returned: 1, approved: 2, not_started: 3 }
const STATUS_CLASS: Record<string, string> = {
  submitted: "pending", approved: "approved", returned: "returned", not_started: "empty",
}
const FILTERS = [
  { key: "all", label: "全部" },
  { key: "submitted", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "returned", label: "已退回" },
  { key: "not_started", label: "未提交" },
]

export default function ReviewFPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [loaded, setLoaded] = useState(false)
  const [denied, setDenied] = useState(false)
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [rejectError, setRejectError] = useState("")
  // 移动版状态筛选：all | submitted | approved | returned | unfilled
  const [mFilter, setMFilter] = useState("submitted")

  const isReviewer = session?.user?.role === "admin" || (session?.user?.tags ?? []).includes("班长")

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/review-f")
      .then(async res => {
        if (res.status === 403) { setDenied(true); setLoaded(true); return }
        if (res.ok) setCards((await res.json()).cards || [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [status])

  const handleQuickApprove = async (c: Card) => {
    if (!c.sectionId) return
    if (!confirm(`确认通过 ${c.name}（${c.studentId}）的 D 奖惩附加？`)) return
    setApprovingId(c.id)
    const res = await fetch(`/api/zongce/review/${c.sectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    })
    if (res.ok) reload()
    setApprovingId(null)
  }

  const handleReject = async (c: Card) => {
    if (!rejectNote.trim()) { setRejectError("请填写退回理由"); return }
    setRejectError("")
    setApprovingId(c.id)
    const res = await fetch(`/api/zongce/review/${c.sectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: false, reviewNote: rejectNote.trim() }),
    })
    if (res.ok) { setRejectingId(null); setRejectNote(""); reload() }
    setApprovingId(null)
  }

  const handleReopen = async (c: Card) => {
    if (!c.sectionId) return
    if (!confirm(`撤销驳回 ${c.name}（${c.studentId}）？将重新进入待审核队列`)) return
    setApprovingId(c.id)
    const res = await fetch(`/api/zongce/review/${c.sectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reopen" }),
    })
    if (res.ok) reload()
    setApprovingId(null)
  }

  const handleUnapprove = async (c: Card) => {
    if (!c.sectionId) return
    if (!confirm(`撤销通过 ${c.name}（${c.studentId}）？将重新进入待审核队列，需重新审核。`)) return
    setApprovingId(c.id)
    const res = await fetch(`/api/zongce/review/${c.sectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unapprove" }),
    })
    if (res.ok) reload()
    setApprovingId(null)
  }

  const reload = () => {
    fetch("/api/zongce/review-f").then(r => r.json()).then(d => setCards(d.cards || [])).catch(() => {})
  }

  const visible = useMemo(() => {
    let list = cards
    if (filter !== "all") list = list.filter(c => c.status === filter)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q) || c.studentId.includes(q))
    return [...list].sort(
      (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.studentId.localeCompare(b.studentId)
    )
  }, [cards, filter, query])

  if (status === "loading") return <div style={{ textAlign: "center", padding: 60, color: "#7A8A94" }}>加载中...</div>
  if (!session) return null

  if (denied || !isReviewer) {
    return (
      <main className="zc-wrap">
        <button className="btn-ghost" onClick={() => router.push("/zongce")} style={{ marginBottom: 20 }}>
          <ArrowLeft size={14} /> 返回
        </button>
        <div className="card" style={{ textAlign: "center", padding: "60px 40px", background: "#fff" }}>
          <ShieldAlert size={32} style={{ color: "#A8B4BD", marginBottom: 12 }} />
          <h2 style={{ marginBottom: 8 }}>无权访问</h2>
          <p style={{ color: "#7A8A94", fontSize: ".88rem" }}>仅班长或管理员可查看 D 奖惩附加审核</p>
        </div>
      </main>
    )
  }

  const count = (k: string) => cards.filter(c => c.status === k).length

    // ===== 移动版（设计稿 review-list.html · 真实数据，≤640px 显示） =====
  const year = "2025-2026"
  const fmtTime = (t: string) => {
    const d = new Date(t)
    const p = (n: number) => String(n).padStart(2, "0")
    return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  }
  // 移动版状态统计与筛选
  const mCounts = {
    submitted: count("submitted"),
    approved: count("approved"),
    returned: count("returned"),
    unfilled: count("not_started") + count("draft"),
  }
  const mList = mFilter === "all" ? cards
    : mFilter === "unfilled" ? cards.filter(c => c.status === "not_started" || c.status === "draft")
    : cards.filter(c => c.status === mFilter)
  const mChip: Record<string, string> = { submitted: "pending", approved: "ok", returned: "returned", not_started: "none", draft: "draft" }
  const mChipTxt: Record<string, string> = { submitted: "待审核", approved: "已通过", returned: "已退回", not_started: "未填写", draft: "草稿" }
  const mFilterTabs = [
    { k: "submitted", label: "待审核", n: mCounts.submitted },
    { k: "approved", label: "已通过", n: mCounts.approved },
    { k: "returned", label: "已退回", n: mCounts.returned },
    { k: "unfilled", label: "未填写", n: mCounts.unfilled },
    { k: "all", label: "全部", n: cards.length },
  ]

  const mobileView = (
    <div className="m-page-root">
      <header className="m-topbar">
        <Link className="m-back" href="/zongce" aria-label="返回综测"><ArrowLeft size={18} /></Link>
        <span className="m-title">F 奖惩附加<small>REVIEW</small></span>
        <span className="m-year">{year}</span>
      </header>

      {/* 状态统计条：四状态计数 */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "12px 10px", margin: "14px 16px 0", display: "flex", alignItems: "stretch" }}>
        {[
          { label: "待审核", n: mCounts.submitted, color: "#D9A03D" },
          { label: "已通过", n: mCounts.approved, color: "#3E8E63" },
          { label: "已退回", n: mCounts.returned, color: "#C4615A" },
          { label: "未填写", n: mCounts.unfilled, color: "#A8B4BD" },
        ].map((s, i) => (
          <div key={s.label} style={{ flex: 1, textAlign: "center", borderLeft: i > 0 ? "1px solid var(--color-border)" : "none" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>{s.n}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: ".08em", color: "var(--color-muted)", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 状态筛选 tabs */}
      <div className="m-pad-x" style={{ paddingTop: 12 }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {mFilterTabs.map(t => (
            <button key={t.k} onClick={() => setMFilter(t.k)}
              style={{
                flex: "none", minHeight: 34, padding: "5px 13px", borderRadius: 999, cursor: "pointer",
                fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                border: mFilter === t.k ? "1.5px solid var(--color-accent)" : "1.5px solid var(--color-border-strong)",
                background: mFilter === t.k ? "var(--color-accent-subtle)" : "var(--color-surface)",
                color: mFilter === t.k ? "var(--color-accent-hover)" : "var(--color-fg-secondary)",
              }}>
              {t.label}<span style={{ fontFamily: "var(--font-mono)", fontSize: 10, marginLeft: 4, opacity: .75 }}>{t.n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 列表（带填写摘要 + 状态灯） */}
      <div className="m-pad-x m-section-gap">
        <div className="m-section-head">
          <span className="m-eyebrow">{mFilter === "submitted" ? "审核队列" : "成员列表"}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)" }}>{mList.length} 人</span>
        </div>
        {mList.length === 0 ? (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "36px 16px", textAlign: "center", color: "var(--color-muted)", fontSize: 12 }}>
            该状态下暂无成员
          </div>
        ) : (
          <div className="m-rlist">
            {mList.map((c, i) => {
              const clickable = !!c.sectionId
              const chipCls = mChip[c.status] || "none"
              const row = (
                <>
                  <span className="sec">{c.name[0]}</span>
                  <span className="body">
                    <span className="nm">{c.name}</span>
                    <span className="rv">
                      <span style={{ color: "var(--color-muted)" }}>{c.studentId}</span>
                      {c.submittedAt && <span> · </span>}
                      {c.submittedAt && <span style={{ color: "var(--color-muted-light)" }}>{fmtTime(c.submittedAt)}</span>}
                    </span>
                    <span className="rv" style={{ color: "#4A7C96", marginTop: 2 }}>{"(c) => `${c.summary || \"未填写内容\"} · 得分 ${c.score != null ? c.score.toFixed(2) : \"—\"}`"}</span>
                  </span>
                  <span className={`chip ${chipCls}`}><span className="lamp" />{mChipTxt[c.status] || c.status}</span>
                  {clickable && <span className="chev"><ChevronRight size={14} /></span>}
                </>
              )
              return clickable
                ? <Link key={c.id} href={`/zongce/review/${c.sectionId}?from=f`} className="m-rrow fx-item" style={{ animationDelay: `${i * 40}ms` }}>{row}</Link>
                : <div key={c.id} className="m-rrow fx-item" style={{ animationDelay: `${i * 40}ms`, opacity: .75 }}>{row}</div>
            })}
          </div>
        )}
      </div>

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        各板块待审核提交在此汇总 · 通过后分数即时生效<br /><b style={{ color: "var(--color-muted)" }}>F 奖惩附加</b> · {year} 学年
      </div>
    </div>
  )

  return (
    <>
      {mobileView}
      <div className="reviewF-desktop">
      <main className="zc-wrap">
      <button className="btn-ghost" onClick={() => router.push("/zongce")} style={{ marginBottom: 20 }}>
        <ArrowLeft size={14} /> 返回
      </button>
      <div className="eyebrow">奖惩附加审核</div>
      <h1 className="display" style={{ display: "block", marginBottom: 20 }}>F 审核仪表盘</h1>

      {!loaded ? (
        <div style={{ color: "#7A8A94", padding: "20px 0" }}>加载数据中...</div>
      ) : (
        <>
          <div className="stats-row" style={{ marginBottom: 16 }}>
            <div className="stat"><div className="num accent">{cards.length}</div><div className="lbl">全班</div></div>
            <div className="stat"><div className="num" style={{ color: "#C7924B" }}>{count("submitted")}</div><div className="lbl">待审核</div></div>
            <div className="stat"><div className="num" style={{ color: "#5A8C6F" }}>{count("approved")}</div><div className="lbl">已通过</div></div>
            <div className="stat"><div className="num" style={{ color: "#C4615A" }}>{count("returned")}</div><div className="lbl">已退回</div></div>
            <div className="stat"><div className="num" style={{ color: "#A8B4BD" }}>{count("not_started")}</div><div className="lbl">未提交</div></div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} className="tag" style={{
                  cursor: "pointer",
                  background: filter === f.key ? "#3D5A6E" : "#F9F8F5",
                  color: filter === f.key ? "#fff" : "#7A8A94",
                  border: `1px solid ${filter === f.key ? "#3D5A6E" : "#E8E3D9"}`,
                  fontWeight: filter === f.key ? 600 : 400,
                  padding: "5px 14px", fontSize: ".72rem",
                }}>
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ position: "relative", marginLeft: "auto" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#A8B4BD" }} />
              <input className="form-input" placeholder="搜索姓名或学号..." value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ padding: "7px 12px 7px 30px", fontSize: ".78rem", width: 200 }} />
            </div>
          </div>

                    <div className="rv-list">
            {visible.length === 0 && (
              <div className="card" style={{ textAlign: "center", padding: 40, color: "#7A8A94", background: "#fff", fontSize: ".85rem" }}>
                暂无匹配的学生
              </div>
            )}
            {visible.map(c => {
              const cls = STATUS_CLASS[c.status] || "empty"
              const isActive = c.status !== "not_started"
              const timeTxt = c.status === "submitted" && c.submittedAt
                ? new Date(c.submittedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) + " 提交"
                : c.status === "returned" ? "已退回"
                : c.status === "approved" ? "已通过"
                : "未提交"
              return (
                <div key={c.id} className="rv-row" style={{ opacity: isActive ? 1 : .62 }}>
                  <Link href={c.sectionId ? `/zongce/review/${c.sectionId}?from=f` : "#"} className="rv-left" style={c.sectionId ? {} : { cursor: "default", pointerEvents: "none" }}>
                    <div className={`rv-av ${cls}`}>{c.name[0]}</div>
                    <div className="rv-who">
                      <div className="rv-name">{c.name}</div>
                      <div className="rv-meta">{c.studentId} · {timeTxt}</div>
                    </div>
                    <div className="rv-data">
                      <div className="rv-d"><div className="v">{c.score != null ? c.score.toFixed(2) : "--"}</div><div className="k">F / 10</div></div>
                    </div>
                  </Link>
                  <div className="rv-right">
                    <span className={`rv-st ${cls}`}>{STATUS_LABEL[c.status] || "未提交"}</span>
                    {c.status === "submitted" && c.sectionId && (
                      <>
                        <div className="rv-ops">
                          <button className="rv-btn pass" onClick={() => handleQuickApprove(c)} disabled={approvingId === c.id}>
                            <Check size={12} /><span>{approvingId === c.id ? "处理中" : "通过"}</span>
                          </button>
                          <button className="rv-btn rej" onClick={() => { setRejectingId(rejectingId === c.id ? null : c.id); setRejectError("") }} disabled={approvingId === c.id}>
                            <X size={12} /><span>退回</span>
                          </button>
                        </div>
                        {rejectingId === c.id && (
                          <div style={{ marginTop: 6 }}>
                            <textarea
                              rows={2}
                              placeholder="退回理由（必填）"
                              value={rejectNote}
                              onChange={e => { setRejectNote(e.target.value); setRejectError("") }}
                              style={{ width: "100%", padding: "6px 9px", fontSize: ".7rem", borderRadius: 4, border: "1px solid #E0E5EC", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                            />
                            {rejectError && <div style={{ color: "#C4615A", fontSize: ".62rem", marginTop: 4 }}>{rejectError}</div>}
                            <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                              <button onClick={() => handleReject(c)} disabled={approvingId === c.id}
                                style={{ flex: 1, padding: "5px 0", fontSize: ".68rem", borderRadius: 4, border: "none", background: "#C4615A", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                                确认退回
                              </button>
                              <button onClick={() => { setRejectingId(null); setRejectNote(""); setRejectError("") }}
                                style={{ flex: 1, padding: "5px 0", fontSize: ".68rem", borderRadius: 4, border: "1px solid #E0E5EC", background: "#fff", color: "#8A93A0", cursor: "pointer" }}>
                                取消
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {c.status === "returned" && c.sectionId && (
                      <div className="rv-ops">
                        <button className="rv-btn ghost" onClick={() => handleReopen(c)} disabled={approvingId === c.id}>
                          <Undo2 size={12} /><span>{approvingId === c.id ? "处理中" : "撤销驳回"}</span>
                        </button>
                      </div>
                    )}
                    {c.status === "approved" && c.sectionId && (
                      <div className="rv-ops">
                        <button className="rv-btn ghost" onClick={() => handleUnapprove(c)} disabled={approvingId === c.id}>
                          <Undo2 size={12} /><span>{approvingId === c.id ? "处理中" : "撤销通过"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, fontSize: ".7rem", color: "#7A8A94" }}>
            <Award size={13} /> 点击卡片查看学生填写的奖惩附加信息，核对后通过/退回
          </div>
        </>
      )}
    </main>
      </div>
    </>
  )
}
