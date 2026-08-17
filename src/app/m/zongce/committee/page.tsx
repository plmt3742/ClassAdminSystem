"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Lock, Info, PencilLine, Send } from "lucide-react"
import { DEFAULT_YEAR, RATING_MAX, RATING_MIN } from "@/lib/committee"
import MobTopBar from "../../_components/MobTopBar"
import MobCard from "../../_components/MobCard"
import MobButton from "../../_components/MobButton"
import MobAvatar from "../../_components/MobAvatar"
import MobLoading from "../../_components/MobLoading"
import MobYearBadge from "../../_components/MobYearBadge"
import { useToast } from "../../_components/MobToast"

interface Member {
  name: string
  role: string
  targetId: string | null
}

export default function MobileCommitteePage() {
  const { data: session, status } = useSession()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [version, setVersion] = useState(0)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [mode, setMode] = useState<"edit" | "receipt">("edit")
  const [locked, setLocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [year, setYear] = useState(DEFAULT_YEAR)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch(`/api/zongce/committee?year=${DEFAULT_YEAR}`)
      .then(r => r.json())
      .then(d => {
        setMembers(d.members || [])
        setScores(d.mine || {})
        setVersion(d.currentVersion || 0)
        setSubmittedAt(d.submittedAt || null)
        setSubmittedCount(d.submittedCount || 0)
        setLocked(!!d.locked)
        setYear(d.year || DEFAULT_YEAR)
        if ((d.submittedCount || 0) > 0) setMode("receipt")
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  const filled = members.filter(m => m.targetId && scores[m.targetId] != null).length

  const handleSubmit = async () => {
    if (saving) return
    const missing = members.filter(m => !m.targetId || scores[m.targetId] == null)
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
      if (!res.ok) {
        setError(d.error || "提交失败")
        return
      }
      setVersion(d.version || version + 1)
      setSubmittedAt(d.submittedAt || new Date().toISOString())
      setSubmittedCount(12)
      setMode("receipt")
      toast.success("评分已提交")
    } catch {
      setError("网络异常，请重试")
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="mob-page">
        <MobTopBar back title="班委民主评议" right={<MobYearBadge year={DEFAULT_YEAR} />} />
        <MobLoading rows={8} />
      </div>
    )
  }
  if (!session) return null

  const receiptView = (
    <>
      <MobCard title="评分报单" extra={<span style={{ fontSize: 12, color: "var(--fg-3)" }}>第 {version} 次提交</span>} padding={false}>
        {submittedAt && (
          <div style={{ padding: "10px 16px", fontSize: 12, color: "var(--fg-3)", borderBottom: "1px solid var(--border)" }}>
            {new Date(submittedAt).toLocaleString("zh-CN")}
          </div>
        )}
        {members.map(m => {
          const v = m.targetId ? scores[m.targetId] : null
          return (
            <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: "1px solid var(--border)" }}>
              <MobAvatar name={m.name} size="sm" />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{m.name}</span>
                <span style={{ display: "block", marginTop: 1, fontSize: 11, color: "var(--fg-3)" }}>{m.role}</span>
              </span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: v != null ? "var(--primary)" : "var(--fg-3)", flex: "none" }}>
                {v != null ? v : "—"}
              </span>
            </div>
          )
        })}
      </MobCard>
      <MobButton block variant="ghost" onClick={() => setMode("edit")} disabled={locked}>
        <PencilLine size={15} /> 修改评分
      </MobButton>
      <div style={{ textAlign: "center", fontSize: 11, color: "var(--fg-3)" }}>
        评分独立互不可见 · 计分以最后一次提交为准
      </div>
    </>
  )

  const editView = (
    <>
      <MobCard title={`评议对象 · ${members.length} 人`} extra={<span style={{ fontSize: 12, color: "var(--fg-3)" }}>已评 {filled}/{members.length}</span>} padding={false}>
        {members.map(m => {
          const tid = m.targetId
          const raw = tid ? scores[tid] : undefined
          const val = raw ?? 0
          return (
            <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{m.name}</div>
                <div style={{ marginTop: 1, fontSize: 11, color: "var(--fg-3)" }}>{m.role}</div>
              </div>
              <input
                type="range"
                min={RATING_MIN}
                max={RATING_MAX}
                step={1}
                value={val}
                disabled={!tid || locked}
                aria-label={`${m.name}评分`}
                onChange={e => {
                  if (!tid) return
                  const n = Number(e.target.value)
                  setScores(s => ({ ...s, [tid]: n }))
                }}
                style={{ flex: 1, minWidth: 0, accentColor: "var(--primary)" }}
              />
              <span style={{ width: 40, textAlign: "center", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: raw != null ? "var(--primary)" : "var(--fg-3)", flex: "none" }}>
                {raw != null ? raw : "—"}
              </span>
            </div>
          )
        })}
      </MobCard>

      {error && (
        <div style={{ background: "rgba(196,97,90,0.1)", border: "1px solid rgba(196,97,90,0.3)", borderRadius: 12, padding: "10px 12px", fontSize: 12.5, color: "var(--danger)", lineHeight: 1.5 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--fg-3)" }}>
        <span>评分范围 {RATING_MIN}-{RATING_MAX} · 整数</span>
        {version > 0 && submittedAt ? <span>上次提交：第 {version} 次</span> : <span>尚未提交</span>}
      </div>
      <MobButton block onClick={handleSubmit} loading={saving} disabled={locked}>
        <Send size={15} /> {saving ? "提交中..." : version > 0 ? "提交新评分" : "提交评分"}
      </MobButton>
    </>
  )

  return (
    <div className="mob-page" style={{ paddingBottom: 24 }}>
      <MobTopBar back title="班委民主评议" right={<MobYearBadge year={year} />} />

      {/* 匿名测评说明 */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "var(--primary-soft)", borderRadius: 12, padding: "12px 14px" }}>
        <Info size={16} style={{ color: "var(--primary)", flex: "none", marginTop: 2 }} />
        <div style={{ fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.7 }}>
          全员匿名 · 互不可见 · 评分取 <b style={{ fontFamily: "var(--font-num)", color: "var(--primary)" }}>0-100</b> 整数，提交后仍可修改，以最后一次为准。
        </div>
      </div>

      {/* 已锁定提示 */}
      {locked && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(196,97,90,0.1)", border: "1px solid rgba(196,97,90,0.3)", borderRadius: 12, padding: "10px 12px", fontSize: 12.5, color: "var(--danger)", lineHeight: 1.5 }}>
          <Lock size={14} style={{ flex: "none" }} />
          <span>测评已锁定，仅可查看 · 本次班委民主评议已结束，评分已锁定，不再接受提交或修改</span>
        </div>
      )}

      {mode === "receipt" ? receiptView : editView}

      <div style={{ textAlign: "center", padding: "6px 16px 0", fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.04em" }}>
        评议结果仅班委可见 · 学年结束后汇总公示
      </div>
    </div>
  )
}
