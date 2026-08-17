"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Send, PencilLine, Users, CheckCircle2, Receipt, Lock, Info, Check } from "lucide-react"
import { COMMITTEE_MEMBERS, DEFAULT_YEAR, RATING_MAX, RATING_MIN } from "@/lib/committee"

interface Member {
  name: string
  role: string
  targetId: string | null
}

export default function CommitteeRatePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const year = (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("year")) || DEFAULT_YEAR

  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [version, setVersion] = useState(0)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [mode, setMode] = useState<"edit" | "receipt">("edit")
  const [locked, setLocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status !== "authenticated") return
    fetch(`/api/zongce/committee?year=${year}`)
      .then(r => r.json())
      .then(d => {
        setMembers(d.members || [])
        setScores(d.mine || {})
        setVersion(d.currentVersion || 0)
        setSubmittedAt(d.submittedAt || null)
        setLocked(!!d.locked)
        // 已提交过 → 直接进入报单视图
        if (d.submittedCount > 0) setMode("receipt")
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [status, year])

  const filled = members.filter(m => m.targetId && scores[m.targetId] != null).length

  const handleSubmit = async () => {
    if (saving) return
    const missing = members.filter(m => !m.targetId || scores[m.targetId] == null || scores[m.targetId] === undefined)
    if (missing.length > 0) {
      setError(`还有 ${missing.length} 位班委未打分（${missing.map(m => m.name).join("、")}）`)
      return
    }
    const invalid = members.filter(m => {
      const v = Number(scores[m.targetId!])
      return !Number.isInteger(v) || v < RATING_MIN || v > RATING_MAX
    })
    if (invalid.length > 0) {
      setError(`分数须为 ${RATING_MIN}-${RATING_MAX} 的整数（${invalid.map(m => m.name).join("、")}）`)
      return
    }
    setError("")
    setSaving(true)
    try {
      const payload = members.map(m => ({ targetId: m.targetId!, score: Number(scores[m.targetId!]) }))
      const res = await fetch(`/api/zongce/committee?year=${year}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: payload }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || "提交失败"); return }
      setVersion(d.version || version + 1)
      setSubmittedAt(d.submittedAt || new Date().toISOString())
      setMode("receipt")
    } catch {
      setError("网络异常，请重试")
    } finally {
      setSaving(false)
    }
  }

  /* 移动版提交：校验与 PUT 同桌面，成功后跳回综测看板 */
  const handleMobileSubmit = async () => {
    if (saving) return
    const missing = members.filter(m => !m.targetId || scores[m.targetId] == null || scores[m.targetId] === undefined)
    if (missing.length > 0) {
      setError(`还有 ${missing.length} 位班委未打分（${missing.map(m => m.name).join("、")}）`)
      return
    }
    const invalid = members.filter(m => {
      const v = Number(scores[m.targetId!])
      return !Number.isInteger(v) || v < RATING_MIN || v > RATING_MAX
    })
    if (invalid.length > 0) {
      setError(`分数须为 ${RATING_MIN}-${RATING_MAX} 的整数（${invalid.map(m => m.name).join("、")}）`)
      return
    }
    setError("")
    setSaving(true)
    try {
      const payload = members.map(m => ({ targetId: m.targetId!, score: Number(scores[m.targetId!]) }))
      const res = await fetch(`/api/zongce/committee?year=${year}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: payload }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || "提交失败"); return }
      router.push("/zongce")
    } catch {
      setError("网络异常，请重试")
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading" || loading) return <p style={{ textAlign: "center", padding: 80, color: "#7A8A94" }}>加载中...</p>
  if (!session) return null

  const user = session.user

  // ===== 移动版（设计稿 committee.html · 真实 API，≤640px 显示） =====
  const mobileView = (
    <div className="m-page-root">
      <header className="m-topbar">
        <Link className="m-back" href="/zongce" aria-label="返回综测"><ArrowLeft size={18} /></Link>
        <span className="m-title">班委民主评议<small>RATING</small></span>
        <span className="m-year">{year}</span>
      </header>

      {/* 说明卡 */}
      <div style={{
        background: "var(--color-accent-subtle)", border: "1px solid rgba(59,107,138,.22)",
        borderRadius: 6, padding: "12px 14px", margin: "14px 16px 0",
        display: "flex", gap: 10, alignItems: "flex-start",
      }}>
        <Info size={16} style={{ flex: "none", marginTop: 2, color: "var(--color-accent)" }} />
        <div style={{ fontSize: 12, color: "var(--color-fg-secondary)", lineHeight: 1.6 }}>
          全员匿名 · 互不可见 · 评分取 <b style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-accent-hover)", fontWeight: 600 }}>0-100</b> 整数，提交后仍可修改，以最后一次为准。
        </div>
      </div>

      {error && (
        <div style={{
          margin: "10px 16px 0", padding: "9px 12px", borderRadius: 6,
          background: "var(--color-danger-bg)", border: "1px solid rgba(220,38,38,.3)",
          fontSize: 11.5, color: "var(--color-danger)", lineHeight: 1.5,
        }}>{error}</div>
      )}
      {locked && (
        <div style={{
          margin: "10px 16px 0", padding: "10px 12px", borderRadius: 6,
          background: "var(--color-danger-bg)", border: "1px solid rgba(220,38,38,.3)",
          fontSize: 11.5, color: "var(--color-danger)", lineHeight: 1.5,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Lock size={13} /> 本次班委民主评议已结束，评分已锁定，不再接受提交或修改
        </div>
      )}

      {/* 打分列表（12 人） */}
      <section style={{ padding: "18px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{
            display: "flex", alignItems: "center", gap: 9,
            fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700,
            letterSpacing: ".18em", textTransform: "uppercase", color: "var(--color-muted)",
          }}>评议对象</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)" }}>{members.length} 人</span>
        </div>
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "4px 16px 8px" }}>
          {members.map(m => {
            const raw = m.targetId ? scores[m.targetId] : undefined
            return (
              <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 2px", borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--color-fg)" }}>{m.name}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted)", letterSpacing: ".02em", marginTop: 1 }}>{m.role}</div>
                </div>
                <input
                  type="number" min={RATING_MIN} max={RATING_MAX} step={1} inputMode="numeric"
                  placeholder="0" aria-label={`${m.name}评分`}
                  value={raw ?? ""}
                  disabled={!m.targetId || locked}
                  onChange={e => {
                    const tid = m.targetId
                    if (!tid) return
                    const val = e.target.value
                    if (val === "") { setScores(s => ({ ...s, [tid]: null as unknown as number })); return }
                    const n = Number(val)
                    if (!Number.isFinite(n)) return
                    const clamped = Math.min(RATING_MAX, Math.max(RATING_MIN, Math.trunc(n)))
                    setScores(s => ({ ...s, [tid]: clamped }))
                  }}
                  style={{
                    width: 60, height: 38, flex: "none",
                    border: "1px solid var(--color-border-strong)", borderRadius: 6,
                    background: "#fff", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
                    textAlign: "center", color: "var(--color-fg)", outline: "none",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-glow)" }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.boxShadow = "none" }}
                />
              </div>
            )
          })}
        </div>
      </section>

      {/* 底部计数 + 提交（吸底，位于 TabBar 之上） */}
      <div style={{
        position: "sticky", bottom: "calc(58px + env(safe-area-inset-bottom))", zIndex: 50,
        background: "rgba(247,248,250,.94)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        padding: "10px 16px 12px", borderTop: "1px solid var(--color-border)",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--color-accent-hover)" }}>
            已评 {filled} <small style={{ fontSize: 10, color: "var(--color-muted)", fontWeight: 400 }}>/ {members.length}</small>
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--color-muted-light)", letterSpacing: ".04em" }}>评分范围 0-100 · 整数</span>
        </div>
        <button className="btn-primary" style={{ width: "100%" }} onClick={handleMobileSubmit} disabled={saving || locked}>
          <Check size={14} /> {saving ? "提交中..." : version > 0 ? "更新评分" : "提交评分"}
        </button>
      </div>

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        评议结果仅班委可见 · 学年结束后汇总公示<br /><b style={{ color: "var(--color-muted)", fontWeight: 600 }}>班委民主评议</b> · {year} 学年
      </div>
    </div>
  )

  /* ================= 报单视图 ================= */
  if (mode === "receipt") {
    return (
      <>
      {mobileView}
      <div className="committee-desktop">
      <main className="zs-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
          <span className="zs-id-badge">{year} 学年</span>
        </div>

        <div className="zs-id">
          <div className="zs-id-avatar"><Receipt size={17} /></div>
          <div className="zs-id-info">
            <div className="zs-id-name">{(user as any)?.name} · 评分报单</div>
            <div className="zs-id-meta">
              <span><CheckCircle2 size={11} /> 第 {version} 次提交</span>
              <span>{submittedAt ? new Date(submittedAt).toLocaleString("zh-CN") : ""}</span>
            </div>
          </div>
          <button className="zs-btn zs-btn-sec" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setMode("edit")}>
            <PencilLine size={13} /> 修改评分
          </button>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".84rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E8E3D9", background: "#F9F8F5" }}>
                {["班委", "职务", "我的评分"].map(h => (
                  <th key={h} style={{ textAlign: h === "职务" ? "left" : "center", padding: "10px 12px", fontWeight: 600, color: "#7A8A94", fontSize: ".68rem", letterSpacing: ".06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const v = m.targetId ? scores[m.targetId] : null
                return (
                  <tr key={m.name} style={{ borderBottom: "1px solid #F0EEE9" }}>
                    <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 600, color: "#26323C" }}>{m.name}</td>
                    <td style={{ padding: "9px 12px", color: "#7A8A94", fontSize: ".78rem" }}>{m.role}</td>
                    <td style={{ padding: "9px 12px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "1rem", color: v != null ? "#3D5A6E" : "#B9C2CA" }}>
                      {v != null ? v : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: 14, fontSize: ".72rem", color: "#A8B4BD", textAlign: "center" }}>
          评分独立互不可见 · 计分以最后一次提交为准 · 修改记录仅班长可查
        </p>
      </main>
      </div>
      </>
    )
  }

  /* ================= 编辑视图 ================= */
  return (
    <>
    {mobileView}
    <div className="committee-desktop">
    <main className="zs-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
        <span className="zs-id-badge">{year} 学年</span>
      </div>

      <div className="zs-id">
        <div className="zs-id-avatar">{(user as any)?.name?.[0] || "?"}</div>
        <div className="zs-id-info">
          <div className="zs-id-name">{(user as any)?.name}</div>
          <div className="zs-id-meta">
            <span><Users size={11} /> 班委民主评议</span>
            <span><CheckCircle2 size={11} /> {filled}/{members.length} 已打分</span>
          </div>
        </div>
        <span className="zs-id-badge">{version > 0 ? `已提交 · 第 ${version} 次` : "未提交"}</span>
      </div>

      {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* 已锁定提示 */}
      {locked && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
          padding: "12px 16px", borderRadius: 8, background: "#FDF3F2",
          border: "1px solid rgba(196,97,90,.35)", fontSize: ".78rem", color: "#C4615A",
        }}>
          <Lock size={14} /> 本次班委民主评议已结束，评分已锁定，不再接受提交或修改
        </div>
      )}

      {/* 评分区间提示 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
        padding: "10px 16px", borderRadius: 8, background: "#fff",
        border: "1px solid #E0E5EC", fontSize: ".75rem", color: "#556773",
      }}>
        <span style={{ fontFamily: "'JetBrains Mono',Consolas,monospace", fontWeight: 700, color: "#3D5A6E", fontSize: ".85rem" }}>0 — 100 分</span>
        <span style={{ width: 1, height: 12, background: "#E0E5EC" }} />
        <span>整数打分 · 互不可见 · 提交后可修改，以最后一次为准</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, marginBottom: 20 }}>
        {members.map(m => {
          const raw = m.targetId ? scores[m.targetId] : undefined
          const filledNow = raw != null && raw !== undefined
          return (
            <div key={m.name} className="card" style={{ background: "#fff", padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", flex: "none",
                background: filledNow ? "#EBEFF5" : "#F3F4F6", border: `1.5px solid ${filledNow ? "#4A7C96" : "#D8DEE3"}`,
                color: filledNow ? "#3D5A6E" : "#A8B4BD",
                fontFamily: "Georgia,'Songti SC',serif", fontWeight: 700, fontSize: 15,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{m.name[0]}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: ".9rem", fontWeight: 700, color: "#26323C" }}>{m.name}</div>
                <div style={{ fontSize: ".7rem", color: "#7A8A94", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.role}</div>
              </div>
              <input
                type="number" min={RATING_MIN} max={RATING_MAX} step={1}
                placeholder="0-100" value={raw ?? ""}
                disabled={!m.targetId}
                onChange={e => {
                  const tid = m.targetId
                  if (!tid) return
                  const val = e.target.value
                  if (val === "") { setScores(s => ({ ...s, [tid]: null as unknown as number })); return }
                  const n = Number(val)
                  if (!Number.isFinite(n)) return
                  // 前端钳制 0-100 + 取整（输入超范围/小数立即修正）
                  const clamped = Math.min(RATING_MAX, Math.max(RATING_MIN, Math.trunc(n)))
                  setScores(s => ({ ...s, [tid]: clamped }))
                }}
                style={{
                  width: 74, textAlign: "center", fontFamily: "'JetBrains Mono',monospace",
                  fontSize: "1rem", fontWeight: 700, color: filledNow ? "#3D5A6E" : "#A8B4BD",
                  padding: "7px 4px", border: "1.5px solid #E3E7EB", borderRadius: 8, outline: "none",
                  background: "#fff", transition: "border-color .15s",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "#4A7C96"}
                onBlur={e => e.currentTarget.style.borderColor = "#E3E7EB"}
              />
            </div>
          )
        })}
      </div>

      <div className="zs-actions">
        <span style={{ fontSize: ".75rem", color: "#7A8A94", marginRight: "auto" }}>
          {version > 0 && submittedAt ? `上次提交：第 ${version} 次 · ${new Date(submittedAt).toLocaleString("zh-CN")}（可修改重交）` : "尚未提交"}
        </span>
        <button className="zs-btn zs-btn-pri" onClick={handleSubmit} disabled={saving}>
          <Send size={14} /> {saving ? "提交中..." : version > 0 ? "提交新评分" : "提交评分"}
        </button>
      </div>
    </main>
    </div>
    </>
  )
}
