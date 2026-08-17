"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { Minus, Plus, Trash2, Users } from "lucide-react"
import { calcBScore, FORM_LOCKED } from "@/lib/zongce-utils"
import MobTopBar from "../../_components/MobTopBar"
import MobButton from "../../_components/MobButton"
import MobChip from "../../_components/MobChip"
import MobConfirm from "../../_components/MobConfirm"
import MobEmpty from "../../_components/MobEmpty"
import MobLoading from "../../_components/MobLoading"
import MobRoleGate from "../../_components/MobRoleGate"
import MobYearBadge from "../../_components/MobYearBadge"
import { useToast } from "../../_components/MobToast"

// ============================================================
// 移动端 B 集会政治学习评定（团支书 / 管理员）
// 数据形状与 src/app/zongce/b-manage/page.tsx 一致：
//   GET /api/zongce/b-manage → { cards: [{ id, name, studentId, excellentMember, partyMember, youthStudyCount, score, sectionId }] }
//   PUT /api/zongce/b-manage → { userId, excellentMember, partyMember, youthStudyCount } → { ok, score }
//   DELETE /api/zongce/b-manage?userId=x → { ok }
// ============================================================

interface Card {
  id: string
  name: string
  studentId: string
  excellentMember: boolean
  partyMember: boolean
  youthStudyCount: number
  score: number | null
  saving?: boolean
  saved?: boolean
}

const YEAR = "2025-2026"

function Switch({ on, onToggle, disabled, label }: { on: boolean; onToggle: () => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onToggle}
      style={{
        width: 46, height: 27, borderRadius: 999, position: "relative", flexShrink: 0, padding: 0, border: "none",
        background: on ? "var(--primary)" : "var(--border-strong)",
        transition: "background var(--mob-dur) var(--mob-ease)",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      }}>
      <span style={{
        position: "absolute", top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: "50%",
        background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.2)",
        transition: "left var(--mob-dur) var(--mob-ease)",
      }} />
    </button>
  )
}

function SwitchRow({ label, sub, on, onToggle, disabled }: { label: React.ReactNode; sub?: React.ReactNode; on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.45 }}>{label}</div>
        {sub ? <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{sub}</div> : null}
      </div>
      <Switch on={on} onToggle={onToggle} disabled={disabled} label="开关" />
    </div>
  )
}

function Stepper({ value, onChange, min = 0, max = 200, disabled }: { value: number; onChange: (v: number) => void; min?: number; max?: number; disabled?: boolean }) {
  const btn: React.CSSProperties = {
    width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--fg-2)", background: "none", border: "none", fontSize: 20,
  }
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--surface-2)", flexShrink: 0, opacity: disabled ? 0.55 : 1 }}>
      <button type="button" style={btn} disabled={disabled || value <= min} aria-label="减少" onClick={() => onChange(Math.max(min, value - 1))}><Minus size={16} /></button>
      <span style={{ width: 52, textAlign: "center", fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 15 }}>{value}</span>
      <button type="button" style={btn} disabled={disabled || value >= max} aria-label="增加" onClick={() => onChange(Math.min(max, value + 1))}><Plus size={16} /></button>
    </div>
  )
}

export default function MobileBManagePage() {
  const { status } = useSession()
  const toast = useToast()
  const [cards, setCards] = useState<Card[]>([])
  const [loaded, setLoaded] = useState(false)
  const [denied, setDenied] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const cardsRef = useRef<Card[]>([])
  useEffect(() => { cardsRef.current = cards }, [cards])

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/zongce/b-manage")
      if (res.status === 403) { setDenied(true); setLoaded(true); return }
      if (res.ok) {
        const d = (await res.json()) as { cards?: Card[] }
        setCards(d.cards || [])
      }
    } catch { /* 网络异常按空处理 */ }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    void load()
    return () => { Object.values(timersRef.current).forEach(t => clearTimeout(t)) }
  }, [status, load])

  // 修改即标记并启动防抖保存（700ms）
  const updateRow = (id: string, patch: Partial<Card>) => {
    if (FORM_LOCKED) return
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...patch, saving: true, saved: false } : c))
    if (timersRef.current[id]) clearTimeout(timersRef.current[id])
    timersRef.current[id] = setTimeout(() => {
      const cur = cardsRef.current.find(c => c.id === id)
      if (cur) void saveRow(cur)
    }, 700)
  }

  const saveRow = async (c: Card) => {
    try {
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
      const d = (await res.json().catch(() => null)) as { ok?: boolean; score?: number; error?: string } | null
      if (res.ok) {
        setCards(prev => prev.map(x => x.id === c.id ? { ...x, saving: false, saved: true, score: typeof d?.score === "number" ? d.score : x.score } : x))
      } else {
        toast.error(d?.error || "保存失败")
        setCards(prev => prev.map(x => x.id === c.id ? { ...x, saving: false } : x))
      }
    } catch {
      toast.error("保存失败，请重试")
      setCards(prev => prev.map(x => x.id === c.id ? { ...x, saving: false } : x))
    }
  }

  const confirmDelete = async () => {
    if (!confirmId) return
    setDeleting(true)
    try {
      if (timersRef.current[confirmId]) clearTimeout(timersRef.current[confirmId])
      const res = await fetch(`/api/zongce/b-manage?userId=${confirmId}`, { method: "DELETE" })
      if (res.ok) {
        setCards(prev => prev.map(x => x.id === confirmId ? { ...x, excellentMember: false, partyMember: false, youthStudyCount: 0, score: null, saving: false, saved: false } : x))
        toast.success("已删除评定")
      } else {
        const d = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(d?.error || "删除失败")
      }
    } catch {
      toast.error("删除失败，请重试")
    } finally {
      setDeleting(false)
      setConfirmId(null)
    }
  }

  const target = confirmId ? cards.find(c => c.id === confirmId) : null

  return (
    <div className="mob-page">
      <MobTopBar back title="B 集会政治学习" right={<MobYearBadge year={YEAR} />} />

      <MobRoleGate
        allowedRoles={["admin"]}
        allowedTags={["团支书"]}
        fallback={<MobEmpty icon={<Users size={28} />} title="无权访问" desc="仅团支书或管理员可评定 B 集会政治学习" />}
      >
        {/* 说明卡 */}
        <section className="mob-card mob-card--pad">
          <div style={{ fontFamily: "var(--font-num)", fontSize: 10, letterSpacing: ".14em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6 }}>B · 团支书评定</div>
          <div style={{ fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.7 }}>
            本板块由团支书逐人评定填写：基础 1.5 分 + 青年大学习每累计 3 期 +0.2 分（15 期满分 2.5 分）· 优秀团员、党支部工作小组成员仅勾选标记，不计分 · 保存后立即生效。
          </div>
        </section>

        {/* 截止横幅 */}
        {FORM_LOCKED && (
          <section style={{ border: "1px solid rgba(196,97,90,.35)", background: "rgba(196,97,90,.08)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)" }}>综测填报已截止</div>
            <div style={{ fontSize: 12.5, color: "var(--danger)", opacity: 0.85, marginTop: 3 }}>B 板块评定已锁定，仅可查看，如需调整请联系管理员</div>
          </section>
        )}

        {denied ? (
          <MobEmpty icon={<Users size={28} />} title="无权访问" desc="仅团支书或管理员可评定 B 集会政治学习" />
        ) : !loaded ? (
          <MobLoading rows={6} />
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-2)" }}>学生评定</span>
              <span style={{ fontFamily: "var(--font-num)", fontSize: 12, color: "var(--fg-3)" }}>{cards.length} 人</span>
            </div>

            {cards.map(c => {
              const preview = calcBScore({ excellentMember: c.excellentMember, partyMember: c.partyMember, youthStudyCount: c.youthStudyCount })
              const stateChip = c.saving
                ? <MobChip tone="warn">保存中</MobChip>
                : c.saved
                  ? <MobChip tone="ok">已保存</MobChip>
                  : c.score != null
                    ? <MobChip tone="ok">已评定</MobChip>
                    : <MobChip tone="neutral">未评定</MobChip>
              return (
                <section key={c.id} className="mob-card mob-card--pad">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      width: 40, height: 40, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: "var(--primary-soft)", color: "var(--primary)", fontWeight: 700, fontSize: 16,
                    }}>{c.name.charAt(0)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>{c.name}</div>
                      <div style={{ fontFamily: "var(--font-num)", fontSize: 12, color: "var(--fg-3)" }}>{c.studentId}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "var(--font-num)", fontSize: 15, fontWeight: 700, color: preview >= 2.5 ? "var(--ok)" : "var(--primary)" }}>
                        {c.score != null || c.excellentMember || c.partyMember || c.youthStudyCount > 0 ? preview.toFixed(2) : "--"}
                        <span style={{ fontSize: 10, fontWeight: 400, color: "var(--fg-3)" }}> / 2.5</span>
                      </div>
                      {stateChip}
                    </div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <SwitchRow label="优秀团员" sub="身份标记 · 不计分" on={c.excellentMember} disabled={FORM_LOCKED} onToggle={() => updateRow(c.id, { excellentMember: !c.excellentMember })} />
                    <SwitchRow label="党支部工作小组成员" sub="身份标记 · 不计分" on={c.partyMember} disabled={FORM_LOCKED} onToggle={() => updateRow(c.id, { partyMember: !c.partyMember })} />
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.45 }}>青年大学习</div>
                        <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>每累计 3 期 +0.2 分</div>
                      </div>
                      <Stepper value={c.youthStudyCount} disabled={FORM_LOCKED} onChange={v => updateRow(c.id, { youthStudyCount: v })} />
                      <span style={{ fontSize: 12, color: "var(--fg-3)", width: 14 }}>期</span>
                    </div>
                  </div>

                  {!FORM_LOCKED && (
                    <div style={{ marginTop: 4 }}>
                      <MobButton variant="ghost" size="sm" block onClick={() => setConfirmId(c.id)}>
                        <Trash2 size={14} /> 删除评定
                      </MobButton>
                    </div>
                  )}
                </section>
              )
            })}
          </>
        )}
      </MobRoleGate>

      <MobConfirm
        open={confirmId !== null}
        tone="danger"
        title="删除评定？"
        confirmText="删除"
        loading={deleting}
        onCancel={() => setConfirmId(null)}
        onConfirm={confirmDelete}
      >
        {target ? `删除 ${target.name}（${target.studentId}）的 B 集会学习评定？该同学将恢复为「未评定」状态。` : ""}
      </MobConfirm>
    </div>
  )
}
