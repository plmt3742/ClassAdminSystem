"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, ChevronRight, ShieldAlert, Trash2, Search, Users, Loader2 } from "lucide-react"
import { calcBScore } from "@/lib/zongce-utils"

interface Card {
  id: string; name: string; studentId: string
  excellentMember: boolean; partyMember: boolean; youthStudyCount: number
  score: number | null
  saving?: boolean; saved?: boolean
}

export default function BManagePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [loaded, setLoaded] = useState(false)
  const [denied, setDenied] = useState(false)
  const [query, setQuery] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const isMonitor = session?.user?.role === "admin" || (session?.user?.tags ?? []).includes("团支书")

  const load = useCallback(async () => {
    const res = await fetch("/api/zongce/b-manage")
    if (res.status === 403) { setDenied(true); setLoaded(true); return }
    if (res.ok) setCards((await res.json()).cards || [])
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    load()
    return () => { Object.values(timersRef.current).forEach(t => clearTimeout(t)) }
  }, [status, load])

  // 修改即标记并启动防抖实时保存
  const updateRow = (id: string, patch: Partial<Card>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...patch, saving: true, saved: false } : c))
    if (timersRef.current[id]) clearTimeout(timersRef.current[id])
    timersRef.current[id] = setTimeout(() => {
      const cur = cardsRef.current.find(c => c.id === id)
      if (cur) void saveRow(cur)
    }, 700)
  }

  // 保存中需要读最新 state，用 ref 镜像
  const cardsRef = useRef<Card[]>([])
  useEffect(() => { cardsRef.current = cards }, [cards])

  const saveRow = async (c: Card) => {
    const res = await fetch("/api/zongce/b-manage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: c.id,
        excellentMember: c.excellentMember,
        partyMember: c.partyMember,
        youthStudyCount: c.youthStudyCount,
      }),
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok) {
      setCards(prev => prev.map(x => x.id === c.id ? { ...x, saving: false, saved: true, score: d.score ?? x.score } : x))
    } else {
      alert(d.error || "保存失败")
      setCards(prev => prev.map(x => x.id === c.id ? { ...x, saving: false } : x))
    }
  }

  // 删除该同学的 B 评定（恢复未评定）
  const deleteRow = async (c: Card) => {
    if (!confirm(`删除 ${c.name}（${c.studentId}）的 B 集会学习评定？\n该同学将恢复为「未评定」状态。`)) return
    if (timersRef.current[c.id]) clearTimeout(timersRef.current[c.id])
    const res = await fetch(`/api/zongce/b-manage?userId=${c.id}`, { method: "DELETE" })
    if (res.ok) {
      setCards(prev => prev.map(x => x.id === c.id ? { ...x, excellentMember: false, partyMember: false, youthStudyCount: 0, score: null, saving: false, saved: false } : x))
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || "删除失败")
    }
  }

  const stats = useMemo(() => {
    const excellent = cards.filter(c => c.excellentMember).length
    const party = cards.filter(c => c.partyMember).length
    const totalYouth = cards.reduce((s, c) => s + c.youthStudyCount, 0)
    const scored = cards.filter(c => c.score != null)
    const avgScore = scored.length > 0 ? scored.reduce((s, c) => s + (c.score || 0), 0) / scored.length : 0
    return { excellent, party, avgYouth: cards.length > 0 ? totalYouth / cards.length : 0, avgScore }
  }, [cards])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? cards.filter(c => c.name.toLowerCase().includes(q) || c.studentId.includes(q)) : cards
    return list
  }, [cards, query])

  if (status === "loading") return <div style={{ textAlign: "center", padding: 60, color: "#7A8A94" }}>加载中...</div>
  if (!session) return null

  if (denied || !isMonitor) {
    return (
      <main className="zc-wrap">
        <button className="btn-ghost" onClick={() => router.push("/zongce")} style={{ marginBottom: 20 }}>
          <ArrowLeft size={14} /> 返回
        </button>
        <div className="card" style={{ textAlign: "center", padding: "60px 40px", background: "#fff" }}>
          <ShieldAlert size={32} style={{ color: "#A8B4BD", marginBottom: 12 }} />
          <h2 style={{ marginBottom: 8 }}>无权访问</h2>
          <p style={{ color: "#7A8A94", fontSize: ".88rem" }}>仅团支书或管理员可评定 B 集会政治学习</p>
        </div>
      </main>
    )
  }

  // ===== 移动版（设计稿 review-list.html 变体 · 团支书逐人评定，≤640px 显示） =====
  const year = "2025-2026"
  const mobileView = (
    <div className="m-page-root">
      <header className="m-topbar">
        <Link className="m-back" href="/zongce" aria-label="返回综测"><ArrowLeft size={18} /></Link>
        <span className="m-title">集会政治学习<small>B REVIEW</small></span>
        <span className="m-year">{year}</span>
      </header>

      {/* 说明卡：本板块由团支书评定填写 */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "14px 16px", margin: "14px 16px 0" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".14em", color: "var(--color-muted)", textTransform: "uppercase", marginBottom: 6 }}>B · 团支书评定</div>
        <div style={{ fontSize: 12.5, color: "var(--color-fg-secondary)", lineHeight: 1.7 }}>
          本板块由团支书逐人评定填写：基础 1.5 分 + 青年大学习每累计 3 期 +0.2 分（15 期满分 2.5 分）· 优秀团员、党支部工作小组成员仅勾选标记，不计分
        </div>
      </div>

      {/* 学生列表（逐人评定入口） */}
      <div className="m-pad-x m-section-gap">
        <div className="m-section-head">
          <span className="m-eyebrow">学生评定</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)" }}>{visible.length} 人</span>
        </div>
        <div className="m-rlist">
          {visible.map((c, i) => {
            const open = openId === c.id
            const preview = calcBScore({ excellentMember: c.excellentMember, partyMember: c.partyMember, youthStudyCount: c.youthStudyCount })
            const stateChip = c.saving
              ? <span className="chip pending"><span className="lamp" />保存中</span>
              : c.saved
                ? <span className="chip ok"><span className="lamp" />已保存</span>
                : c.score != null
                  ? <span className="chip ok"><span className="lamp" />已评定</span>
                  : <span className="chip none"><span className="lamp" />未评定</span>
            return (
              <div key={c.id} className="fx-item" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="m-rrow" role="button" tabIndex={0}
                  onClick={() => setOpenId(open ? null : c.id)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenId(open ? null : c.id) } }}
                  style={{ cursor: "pointer" }}>
                  <span className="sec">{c.name[0]}</span>
                  <span className="body">
                    <span className="nm">{c.name}</span>
                    <span className="rv">{c.studentId}</span>
                  </span>
                  {stateChip}
                  <span className="chev" style={{ transform: open ? "rotate(90deg)" : undefined, transition: "transform .18s" }}><ChevronRight size={14} /></span>
                </div>
                {open && (
                  <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderTop: "none", borderRadius: "0 0 6px 6px", padding: "12px 13px", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "var(--color-muted)" }}>评定得分</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: preview >= 2.5 ? "var(--color-success)" : "var(--color-accent-hover)" }}>
                        {preview.toFixed(2)}<span style={{ fontSize: 9, fontWeight: 400, color: "var(--color-muted)" }}> / 2.5</span>
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => updateRow(c.id, { excellentMember: !c.excellentMember })}
                        style={{ flex: 1, minHeight: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer", border: `1.5px solid ${c.excellentMember ? "#C7924B" : "var(--color-border-strong)"}`, background: c.excellentMember ? "#C7924B" : "#fff", color: c.excellentMember ? "#fff" : "var(--color-muted)" }}>
                        {c.excellentMember && <Check size={13} strokeWidth={3} />}优秀团员
                      </button>
                      <button onClick={() => updateRow(c.id, { partyMember: !c.partyMember })}
                        style={{ flex: 1, minHeight: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer", border: `1.5px solid ${c.partyMember ? "#5B8E9E" : "var(--color-border-strong)"}`, background: c.partyMember ? "#5B8E9E" : "#fff", color: c.partyMember ? "#fff" : "var(--color-muted)" }}>
                        {c.partyMember && <Check size={13} strokeWidth={3} />}党支部成员
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <label style={{ fontSize: 12, color: "var(--color-fg-secondary)", flex: 1 }}>青年大学习</label>
                      <input type="number" step={1} min={0} max={200} value={c.youthStudyCount || ""} placeholder="0"
                        onChange={e => updateRow(c.id, { youthStudyCount: Math.max(0, Math.min(200, Math.round(Number(e.target.value) || 0))) })}
                        onKeyDown={e => e.stopPropagation()}
                        style={{ width: 72, height: 38, border: "1.5px solid var(--color-border-strong)", borderRadius: 6, textAlign: "center", fontSize: 14, fontFamily: "var(--font-mono)", outline: "none", background: "#FDFDFC" }} />
                      <span style={{ fontSize: 11, color: "var(--color-muted)" }}>期</span>
                    </div>
                    <button onClick={() => deleteRow(c)}
                      style={{ minHeight: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, borderRadius: 6, cursor: "pointer", color: "#C4615A", border: "1px solid rgba(196,97,90,.4)", background: "var(--color-danger-bg)", fontWeight: 500 }}>
                      <Trash2 size={13} /> 删除评定
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        评定保存后立即生效并计入品行表现分（M）<br /><b style={{ color: "var(--color-muted)" }}>集会政治学习</b> · {year} 学年
      </div>
    </div>
  )

  return (
    <>
      {mobileView}
      <div className="reviewB-desktop">
      <main className="zc-wrap">
      <button className="btn-ghost" onClick={() => router.push("/zongce")} style={{ marginBottom: 20 }}>
        <ArrowLeft size={14} /> 返回综测
      </button>
      <div style={{ marginBottom: 16 }}>
        <div className="eyebrow">审核管理</div>
        <h1 className="display" style={{ display: "block" }}>B 集会政治学习评定</h1>
        <div style={{ fontSize: ".75rem", color: "#7A8A94", marginTop: 4 }}>
          团支书评定：基础 1.5 分 + 青年大学习每累计 3 期 +0.2 分（15 期满分 2.5 分）· 优秀团员、党支部工作小组成员仅勾选标记，不计分 · 修改后自动保存
        </div>
      </div>

      {/* 统计 */}
      <div className="stats-row" style={{ marginBottom: 16 }}>
        <div className="stat"><div className="num accent">{cards.length}</div><div className="lbl">全班</div></div>
        <div className="stat"><div className="num" style={{ color: "#C7924B" }}>{stats.excellent}</div><div className="lbl">优秀团员</div></div>
        <div className="stat"><div className="num" style={{ color: "#5B8E9E" }}>{stats.party}</div><div className="lbl">党支部成员</div></div>
        <div className="stat"><div className="num" style={{ color: "#3D5A6E" }}>{stats.avgYouth.toFixed(2)}</div><div className="lbl">人均青年大学习(期)</div></div>
        <div className="stat"><div className="num" style={{ color: "#5A8C6F" }}>{stats.avgScore.toFixed(2)}</div><div className="lbl">平均 B 得分</div></div>
      </div>

      {/* 搜索 */}
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 260 }}>
        <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#A8B4BD" }} />
        <input className="form-input" placeholder="搜索姓名或学号..." value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ padding: "8px 12px 8px 30px", fontSize: ".78rem" }} />
      </div>

      {!loaded ? (
        <div style={{ color: "#7A8A94", padding: "20px 0" }}>加载数据中...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".8rem", minWidth: 720 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E8E3D9", background: "#F9F8F5" }}>
                <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, color: "#7A8A94", fontSize: ".63rem" }}>学生</th>
                <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: 600, color: "#7A8A94", fontSize: ".63rem" }}>优秀团员</th>
                <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: 600, color: "#7A8A94", fontSize: ".63rem" }}>党支部工作小组成员</th>
                <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: 600, color: "#7A8A94", fontSize: ".63rem" }}>青年大学习（期）</th>
                <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: 600, color: "#7A8A94", fontSize: ".63rem" }}>得分</th>
                <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: 600, color: "#7A8A94", fontSize: ".63rem" }}>状态</th>
                <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 600, color: "#7A8A94", fontSize: ".63rem" }}>删除</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(c => {
                const preview = calcBScore({ excellentMember: c.excellentMember, partyMember: c.partyMember, youthStudyCount: c.youthStudyCount })
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid #F1F0EC" }}>
                    <td style={{ padding: "8px 14px" }}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: ".62rem", color: "#A8B4BD" }}>{c.studentId}</div>
                    </td>
                    <td style={{ textAlign: "center", padding: "8px 8px" }}>
                      <button
                        onClick={() => updateRow(c.id, { excellentMember: !c.excellentMember })}
                        title={c.excellentMember ? "已勾选（点击取消）" : "点击勾选"}
                        style={{
                          width: 22, height: 22, borderRadius: 6, cursor: "pointer",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          border: `1.5px solid ${c.excellentMember ? "#C7924B" : "#D8DEE3"}`,
                          background: c.excellentMember ? "#C7924B" : "#fff",
                          transition: "all .15s",
                        }}
                      >
                        {c.excellentMember && <Check size={14} color="#fff" strokeWidth={3} />}
                      </button>
                    </td>
                    <td style={{ textAlign: "center", padding: "8px 8px" }}>
                      <button
                        onClick={() => updateRow(c.id, { partyMember: !c.partyMember })}
                        title={c.partyMember ? "已勾选（点击取消）" : "点击勾选"}
                        style={{
                          width: 22, height: 22, borderRadius: 6, cursor: "pointer",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          border: `1.5px solid ${c.partyMember ? "#5B8E9E" : "#D8DEE3"}`,
                          background: c.partyMember ? "#5B8E9E" : "#fff",
                          transition: "all .15s",
                        }}
                      >
                        {c.partyMember && <Check size={14} color="#fff" strokeWidth={3} />}
                      </button>
                    </td>
                    <td style={{ textAlign: "center", padding: "8px 8px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <input type="number" step={1} min={0} max={200} value={c.youthStudyCount || ""}
                          placeholder="0"
                          onChange={e => updateRow(c.id, { youthStudyCount: Math.max(0, Math.min(200, Math.round(Number(e.target.value) || 0))) })}
                          style={{ width: 68, height: 32, border: "1.5px solid #E3E7EB", borderRadius: 8, textAlign: "center", fontSize: ".78rem", fontFamily: "'JetBrains Mono',monospace", outline: "none", background: "#FDFDFC" }} />
                        <span style={{ fontSize: ".6rem", color: "#A8B4BD" }}>期</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center", padding: "8px 8px" }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: ".85rem", color: preview >= 2.5 ? "#5A8C6F" : "#3D5A6E" }}>
                        {c.score != null || c.excellentMember || c.partyMember || c.youthStudyCount > 0 ? preview.toFixed(2) : "--"}
                      </span>
                      <span style={{ fontSize: ".58rem", color: "#A8B4BD" }}>/2.5</span>
                    </td>
                    <td style={{ textAlign: "center", padding: "8px 8px" }}>
                      {c.saving ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".66rem", color: "#C7924B" }}>
                          <Loader2 size={11} /> 保存中...
                        </span>
                      ) : c.saved ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".66rem", color: "#5A8C6F" }}>
                          <Check size={11} /> 已保存
                        </span>
                      ) : (
                        <span style={{ fontSize: ".66rem", color: "#A8B4BD" }}>未评定</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center", padding: "8px 14px" }}>
                      <button onClick={() => deleteRow(c)}
                        className="btn-ghost" title="删除评定"
                        style={{ color: "#C4615A", border: "1px solid rgba(196,97,90,.4)", padding: "4px 9px", fontSize: ".64rem", minHeight: 26 }}>
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, fontSize: ".7rem", color: "#7A8A94" }}>
        <Users size={13} />
        评定保存后立即生效并计入品行表现分（M），学生可在「B 集会政治学习」页面查看自己的得分明细
      </div>
    </main>
      </div>
    </>
  )
}
