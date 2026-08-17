"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, ShieldAlert, Search } from "lucide-react"
import MobTopBar from "@/app/m/_components/MobTopBar"
import MobEmpty from "@/app/m/_components/MobEmpty"
import MobLoading from "@/app/m/_components/MobLoading"
import MobCard from "@/app/m/_components/MobCard"
import MobChip from "@/app/m/_components/MobChip"
import MobButton from "@/app/m/_components/MobButton"
import MobAvatar from "@/app/m/_components/MobAvatar"
import MobSegmented from "@/app/m/_components/MobSegmented"
import MobField from "@/app/m/_components/MobField"
import MobBottomSheet from "@/app/m/_components/MobBottomSheet"
import MobConfirm from "@/app/m/_components/MobConfirm"
import { useToast } from "@/app/m/_components/MobToast"
import { SECTION_META } from "@/lib/zongce-utils"

type Tone = "ok" | "warn" | "danger" | "info" | "neutral" | "s" | "m" | "t"

interface SectionConfig {
  key: string
  letter: string
  label: string
  reviewer: string
  endpoint: string
  tone: Tone
}

interface Card {
  id: string
  name: string
  studentId: string
  status: string
  sectionId: string | null
  submittedAt: string | null
  // S 板块
  gpa?: number
  sScore?: number
  failedCount?: number
  failedPolicyCount?: number
  repeatCount?: number
  filled?: number
  total?: number
  // A / D / E / F 板块
  score?: number | null
  absences?: number
  tardies?: number
  specialLeaves?: number
  itemCount?: number
  summary?: string
  evidenceCount?: number
}

const TONE_BY_LETTER: Record<string, Tone> = {
  S: "s",
  A: "info",
  D: "m",
  E: "t",
  F: "warn",
}

function buildConfig(key: string): SectionConfig | null {
  if (!["s", "a", "d", "e", "f"].includes(key)) return null
  const letter = key.toUpperCase()
  const meta = SECTION_META[letter]
  return {
    key,
    letter,
    label: meta ? meta.label : letter,
    reviewer: meta ? meta.reviewer : "",
    endpoint: `/api/zongce/review-${key}`,
    tone: TONE_BY_LETTER[letter] ?? "neutral",
  }
}

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  submitted: { label: "待审核", tone: "warn" },
  approved: { label: "已通过", tone: "ok" },
  returned: { label: "已退回", tone: "danger" },
  not_started: { label: "未填写", tone: "neutral" },
  draft: { label: "草稿", tone: "neutral" },
}

function cardSummary(sectionKey: string, c: Card): string {
  switch (sectionKey) {
    case "s":
      return `GPA ${(c.gpa ?? 0).toFixed(2)} · S ${(c.sScore ?? 0).toFixed(2)} · 挂科 ${c.failedCount ?? 0} · 已填 ${c.filled ?? 0}/${c.total ?? 0}`
    case "a":
      return `旷课 ${c.absences ?? 0} · 迟到 ${c.tardies ?? 0} · 请假 ${c.specialLeaves ?? 0} · 得分 ${c.score != null ? c.score.toFixed(2) : "—"}`
    case "d":
      return `${c.itemCount ?? 0} 项活动 · 得分 ${c.score != null ? c.score.toFixed(2) : "—"}`
    case "e":
    case "f":
      return `${c.summary || "未填写内容"} · 得分 ${c.score != null ? c.score.toFixed(2) : "—"}`
    default:
      return ""
  }
}

export default function SectionReviewDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams<{ section: string }>()
  const toast = useToast()

  const sectionKey = (params.section || "").toLowerCase()
  const cfg = buildConfig(sectionKey)

  const isAdmin = session?.user?.role === "admin"
  const tags = session?.user?.tags ?? []
  const allowed = cfg ? isAdmin || tags.includes(cfg.reviewer) : false

  const [cards, setCards] = useState<Card[]>([])
  const [loaded, setLoaded] = useState(false)
  const [denied, setDenied] = useState(false)
  const [tab, setTab] = useState("submitted")
  const [query, setQuery] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  // 确认 / 弹层状态
  const [approveTarget, setApproveTarget] = useState<Card | null>(null)
  const [unapproveTarget, setUnapproveTarget] = useState<Card | null>(null)
  const [reopenTarget, setReopenTarget] = useState<Card | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Card | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [rejectError, setRejectError] = useState("")

  useEffect(() => {
    if (status !== "authenticated" || !cfg) return
    fetch(cfg.endpoint)
      .then(async res => {
        if (res.status === 403) {
          setDenied(true)
          setLoaded(true)
          return
        }
        if (res.ok) setCards((await res.json()).cards || [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, cfg?.key])

  const reload = () => {
    if (!cfg) return
    fetch(cfg.endpoint)
      .then(r => r.json())
      .then(d => setCards(d.cards || []))
      .catch(() => {})
  }

  const post = async (card: Card, body: Record<string, unknown>, successMsg: string) => {
    if (!card.sectionId) return
    setBusyId(card.id)
    try {
      const res = await fetch(`/api/zongce/review/${card.sectionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(successMsg)
        reload()
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(d.error || "操作失败")
      }
    } catch {
      toast.error("网络异常，请重试")
    } finally {
      setBusyId(null)
    }
  }

  const counts = useMemo(() => {
    const c = (k: string) => cards.filter(x => x.status === k).length
    return {
      submitted: c("submitted"),
      approved: c("approved"),
      returned: c("returned"),
      unfilled: c("not_started") + c("draft"),
    }
  }, [cards])

  const visible = useMemo(() => {
    let list = cards
    if (tab === "unfilled") list = list.filter(c => c.status === "not_started" || c.status === "draft")
    else list = list.filter(c => c.status === tab)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q) || c.studentId.includes(q))
    return list
  }, [cards, tab, query])

  if (status === "loading") {
    return (
      <div className="mob-page">
        <MobTopBar title="审核" back onBack={() => router.push("/m/zongce/review")} />
        <MobLoading rows={6} />
      </div>
    )
  }

  if (!cfg) {
    return (
      <div className="mob-page">
        <MobTopBar title="审核" back onBack={() => router.push("/m/zongce/review")} />
        <MobEmpty icon={<ShieldAlert size={28} />} title="板块不存在" desc="未找到对应的审核板块" />
      </div>
    )
  }

  if (denied || !allowed) {
    return (
      <div className="mob-page">
        <MobTopBar title="审核" back onBack={() => router.push("/m/zongce/review")} />
        <MobEmpty
          icon={<ShieldAlert size={28} />}
          title="无权限"
          desc={`仅${cfg.reviewer}或管理员可审核 ${cfg.letter} ${cfg.label}`}
        />
      </div>
    )
  }

  const tabOptions = [
    { value: "submitted", label: `待审核 ${counts.submitted}` },
    { value: "approved", label: `已通过 ${counts.approved}` },
    { value: "returned", label: `已退回 ${counts.returned}` },
    { value: "unfilled", label: `未填写 ${counts.unfilled}` },
  ]

  const statCells = [
    { label: "待审核", n: counts.submitted, color: "var(--warn)" },
    { label: "已通过", n: counts.approved, color: "var(--ok)" },
    { label: "已退回", n: counts.returned, color: "var(--danger)" },
    { label: "未填写", n: counts.unfilled, color: "var(--fg-3)" },
  ]

  return (
    <div className="mob-page" style={{ paddingBottom: 24 }}>
      <MobTopBar title={`${cfg.letter} ${cfg.label} 审核`} back onBack={() => router.push("/m/zongce/review")} />

      {/* 状态统计条 */}
      <MobCard padding={false}>
        <div style={{ display: "flex", alignItems: "stretch", padding: "14px 8px" }}>
          {statCells.map((s, i) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                textAlign: "center",
                borderLeft: i > 0 ? "1px solid var(--border)" : "none",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>{s.n}</div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </MobCard>

      {/* 状态筛选 tabs */}
      <MobSegmented options={tabOptions} value={tab} onChange={setTab} />

      {/* 搜索 */}
      <MobField
        type="text"
        placeholder="搜索姓名或学号"
        value={query}
        onChange={setQuery}
        children={
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fg-3)" }} />
            <input
              className="mob-field__control"
              style={{ paddingLeft: 36 }}
              placeholder="搜索姓名或学号"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        }
      />

      {/* 列表 */}
      {!loaded ? (
        <MobLoading rows={5} />
      ) : visible.length === 0 ? (
        <MobEmpty title="该状态下暂无成员" desc={`共 ${visible.length} 人`} />
      ) : (
        visible.map(c => {
          const st = STATUS_META[c.status] || { label: c.status, tone: "neutral" as Tone }
          const clickable = !!c.sectionId
          const summary = cardSummary(sectionKey, c)
          const main = (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
              <MobAvatar name={c.name} size="md" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>{c.name}</span>
                  <span style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>{c.studentId}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {summary}
                </div>
              </div>
              <MobChip tone={st.tone}>{st.label}</MobChip>
              {clickable && <ChevronRight size={16} style={{ color: "var(--fg-3)", flex: "none" }} />}
            </div>
          )

          const actions = (() => {
            if (!c.sectionId) return null
            if (c.status === "submitted") {
              return (
                <div style={{ display: "flex", gap: 8, padding: "0 16px 14px" }}>
                  <MobButton size="sm" variant="soft" block disabled={busyId === c.id} onClick={() => setApproveTarget(c)}>
                    {busyId === c.id ? "处理中" : "通过"}
                  </MobButton>
                  <MobButton size="sm" variant="danger" block disabled={busyId === c.id} onClick={() => { setRejectTarget(c); setRejectNote(""); setRejectError("") }}>
                    退回
                  </MobButton>
                </div>
              )
            }
            if (c.status === "approved") {
              return (
                <div style={{ display: "flex", gap: 8, padding: "0 16px 14px" }}>
                  <MobButton size="sm" variant="ghost" block disabled={busyId === c.id} onClick={() => setUnapproveTarget(c)}>
                    {busyId === c.id ? "处理中" : "撤销通过"}
                  </MobButton>
                </div>
              )
            }
            if (c.status === "returned") {
              return (
                <div style={{ display: "flex", gap: 8, padding: "0 16px 14px" }}>
                  <MobButton size="sm" variant="ghost" block disabled={busyId === c.id} onClick={() => setReopenTarget(c)}>
                    {busyId === c.id ? "处理中" : "重开"}
                  </MobButton>
                </div>
              )
            }
            return null
          })()

          return (
            <MobCard key={c.id} padding={false} className={clickable ? "" : undefined}>
              {clickable ? (
                <Link href={`/m/zongce/review/${sectionKey}/${c.sectionId}`} style={{ display: "block", color: "var(--fg)" }}>
                  {main}
                </Link>
              ) : (
                <div style={{ opacity: 0.72 }}>{main}</div>
              )}
              {actions}
            </MobCard>
          )
        })
      )}

      {/* 通过确认 */}
      <MobConfirm
        open={!!approveTarget}
        title="确认通过？"
        confirmText="通过"
        onCancel={() => setApproveTarget(null)}
        onConfirm={() => {
          if (!approveTarget) return
          const t = approveTarget
          setApproveTarget(null)
          void post(t, { approved: true }, "已通过")
        }}
      >
        {approveTarget ? `确认通过 ${approveTarget.name}（${approveTarget.studentId}）的 ${cfg.letter} ${cfg.label}？` : ""}
      </MobConfirm>

      {/* 撤销通过确认 */}
      <MobConfirm
        open={!!unapproveTarget}
        title="撤销通过？"
        confirmText="撤销"
        tone="danger"
        onCancel={() => setUnapproveTarget(null)}
        onConfirm={() => {
          if (!unapproveTarget) return
          const t = unapproveTarget
          setUnapproveTarget(null)
          void post(t, { action: "unapprove" }, "已撤销通过")
        }}
      >
        {unapproveTarget ? `撤销通过后 ${unapproveTarget.name} 将重新进入待审核队列，需重新审核。` : ""}
      </MobConfirm>

      {/* 重开确认 */}
      <MobConfirm
        open={!!reopenTarget}
        title="重开审核？"
        confirmText="重开"
        onCancel={() => setReopenTarget(null)}
        onConfirm={() => {
          if (!reopenTarget) return
          const t = reopenTarget
          setReopenTarget(null)
          void post(t, { action: "reopen" }, "已重开")
        }}
      >
        {reopenTarget ? `撤销驳回后 ${reopenTarget.name} 将重新进入待审核队列。` : ""}
      </MobConfirm>

      {/* 退回弹层（需理由） */}
      <MobBottomSheet
        open={!!rejectTarget}
        title={`退回 ${rejectTarget?.name ?? ""}`}
        onClose={() => {
          setRejectTarget(null)
          setRejectNote("")
          setRejectError("")
        }}
      >
        <MobField
          label="退回理由"
          required
          type="textarea"
          placeholder="请填写退回理由（必填）"
          value={rejectNote}
          onChange={v => {
            setRejectNote(v)
            setRejectError("")
          }}
          error={rejectError || undefined}
        />
        <div style={{ marginTop: 14 }}>
          <MobButton
            block
            variant="danger"
            loading={rejectTarget ? busyId === rejectTarget.id : false}
            onClick={() => {
              if (!rejectTarget) return
              const note = rejectNote.trim()
              if (!note) {
                setRejectError("请填写退回理由")
                return
              }
              const t = rejectTarget
              setRejectTarget(null)
              setRejectNote("")
              setRejectError("")
              void post(t, { approved: false, reviewNote: note }, "已退回")
            }}
          >
            确认退回
          </MobButton>
        </div>
      </MobBottomSheet>
    </div>
  )
}
