"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  BookOpen, ClipboardCheck, Users, Home, Music, Heart, Upload, X, Trash2, Plus, Minus,
  Undo2, Star, Trophy, FlaskConical, ShieldAlert, Inbox, ImagePlus, Check, Medal, Zap, Info,
} from "lucide-react"
import {
  calcWeightedGPA, calcSScore, calcAScore, calcBScore, calcCScore, calcDScore, calcEScore, calcFScore,
  scoreToGPA, D_RANK_TABLE, F2_RANK_SCORES, F3_HONOR_SCORES, F5_PENALTY_SCORES, POSITION_PRESETS,
  SECTION_META, OPEN_SECTIONS, FORM_LOCKED,
} from "@/lib/zongce-utils"
import MobTopBar from "../../../_components/MobTopBar"
import MobButton from "../../../_components/MobButton"
import MobChip from "../../../_components/MobChip"
import MobEmpty from "../../../_components/MobEmpty"
import MobImageViewer from "../../../_components/MobImageViewer"
import MobLoading from "../../../_components/MobLoading"
import { useToast } from "../../../_components/MobToast"

// ============================================================
// 移动端综测板块表单（动态路由 S/A/B/C/D/E/F）
// 数据形状与 src/app/zongce/[section]/page.tsx 完全一致，禁止自行发明结构。
// ============================================================

type SectionKey = "S" | "A" | "B" | "C" | "D" | "E" | "F"
type Status = "not_started" | "draft" | "submitted" | "approved" | "returned"
type AutoSaveState = "idle" | "saving" | "saved" | "error"

const VALID_SECTIONS: SectionKey[] = ["S", "A", "B", "C", "D", "E", "F"]

// 移动版评分规则要点（结构化条目，与桌面 MobileSectionForm 的 MOBILE_RULE 内容一致）
const MOBILE_RULE: Record<SectionKey, string[]> = {
  S: [
    "S = 平均学分绩点 × 35 × 70%，不含任选课",
    "手填教务数值优先于自动计算",
  ],
  A: [
    "满分 5 分",
    "旷课一次扣 1 分",
    "迟到一次扣 0.25 分",
    "特殊情况请假（辅导员同意）不扣分",
  ],
  B: [
    "由团支书统一评定，学生只读",
    "1.5 分起记，满分 2.5 分",
    "青年大学习每 3 期 +0.2 分",
    "优秀团员、党支部成员仅作标记",
  ],
  C: [
    "由生活委员统一评定，学生只读",
    "五星 2.5 / 四星 2 / 三星 1 分",
    "获评文明宿舍 +0.5 分",
  ],
  D: [
    "满分 5 分",
    "大型活动 +0.2/次，队伍参赛未获奖 +0.3",
    "文艺表演 +0.3，排练 +0.2",
    "阳光体育 +0.5，运动会参与未获奖 +0.3",
    "获奖按 级别 × 名次 计分",
  ],
  E: [
    "满分 5 分",
    "队长/召集人 +0.5",
    "校级积极分子 +2，市级以上优秀志愿者 +1",
    "优秀分队成员 +1 / 队长 +1.5",
    "志愿时长 0.1/小时，封顶 3 分",
  ],
  F: [
    "上限 10 分，可扣分",
    "F1 学生工作 + F2 竞赛 + F3 荣誉 + F4 科研",
    "F5 惩罚扣分",
  ],
}

// 五级制成绩选项（与桌面 GRADE_OPTIONS 一致）
const GRADE_OPTIONS = ["优秀", "良好", "中等", "及格", "不及格"]
// 仅五级制记分的课程名（与桌面一致）
const GRADE_COURSES = ["军事技能", "AI辅助程序设计实践"]

// D 板块选项（与桌面 D_TYPES / D_LEVELS / D_RANKS 一致）
const D_TYPES: { v: string; label: string; score: number | null }[] = [
  { v: "ceremony", label: "大型活动（开/闭幕式、方阵、颁奖典礼）", score: 0.2 },
  { v: "team_unranked", label: "队伍代表参赛未获奖", score: 0.3 },
  { v: "performance", label: "文艺表演", score: 0.3 },
  { v: "rehearsal", label: "文艺排练", score: 0.2 },
  { v: "sports", label: "阳光体育系列活动", score: 0.5 },
  { v: "sports_unranked", label: "运动会参与未获奖", score: 0.3 },
  { v: "award", label: "获奖项目（按名次加分）", score: null },
]
const D_TYPE_SHORT: Record<string, string> = {
  ceremony: "大型活动", team_unranked: "队伍参赛", performance: "文艺表演",
  rehearsal: "排练", sports: "阳光体育", sports_unranked: "运动会参与", award: "获奖",
}
const D_LEVELS = [
  { v: "college", label: "院级" }, { v: "school", label: "校级" },
  { v: "province", label: "省级" }, { v: "national", label: "国家级" },
]
const D_RANKS = [
  { v: 1, label: "一等奖" }, { v: 2, label: "二等奖" }, { v: 3, label: "三等奖" },
  { v: 4, label: "第4-8名" }, { v: 5, label: "其他（请注明）" },
]

// C 板块星级（与桌面 STAR_LEVELS 一致）
const STAR_LEVELS: Record<number, { label: string; desc: string; color: string }> = {
  5: { label: "五星级宿舍", desc: "2.5 分", color: "#C7924B" },
  4: { label: "四星级宿舍", desc: "2 分", color: "#5B8E9E" },
  3: { label: "三星级宿舍", desc: "1 分", color: "#3E7A5C" },
  0: { label: "未获星级", desc: "0 分", color: "#A8B4BD" },
}

// F 板块选项（与桌面一致）
const F2_CATEGORIES = [
  { v: "A", label: "A类" }, { v: "B", label: "B类" }, { v: "C", label: "C类" },
  { v: "D", label: "D类" }, { v: "E", label: "E类（校级）" }, { v: "F", label: "F类（院级）" },
]
const F3_LEVELS = [
  { v: "national", label: "国家级 +3" }, { v: "province", label: "省级 +2.5" },
  { v: "city", label: "市级 +2" }, { v: "school", label: "校级 +1" },
]
const F4_TYPES = [
  { v: "newspaper", label: "校报文章" }, { v: "journal", label: "期刊论文" },
  { v: "essay", label: "征文/课题" }, { v: "research", label: "课题调研" }, { v: "patent", label: "专利" },
]
const F4_SHORT: Record<string, string> = { newspaper: "校报文章", journal: "期刊论文", essay: "征文/课题", research: "课题调研", patent: "专利" }
const F5_TYPES = ["留校察看", "记过", "严重警告", "警告", "通报批评"]
// 考评仅适用于校级/院级组织、班集体（与桌面 F1_EVAL_CATEGORIES 一致）
const F1_EVAL_CATEGORIES = ["校级组织", "院级组织", "班集体"]

// ============================================================
// 类型（与桌面字段名/枚举值严格一致）
// ============================================================
interface SectionRecord {
  id: string
  section: string
  data: string | null
  score: number | null
  status: string
  evidence: string | null
  reviewNote: string | null
}
interface SectionsResponse { sections: SectionRecord[]; courseScores: ScoreRow[] }

interface Course { id: string; name: string; credits: number; semester: number; isElective: boolean; sortOrder?: number }
interface ScoreRow { courseId: string; course?: Course; score: number | null; grade: string | null; gpa: number | null; repeat: boolean }
interface CoursesResponse { courses: Course[] }

interface DItem { key: string; type: string; name: string; date: string; level: string; rank: number; rankNote: string; photos: string[]; score?: number }
interface EForm { isCaptain: boolean; teamAward: string; schoolLevelAward: boolean; cityVolunteer: boolean; volunteerHours: number }
interface F1Item { key: string; position: string; duration: string; evaluation: string; photos: string[] }
interface F2Item { key: string; name: string; category: string; rank: number; isTeam: boolean; teamSize: number; position: number; photos: string[] }
interface F3Item { key: string; level: string; name: string; photos: string[] }
interface F4Item { key: string; type: string; detail: string; rank: number; level: string; photos: string[] }
interface F5Item { key: string; type: string; count: number }

// ============================================================
// 工具
// ============================================================
const kf = () => `k${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

function nowHM(): string {
  return new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
}

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback
  try { return JSON.parse(s) as T } catch { return fallback }
}

// 客户端图片压缩转码（与桌面 compressImage 一致：HEIC/超大图 → JPEG）
function compressImage(file: File, maxEdge = 1600, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext("2d")
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("canvas 不可用")); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error("转码失败")); return }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }))
      }, "image/jpeg", quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("图片读取失败")) }
    img.src = url
  })
}

async function uploadImage(file: File): Promise<{ url?: string; error?: string }> {
  if (!file.type.startsWith("image/")) return { error: "请上传图片文件" }
  try {
    const compressed = await compressImage(file)
    if (compressed.size > 5 * 1024 * 1024) return { error: "图片处理后仍超过 5MB，请更换更小的图片" }
    const fd = new FormData()
    fd.append("file", compressed)
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    const d = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
    if (!res.ok) return { error: d?.error || "上传失败" }
    return { url: d?.url }
  } catch {
    return { error: "上传失败，请重试" }
  }
}

interface PutResult { ok: boolean; score: number | null; error?: string }
async function putSection(section: SectionKey, data: unknown, status: "draft" | "submitted", evidence?: string[]): Promise<PutResult> {
  try {
    const res = await fetch("/api/zongce/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, data, status, ...(evidence !== undefined ? { evidence } : {}) }),
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; score?: number; error?: string } | null
    if (!res.ok) return { ok: false, score: null, error: json?.error || "保存失败" }
    return { ok: true, score: typeof json?.score === "number" ? json.score : null }
  } catch {
    return { ok: false, score: null, error: "网络异常，请重试" }
  }
}

async function putScores(scores: { courseId: string; score: number | null; grade: string | null; gpa: number | null; repeat: boolean }[]): Promise<boolean> {
  try {
    const res = await fetch("/api/zongce/scores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores }),
    })
    return res.ok
  } catch { return false }
}

// ============================================================
// 自动保存（防抖 800ms + flush 语义）
// ============================================================
function useAutosave() {
  const [autoSave, setAutoSave] = useState<AutoSaveState>("idle")
  const [lastSavedAt, setLastSavedAt] = useState("")
  const savingRef = useRef(false)
  const inflightRef = useRef<Promise<void> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<(() => Promise<void>) | null>(null)

  const runSave = useCallback(async (save: () => Promise<void>) => {
    if (savingRef.current) return
    savingRef.current = true
    setAutoSave("saving")
    const p = (async () => {
      try {
        await save()
        setAutoSave("saved")
        setLastSavedAt(nowHM())
      } catch {
        setAutoSave("error")
      } finally {
        savingRef.current = false
        inflightRef.current = null
      }
    })()
    inflightRef.current = p
    await p
  }, [])

  const schedule = useCallback((save: () => Promise<void>) => {
    pendingRef.current = save
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      const s = pendingRef.current
      pendingRef.current = null
      if (s) void runSave(s)
    }, 800)
  }, [runSave])

  // 提交前 flush：等待进行中的草稿保存结束，再立刻落盘一次最新的待保存内容
  const flush = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (inflightRef.current) await inflightRef.current
    if (pendingRef.current) {
      const s = pendingRef.current
      pendingRef.current = null
      await runSave(s)
    }
  }, [runSave])

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    pendingRef.current = null
  }, [])

  useEffect(() => () => { cancel() }, [cancel])

  return { autoSave, lastSavedAt, schedule, flush, cancel }
}

// ============================================================
// 板块通用表单状态（状态/评分/自动保存/提交/撤回）
// ============================================================
function useSectionForm(section: SectionKey) {
  const { data: session, status: authStatus } = useSession()
  const toast = useToast()
  const autosave = useAutosave()
  const [loading, setLoading] = useState(true)
  const [currentStatus, setCurrentStatus] = useState<Status>("not_started")
  const [reviewNote, setReviewNote] = useState("")
  const [serverScore, setServerScore] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // 综测填报截止时全局只读（体测不受影响）
  const isLocked = FORM_LOCKED || currentStatus === "approved"

  const readSection = useCallback(async (): Promise<SectionRecord | null> => {
    try {
      const res = await fetch("/api/zongce/sections")
      if (!res.ok) return null
      const d = (await res.json()) as SectionsResponse
      return (d.sections || []).find(s => s.section === section) || null
    } catch { return null }
  }, [section])

  const applySection = useCallback((rec: SectionRecord | null) => {
    if (!rec) { setCurrentStatus("not_started"); setReviewNote(""); setServerScore(null); return }
    setCurrentStatus((rec.status as Status) || "not_started")
    setReviewNote(rec.reviewNote || "")
    setServerScore(typeof rec.score === "number" ? rec.score : null)
  }, [])

  const refreshStatus = useCallback(async () => {
    const rec = await readSection()
    applySection(rec)
  }, [readSection, applySection])

  const doSubmit = useCallback(async (save: (status: "submitted") => Promise<PutResult>) => {
    setSubmitting(true); setError("")
    await autosave.flush()
    const r = await save("submitted")
    if (!r.ok) { setError(r.error || "提交失败"); setSubmitting(false); return }
    if (r.score !== null) setServerScore(r.score)
    setCurrentStatus("submitted")
    toast.success("提交成功")
    setSubmitting(false)
  }, [autosave, toast])

  const doWithdraw = useCallback(async (save: (status: "draft") => Promise<PutResult>) => {
    setSubmitting(true)
    const r = await save("draft")
    if (r.ok) { if (r.score !== null) setServerScore(r.score); setCurrentStatus("draft"); toast.success("已撤回，恢复草稿") }
    else toast.error(r.error || "撤回失败")
    setSubmitting(false)
  }, [toast])

  const doReedit = useCallback(async (save: (status: "draft") => Promise<PutResult>) => {
    setSubmitting(true)
    const r = await save("draft")
    if (r.ok) { if (r.score !== null) setServerScore(r.score); setCurrentStatus("draft"); toast.success("已恢复草稿，请修改后重新提交") }
    else toast.error(r.error || "操作失败")
    setSubmitting(false)
  }, [toast])

  return {
    session, authStatus, loading, setLoading,
    currentStatus, reviewNote, serverScore, setServerScore,
    submitting, error, setError, isLocked,
    autosave, readSection, applySection, refreshStatus,
    doSubmit, doWithdraw, doReedit, toast,
  }
}

// ============================================================
// 通用 UI 小组件（基于 .mob 令牌）
// ============================================================
const CONTROL_STYLE: React.CSSProperties = {
  width: "100%", height: 42, padding: "0 12px",
  border: "1px solid var(--border)", borderRadius: 10,
  background: "var(--surface-2)", color: "var(--fg)", fontSize: 14, outline: "none",
}

function CardShell({ title, sub, right, children }: { title?: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mob-card mob-card--pad">
      {title ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: sub ? 3 : 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", display: "flex", alignItems: "center", gap: 7 }}>{title}</div>
            {right}
          </div>
          {sub ? <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 10 }}>{sub}</div> : null}
        </>
      ) : null}
      {children}
    </section>
  )
}

function RuleBanner({ items }: { items: string[] }) {
  return (
    <section className="mob-card" style={{ borderRadius: 12, padding: "12px 14px", boxShadow: "none", border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Info size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>评分规则</span>
        <a href="/m/zongce/rules" style={{ marginLeft: "auto", fontSize: 12, color: "var(--primary)", textDecoration: "none" }}>完整细则 ›</a>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map((it, i) => (
          <li key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
            <span style={{ flexShrink: 0, marginTop: 7, width: 4, height: 4, borderRadius: "50%", background: "var(--primary)", opacity: 0.55 }} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ErrorBanner({ text }: { text: string }) {
  if (!text) return null
  return (
    <section style={{ border: "1px solid rgba(196,97,90,.4)", background: "rgba(196,97,90,.1)", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-start", color: "var(--danger)", fontSize: 12.5, lineHeight: 1.6 }}>
        <ShieldAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} />{text}
      </div>
    </section>
  )
}

function ReturnedBanner({ note, onReedit, disabled }: { note: string; onReedit: () => void; disabled: boolean }) {
  return (
    <section style={{ border: "1px solid rgba(196,97,90,.4)", background: "rgba(196,97,90,.1)", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 700 }}>退回修改，请修正后重新提交</div>
      {note ? <div style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 4, opacity: 0.85 }}>退回原因：{note}</div> : null}
      <div style={{ marginTop: 10 }}>
        <MobButton size="sm" variant="danger" onClick={onReedit} loading={disabled}>重新编辑</MobButton>
      </div>
    </section>
  )
}

function Pill({ active, disabled, onClick, children }: { active?: boolean; disabled?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-pressed={active}
      style={{
        minHeight: 36, padding: "6px 14px", borderRadius: 999,
        border: `1px solid ${active ? "var(--primary)" : "var(--border-strong)"}`,
        background: active ? "var(--primary)" : "var(--surface)",
        color: active ? "#fff" : "var(--fg-2)",
        fontSize: 13, fontWeight: active ? 600 : 400,
        display: "inline-flex", alignItems: "center", gap: 5,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        transition: "all var(--mob-dur) var(--mob-ease)",
      }}>
      {children}
    </button>
  )
}

function PillGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>{children}</div>
}

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

function SwitchRow({ label, sub, value, on, onToggle, disabled }: { label: React.ReactNode; sub?: React.ReactNode; value?: React.ReactNode; on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.45 }}>{label}</div>
        {sub ? <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{sub}</div> : null}
      </div>
      {value !== undefined ? <span style={{ fontFamily: "var(--font-num)", fontSize: 13, color: "var(--primary)", fontWeight: 700, flexShrink: 0 }}>{value}</span> : null}
      <Switch on={on} onToggle={onToggle} disabled={disabled} label={String(label)} />
    </div>
  )
}

function Stepper({ value, onChange, disabled, min = 0, max = 999 }: { value: number; onChange: (v: number) => void; disabled?: boolean; min?: number; max?: number }) {
  const btn: React.CSSProperties = {
    width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--fg-2)", background: "none", border: "none", fontSize: 20,
  }
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--surface-2)", flexShrink: 0 }}>
      <button type="button" style={btn} disabled={disabled || value <= min} aria-label="减少" onClick={() => onChange(Math.max(min, value - 1))}><Minus size={16} /></button>
      <span style={{ width: 46, textAlign: "center", fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 15 }}>{value}</span>
      <button type="button" style={btn} disabled={disabled || value >= max} aria-label="增加" onClick={() => onChange(Math.min(max, value + 1))}><Plus size={16} /></button>
    </div>
  )
}

function StepperRow({ label, sub, value, onChange, disabled, max = 999 }: { label: React.ReactNode; sub?: React.ReactNode; value: number; onChange: (v: number) => void; disabled?: boolean; max?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.45 }}>{label}</div>
        {sub ? <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{sub}</div> : null}
      </div>
      <Stepper value={value} onChange={onChange} disabled={disabled} max={max} />
    </div>
  )
}

function PhotoGrid({ photos, onAdd, onRemove, disabled, uploading }: {
  photos: string[]; onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void; onRemove: (url: string) => void; disabled?: boolean; uploading?: boolean
}) {
  const [viewer, setViewer] = useState<number | null>(null)
  const images = photos.map((url, i) => ({ url, label: `佐证 ${i + 1}` }))
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {photos.map((url, i) => (
          <div key={url} style={{ position: "relative" }}>
            <button type="button" onClick={() => setViewer(i)} aria-label={`查看佐证 ${i + 1}`}
              style={{ width: 72, height: 72, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", display: "block", padding: 0, background: "var(--surface-2)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`佐证 ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
            {!disabled && (
              <button type="button" onClick={() => onRemove(url)} aria-label="删除照片"
                style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--danger)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--surface)", padding: 0 }}>
                <X size={11} />
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <label style={{
            width: 72, height: 72, borderRadius: 8, border: "1.5px dashed var(--border-strong)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
            color: "var(--fg-3)", fontSize: 11, cursor: uploading ? "wait" : "pointer", background: "var(--surface-2)", opacity: uploading ? 0.6 : 1,
          }}>
            <ImagePlus size={20} />
            {uploading ? "上传中" : "上传"}
            <input type="file" accept="image/*" disabled={disabled || uploading} onChange={onAdd} style={{ display: "none" }} />
          </label>
        )}
      </div>
      {viewer !== null ? <MobImageViewer images={images} index={viewer} onClose={() => setViewer(null)} onIndexChange={setViewer} /> : null}
    </div>
  )
}

function ScoreBig({ label, value, max, sub, tone = "#3D5A6E" }: { label: string; value: string; max?: string; sub?: React.ReactNode; tone?: string }) {
  return (
    <section className="mob-card mob-card--pad" style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-num)", fontSize: 11, letterSpacing: ".14em", color: "var(--fg-3)", textTransform: "uppercase" }}>{label}</div>
      <div key={value} className="mob-num-pop" style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 700, color: tone, lineHeight: 1.15, marginTop: 4 }}>
        {value}
        {max ? <span style={{ fontSize: 14, color: "var(--fg-3)", fontWeight: 400 }}> / {max}</span> : null}
      </div>
      {sub ? <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 6 }}>{sub}</div> : null}
    </section>
  )
}

function StatusChip({ status }: { status: Status }) {
  const map: Record<Status, { tone: "ok" | "warn" | "danger" | "neutral" | "info"; label: string }> = {
    not_started: { tone: "neutral", label: "未填写" },
    draft: { tone: "info", label: "草稿" },
    submitted: { tone: "warn", label: "待审核" },
    approved: { tone: "ok", label: "已通过" },
    returned: { tone: "danger", label: "退回修改" },
  }
  const m = map[status]
  return <MobChip tone={m.tone}>{m.label}</MobChip>
}

function FormActions({ status, submitting, autoSave, lastSavedAt, onSubmit, onWithdraw }: {
  status: Status; submitting: boolean; autoSave: AutoSaveState; lastSavedAt: string; onSubmit: () => void; onWithdraw: () => void
}) {
  const isLocked = FORM_LOCKED || status === "approved"
  const isSubmitted = status === "submitted"
  const autoTxt = FORM_LOCKED ? "综测填报已截止，内容仅供查看"
    : autoSave === "saving" ? "正在自动保存…"
      : autoSave === "saved" ? `已自动保存 ${lastSavedAt}`
        : autoSave === "error" ? "自动保存失败，请检查网络"
          : "填写内容将自动保存为草稿"
  return (
    <div style={{ padding: "6px 0 10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 20, marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-num)", fontSize: 12, color: FORM_LOCKED ? "var(--fg-3)" : autoSave === "error" ? "var(--danger)" : "var(--fg-3)" }}>{autoTxt}</span>
        {!FORM_LOCKED && isSubmitted && (
          <button type="button" onClick={onWithdraw} disabled={submitting}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--primary)", background: "none", border: "none", padding: 0 }}>
            <Undo2 size={13} /> 撤回修改
          </button>
        )}
      </div>
      {FORM_LOCKED ? (
        <MobButton block size="lg" variant="ghost" disabled>
          填报已截止 · 仅可查看
        </MobButton>
      ) : isLocked ? (
        <MobButton block size="lg" variant="soft" loading={submitting} onClick={onWithdraw}>
          <Undo2 size={15} /> 撤回修改，继续编辑
        </MobButton>
      ) : (
        <MobButton block size="lg" loading={submitting} disabled={isSubmitted} onClick={onSubmit}>
          {isSubmitted ? "已提交 · 待审核" : "提交审核"}
        </MobButton>
      )}
    </div>
  )
}

const FORM_SHELL_LOADING = (
  <div className="mob-page">
    <MobTopBar back title="综测板块" />
    <MobLoading rows={6} />
  </div>
)

// ============================================================
// 主组件：校验 section 参数 + 分派
// ============================================================
export default function MobileSectionPage() {
  const params = useParams()
  const raw = params.section
  const sectionKey = (Array.isArray(raw) ? raw[0] : raw || "").toUpperCase() as SectionKey

  if (!VALID_SECTIONS.includes(sectionKey) || !SECTION_META[sectionKey] || !OPEN_SECTIONS.includes(sectionKey)) {
    return (
      <div className="mob-page">
        <MobTopBar back title="综测板块" />
        <MobEmpty icon={<Inbox size={28} />} title="板块不存在" desc="该综测板块不存在或尚未开放" />
      </div>
    )
  }

  switch (sectionKey) {
    case "S": return <SectionSForm />
    case "A": return <SectionAForm />
    case "B": return <SectionBView />
    case "C": return <SectionCView />
    case "D": return <SectionDForm />
    case "E": return <SectionEForm />
    case "F": return <SectionFForm />
  }
}

// ============================================================
// A 学风考勤
// ============================================================
function SectionAForm() {
  const f = useSectionForm("A")
  const [absences, setAbsences] = useState(0)
  const [tardies, setTardies] = useState(0)
  const [specialLeaves, setSpecialLeaves] = useState(0)
  const initializedRef = useRef(false)

  const score = calcAScore(absences, tardies)

  useEffect(() => {
    if (f.authStatus !== "authenticated") return
    void (async () => {
      const rec = await f.readSection()
      f.applySection(rec)
      if (rec) {
        const p = parseJson<{ absences?: number; tardies?: number; specialLeaves?: number }>(rec.data, {})
        setAbsences(Number(p.absences) || 0)
        setTardies(Number(p.tardies) || 0)
        setSpecialLeaves(Number(p.specialLeaves) || 0)
      }
      f.setLoading(false)
      initializedRef.current = true
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.authStatus])

  const buildData = () => ({ absences, tardies, specialLeaves })

  useEffect(() => {
    if (!initializedRef.current) return
    if (f.isLocked || f.currentStatus === "submitted") return
    f.autosave.schedule(async () => {
      const r = await putSection("A", buildData(), "draft")
      if (!r.ok) throw new Error(r.error)
      if (r.score !== null) f.setServerScore(r.score)
      void f.refreshStatus()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [absences, tardies, specialLeaves])

  if (f.authStatus === "loading" || f.loading) return FORM_SHELL_LOADING
  if (!f.session) return null

  const save = (status: "draft" | "submitted") => putSection("A", buildData(), status)

  return (
    <div className="mob-page">
      <MobTopBar back title={SECTION_META.A.label} right={<StatusChip status={f.currentStatus} />} />
      <RuleBanner items={MOBILE_RULE.A} />
      <ErrorBanner text={f.error} />
      {f.currentStatus === "returned" && <ReturnedBanner note={f.reviewNote} onReedit={() => f.doReedit(save)} disabled={f.submitting} />}

      <CardShell title={<><ClipboardCheck size={16} /> 考勤记录</>} sub="以班级考勤台账为准 · 未发生则保持 0">
        <StepperRow label="旷课次数" sub="缺勤累计 · 每次 −1 分" value={absences} disabled={f.isLocked} onChange={setAbsences} />
        <StepperRow label="迟到次数" sub="迟到 / 早退累计 · 每次 −0.25 分" value={tardies} disabled={f.isLocked} onChange={setTardies} />
        <StepperRow label="特殊情况请假" sub="辅导员同意 · 不扣分" value={specialLeaves} disabled={f.isLocked} onChange={setSpecialLeaves} />
      </CardShell>

      <ScoreBig label="当前得分" value={score.toFixed(2)} max="5"
        sub={absences === 0 && tardies === 0 ? "5 − 旷课×1 − 迟到×0.25" : `扣 ${(absences + tardies * 0.25).toFixed(2)} · 旷课 ${absences}×1 · 迟到 ${tardies}×0.25`} />

      <FormActions status={f.currentStatus} submitting={f.submitting} autoSave={f.autosave.autoSave} lastSavedAt={f.autosave.lastSavedAt}
        onSubmit={() => f.doSubmit(save)} onWithdraw={() => f.doWithdraw(save)} />
    </div>
  )
}

// ============================================================
// S 学习成绩
// ============================================================
function SectionSForm() {
  const f = useSectionForm("S")
  const [courses, setCourses] = useState<Course[]>([])
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [gpaForm, setGpaForm] = useState({ sem1: "", sem2: "", year: "", total: "" })
  const [evidence, setEvidence] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (f.authStatus !== "authenticated") return
    void (async () => {
      try {
        await fetch("/api/zongce/init", { method: "POST" }).catch(() => {})
        const [cRes, sRes] = await Promise.all([fetch("/api/zongce/courses"), fetch("/api/zongce/sections")])
        const cData = (await cRes.json()) as CoursesResponse
        const sData = (await sRes.json()) as SectionsResponse
        const courseList = cData.courses || []
        const existingScores = sData.courseScores || []
        const merged: ScoreRow[] = courseList.map(c => {
          const found = existingScores.find(s => s.courseId === c.id)
          return found ? { courseId: found.courseId, course: c, score: found.score ?? null, grade: found.grade ?? null, gpa: found.gpa ?? null, repeat: !!found.repeat }
            : { courseId: c.id, course: c, score: null, grade: null, gpa: null, repeat: false }
        })
        setCourses(courseList)
        setScores(merged)
        const existing = (sData.sections || []).find(s => s.section === "S") || null
        f.applySection(existing)
        if (existing) {
          setEvidence(parseJson<string[]>(existing.evidence, []))
          const d = parseJson<{ sem1Gpa?: number | string | null; sem2Gpa?: number | string | null; yearGpa?: number | string | null; totalScore?: number | string | null }>(existing.data, {})
          setGpaForm({
            sem1: d.sem1Gpa != null && d.sem1Gpa !== "" ? String(d.sem1Gpa) : "",
            sem2: d.sem2Gpa != null && d.sem2Gpa !== "" ? String(d.sem2Gpa) : "",
            year: d.yearGpa != null && d.yearGpa !== "" ? String(d.yearGpa) : "",
            total: d.totalScore != null && d.totalScore !== "" ? String(d.totalScore) : "",
          })
        }
      } catch { /* 加载失败按空表单处理 */ }
      f.setLoading(false)
      initializedRef.current = true
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.authStatus])

  function updateScore(cid: string, field: "score" | "grade" | "gpa", v: number | string | null) {
    setScores(p => p.map(s => s.courseId === cid ? { ...s, [field]: v } : s))
  }

  const changedScores = () => scores.filter(s => s.score != null || s.gpa != null || s.grade)
    .map(s => ({ courseId: s.courseId, score: s.score, grade: s.grade, gpa: s.gpa, repeat: s.repeat }))

  useEffect(() => {
    if (!initializedRef.current) return
    if (f.isLocked || f.currentStatus === "submitted") return
    f.autosave.schedule(async () => {
      const [r1, r2] = await Promise.all([
        putScores(changedScores()),
        putSection("S", { sem1Gpa: gpaForm.sem1, sem2Gpa: gpaForm.sem2, yearGpa: gpaForm.year, totalScore: gpaForm.total }, "draft", evidence),
      ])
      if (!r1 || !r2.ok) throw new Error(r2.error || "保存失败")
      if (r2.score !== null) f.setServerScore(r2.score)
      void f.refreshStatus()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, gpaForm, evidence])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    const r = await uploadImage(file)
    const url = r.url
    if (url) setEvidence(prev => [...prev, url])
    else if (r.error) f.toast.error(r.error)
    setUploading(false)
  }

  async function saveS(status: "draft" | "submitted"): Promise<PutResult> {
    await putScores(changedScores())
    return putSection("S", { sem1Gpa: gpaForm.sem1, sem2Gpa: gpaForm.sem2, yearGpa: gpaForm.year, totalScore: gpaForm.total }, status, evidence)
  }

  async function submit() {
    const missing = courses.filter(c => {
      const s = scores.find(x => x.courseId === c.id)
      return !s || (s.score == null && !s.grade && s.gpa == null)
    })
    if (missing.length > 0) {
      f.setError(`还有 ${missing.length} 门课程未填写成绩（${missing.map(c => c.name).slice(0, 3).join("、")}${missing.length > 3 ? " 等" : ""}），请全部填完后再提交`)
      return
    }
    await f.doSubmit(saveS)
  }

  if (f.authStatus === "loading" || f.loading) return FORM_SHELL_LOADING
  if (!f.session) return null

  const sem1 = scores.filter(s => s.course?.semester === 1)
  const sem2 = scores.filter(s => s.course?.semester === 2)
  const courseMeta = courses.map(c => ({ id: c.id, name: c.name, credits: c.credits, semester: c.semester, isElective: c.isElective }))
  const scoreMeta = scores.map(s => ({ courseId: s.courseId, score: s.score, grade: s.grade, gpa: s.gpa }))
  const wGPA = calcWeightedGPA(courseMeta, scoreMeta)
  const sScore = calcSScore(wGPA)
  const effYearGpa = gpaForm.year !== "" && Number(gpaForm.year) >= 0 ? Number(gpaForm.year) : wGPA
  const effTotal = gpaForm.total !== "" && Number(gpaForm.total) >= 0 ? Number(gpaForm.total) : sScore
  const filled = scores.filter(s => s.score != null || s.grade != null || s.gpa != null).length

  const courseRow = (s: ScoreRow) => {
    const c = s.course
    const isGrade = c && GRADE_COURSES.includes(c.name)
    return (
      <div key={s.courseId} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c?.name || s.courseId}</span>
          {isGrade && <span style={{ fontSize: 11, color: "var(--fg-3)", flexShrink: 0 }}>五级制</span>}
          <span style={{ fontFamily: "var(--font-num)", fontSize: 11, color: "var(--fg-3)", flexShrink: 0 }}>{c?.credits} 学分</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          {isGrade ? (
            <select value={s.grade || ""} disabled={f.isLocked}
              onChange={e => updateScore(s.courseId, "grade", e.target.value || null)}
              style={{ ...CONTROL_STYLE, flex: 1, minWidth: 0, appearance: "none", WebkitAppearance: "none", textAlign: "center", paddingRight: 8 }}>
              <option value="">选择等级</option>
              {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          ) : (
            <input type="number" min={0} max={100} step={0.5} inputMode="decimal" placeholder="百分制" value={s.score ?? ""} disabled={f.isLocked}
              onChange={e => {
                const v = e.target.value ? Number(e.target.value) : null
                setScores(p => p.map(x => {
                  if (x.courseId !== s.courseId) return x
                  const autoGpa = v != null && v > 0 ? Math.round(scoreToGPA(v) * 100) / 100 : null
                  return { ...x, score: v, gpa: x.gpa != null ? x.gpa : autoGpa }
                }))
              }}
              style={{ ...CONTROL_STYLE, flex: 1, minWidth: 0, textAlign: "center" }} />
          )}
          <input type="number" step={0.1} min={0} max={5} inputMode="decimal" placeholder="绩点" disabled={f.isLocked}
            value={s.gpa ?? (s.score != null && s.score > 0 ? Math.round(scoreToGPA(s.score) * 100) / 100 : "")}
            onChange={e => updateScore(s.courseId, "gpa", e.target.value ? Number(e.target.value) : null)}
            style={{ ...CONTROL_STYLE, width: 76, flex: "none", textAlign: "center" }} />
          <button type="button" disabled={f.isLocked || f.currentStatus === "submitted"}
            onClick={() => {
              const rep = !s.repeat
              setScores(p => p.map(x => {
                if (x.courseId !== s.courseId) return x
                if (rep) return { ...x, repeat: true, gpa: x.gpa != null ? x.gpa : 0 }
                return { ...x, repeat: false, ...(x.gpa === 0 && x.score == null && !x.grade ? { gpa: null } : {}) }
              }))
            }}
            style={{
              flexShrink: 0, minWidth: 44, height: 42, borderRadius: 10, padding: "0 10px", fontSize: 12.5,
              border: `1px solid ${s.repeat ? "#C7924B" : "var(--border-strong)"}`,
              background: s.repeat ? "#FDF5EA" : "var(--surface)", color: s.repeat ? "#C7924B" : "var(--fg-3)",
              cursor: f.isLocked ? "not-allowed" : "pointer",
            }}>
            {s.repeat ? <><Check size={13} /> 重修</> : "重修"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mob-page">
      <MobTopBar back title={SECTION_META.S.label} right={<StatusChip status={f.currentStatus} />} />
      <RuleBanner items={MOBILE_RULE.S} />
      <ErrorBanner text={f.error} />
      {f.currentStatus === "returned" && <ReturnedBanner note={f.reviewNote} onReedit={() => f.doReedit(saveS)} disabled={f.submitting} />}

      <CardShell title={<><BookOpen size={16} /> 学年汇总</>} sub={`${courses.length} 门课程 · 不含任选课`}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>学年平均绩点 GPA</div>
          <input type="number" min={0} max={5} step={0.01} inputMode="decimal" placeholder={wGPA > 0 ? wGPA.toFixed(2) : "3.62"}
            value={gpaForm.year} disabled={f.isLocked} onChange={e => setGpaForm(x => ({ ...x, year: e.target.value }))} style={CONTROL_STYLE} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>学年综测成绩总分 S</div>
          <input type="number" min={0} step={0.01} inputMode="decimal" placeholder={sScore > 0 ? sScore.toFixed(2) : "自动计算"}
            value={gpaForm.total} disabled={f.isLocked} onChange={e => setGpaForm(x => ({ ...x, total: e.target.value }))} style={CONTROL_STYLE} />
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 8 }}>
          {gpaForm.year === "" ? "输入 GPA 后自动计算总分" : `GPA ${Number(gpaForm.year).toFixed(2)} × 35 × 70% ≈ ${(Number(gpaForm.year) * 35 * 0.7).toFixed(2)}`}
        </div>
      </CardShell>

      {[1, 2].map(sem => {
        const list = sem === 1 ? sem1 : sem2
        if (list.length === 0) return null
        return (
          <CardShell key={sem} title={<><BookOpen size={16} /> 第{sem === 1 ? "一" : "二"}学期课程</>} sub={`百分制 + 五级制 · 共 ${list.length} 门`}>
            {list.map(courseRow)}
          </CardShell>
        )
      })}
      {courses.length === 0 && (
        <CardShell title={<><BookOpen size={16} /> 课程</>}>
          <div style={{ textAlign: "center", padding: "22px 0", color: "var(--fg-3)", fontSize: 13 }}>暂未配置课程</div>
        </CardShell>
      )}

      {(evidence.length > 0 || !f.isLocked) && (
        <CardShell title={<><Upload size={16} /> 佐证照片</>} sub={f.isLocked ? "已提交的成绩截图（只读）" : "成绩截图 · 压缩后自动上传"}>
          <PhotoGrid photos={evidence} disabled={f.isLocked} uploading={uploading}
            onAdd={handleUpload} onRemove={url => setEvidence(prev => prev.filter(x => x !== url))} />
        </CardShell>
      )}

      <ScoreBig label="当前得分" value={effTotal > 0 ? effTotal.toFixed(2) : "--"} tone="#3D5A6E"
        sub={`已填 ${filled}/${courses.length} 门 · 学年 GPA ${effYearGpa > 0 ? effYearGpa.toFixed(2) : "--"}`} />

      <FormActions status={f.currentStatus} submitting={f.submitting} autoSave={f.autosave.autoSave} lastSavedAt={f.autosave.lastSavedAt}
        onSubmit={submit} onWithdraw={() => f.doWithdraw(saveS)} />
    </div>
  )
}

// ============================================================
// B 集会政治学习（学生只读视图；团支书在 /m/zongce/b-manage 评定）
// ============================================================
function SectionBView() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ excellentMember: boolean; partyMember: boolean; youthStudyCount: number } | null>(null)
  const [secStatus, setSecStatus] = useState<Status>("not_started")

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const res = d as SectionsResponse
      const existing = (res.sections || []).find(s => s.section === "B")
      if (existing) {
        setSecStatus((existing.status as Status) || "not_started")
        const p = parseJson<{ excellentMember?: boolean; partyMember?: boolean; youthStudyCount?: number }>(existing.data, {})
        setData({ excellentMember: !!p.excellentMember, partyMember: !!p.partyMember, youthStudyCount: Number(p.youthStudyCount) || 0 })
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [status])

  if (status === "loading" || loading) return FORM_SHELL_LOADING
  if (!session) return null

  const filled = data !== null && secStatus !== "not_started"
  const score = calcBScore(data || {})
  const youthBonus = Math.floor((data?.youthStudyCount || 0) / 3) * 0.2

  return (
    <div className="mob-page">
      <MobTopBar back title={SECTION_META.B.label} right={<StatusChip status={secStatus} />} />
      <RuleBanner items={MOBILE_RULE.B} />
      {!filled ? (
        <MobEmpty icon={<Users size={28} />} title="团支书尚未评定" desc="本板块由团支书统一评定填写，完成后可在此查看得分明细" />
      ) : (
        <>
          <CardShell title={<><Users size={16} /> 我的得分明细</>} right={<MobChip tone="ok">已评定</MobChip>}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 14, color: "var(--fg-2)" }}>
              <span>基础分</span><span style={{ fontFamily: "var(--font-num)", fontWeight: 700, color: "var(--primary)" }}>+1.50</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 14, color: "var(--fg-2)" }}>
              <span>优秀团员{data?.excellentMember ? <MobChip tone="m">已勾选</MobChip> : null}</span><span style={{ fontSize: 12, color: "var(--fg-3)" }}>标记</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 14, color: "var(--fg-2)" }}>
              <span>党支部工作小组成员{data?.partyMember ? <MobChip tone="s">已勾选</MobChip> : null}</span><span style={{ fontSize: 12, color: "var(--fg-3)" }}>标记</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 14, color: "var(--fg-2)" }}>
              <span>青年大学习 · 完成 {data?.youthStudyCount || 0} 期</span>
              <span style={{ fontFamily: "var(--font-num)", fontWeight: 700, color: youthBonus > 0 ? "var(--primary)" : "var(--fg-3)" }}>+{youthBonus.toFixed(2)}</span>
            </div>
          </CardShell>
          <ScoreBig label="B 得分" value={score.toFixed(2)} max="2.5"
            sub={`1.5 + 青年大学习 ${Math.floor((data?.youthStudyCount || 0) / 3)} 组 × 0.2`} />
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--fg-3)" }}>如有疑问，请联系团支书核实</div>
        </>
      )}
    </div>
  )
}

// ============================================================
// C 星级宿舍（学生只读视图）
// ============================================================
function SectionCView() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ starLevel: number; civilizedDorm: boolean } | null>(null)
  const [secStatus, setSecStatus] = useState<Status>("not_started")

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const res = d as SectionsResponse
      const existing = (res.sections || []).find(s => s.section === "C")
      if (existing) {
        setSecStatus((existing.status as Status) || "not_started")
        const p = parseJson<{ starLevel?: number; civilizedDorm?: boolean }>(existing.data, {})
        setData({ starLevel: Number(p.starLevel) || 0, civilizedDorm: !!p.civilizedDorm })
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [status])

  if (status === "loading" || loading) return FORM_SHELL_LOADING
  if (!session) return null

  const filled = data !== null && secStatus !== "not_started"
  const score = calcCScore(data || {})
  const star = STAR_LEVELS[data?.starLevel ?? 0] || STAR_LEVELS[0]

  return (
    <div className="mob-page">
      <MobTopBar back title={SECTION_META.C.label} right={<StatusChip status={secStatus} />} />
      <RuleBanner items={MOBILE_RULE.C} />
      {!filled ? (
        <MobEmpty icon={<Home size={28} />} title="生活委员尚未评定" desc="本板块由生活委员统一评定填写，完成后可在此查看您的宿舍星级得分" />
      ) : (
        <>
          <CardShell>
            <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
              <div style={{ display: "flex", gap: 3, justifyContent: "center", marginBottom: 10, color: star.color }}>
                {[0, 1, 2, 3, 4].map(i => <Star key={i} size={26} fill={i < (data?.starLevel || 0) ? star.color : "transparent"} strokeWidth={1.8} />)}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: star.color }}>{star.label}</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>评定得分：{score.toFixed(2)} / 2.5 分</div>
              {data?.civilizedDorm ? <div style={{ marginTop: 10 }}><MobChip tone="ok">文明宿舍 +0.5</MobChip></div> : null}
            </div>
          </CardShell>
          <CardShell title={<><Home size={16} /> 得分明细</>} right={<MobChip tone="ok">已评定</MobChip>}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 14, color: "var(--fg-2)" }}>
              <span>宿舍星级（{star.label}）</span>
              <span style={{ fontFamily: "var(--font-num)", fontWeight: 700, color: data?.starLevel ? "var(--primary)" : "var(--fg-3)" }}>
                +{(data?.starLevel === 5 ? 2.5 : data?.starLevel === 4 ? 2 : data?.starLevel === 3 ? 1 : 0).toFixed(2)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 14, color: "var(--fg-2)" }}>
              <span>文明宿舍{data?.civilizedDorm ? <MobChip tone="ok">获评</MobChip> : null}</span>
              <span style={{ fontFamily: "var(--font-num)", fontWeight: 700, color: data?.civilizedDorm ? "var(--ok)" : "var(--fg-3)" }}>{data?.civilizedDorm ? "+0.50" : "+0.00"}</span>
            </div>
          </CardShell>
          <ScoreBig label="C 得分" value={score.toFixed(2)} max="2.5"
            sub={`${star.desc}${data?.civilizedDorm ? " + 0.5（文明宿舍）" : ""}`} />
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--fg-3)" }}>如有疑问，请联系生活委员核实</div>
        </>
      )}
    </div>
  )
}

// ============================================================
// D 文体活动
// ============================================================
function SectionDForm() {
  const f = useSectionForm("D")
  const [items, setItems] = useState<DItem[]>([])
  const initializedRef = useRef(false)

  const totalScore = calcDScore(items.map(({ key, ...rest }) => rest))

  useEffect(() => {
    if (f.authStatus !== "authenticated") return
    void (async () => {
      const rec = await f.readSection()
      f.applySection(rec)
      if (rec) {
        const parsed = parseJson<{ items?: DItem[] }>(rec.data, {})
        if (Array.isArray(parsed.items)) {
          setItems(parsed.items.map((it, i) => ({
            key: `k${Date.now()}-${i}`,
            type: it.type || "ceremony",
            name: it.name || "",
            date: it.date || "",
            level: it.level || "school",
            rank: Number(it.rank) || 1,
            rankNote: it.rankNote || "",
            photos: Array.isArray(it.photos) ? it.photos : [],
            score: it.score != null ? Number(it.score) : undefined,
          })))
        }
      }
      f.setLoading(false)
      initializedRef.current = true
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.authStatus])

  const buildData = () => ({ items: items.map(({ key, ...rest }) => rest) })

  useEffect(() => {
    if (!initializedRef.current) return
    if (f.isLocked || f.currentStatus === "submitted") return
    f.autosave.schedule(async () => {
      const r = await putSection("D", buildData(), "draft")
      if (!r.ok) throw new Error(r.error)
      if (r.score !== null) f.setServerScore(r.score)
      void f.refreshStatus()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  if (f.authStatus === "loading" || f.loading) return FORM_SHELL_LOADING
  if (!f.session) return null

  const updateItem = (key: string, patch: Partial<DItem>) => setItems(prev => prev.map(it => it.key === key ? { ...it, ...patch } : it))
  const itemScore = (it: DItem): number => {
    if (it.type === "award") {
      if (it.rank === 5) return it.score ?? 0
      return D_RANK_TABLE[it.level]?.[Math.min(Math.max(it.rank, 1), 4) - 1] ?? 0
    }
    return D_TYPES.find(t => t.v === it.type)?.score ?? 0
  }
  const awardTxt = (it: DItem) => it.rank === 5
    ? "其他 · " + (it.rankNote || "未注明")
    : (D_LEVELS.find(l => l.v === it.level)?.label || "") + " · " + (D_RANKS.find(r => r.v === it.rank)?.label || "")

  async function handleItemUpload(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const r = await uploadImage(file)
    const url = r.url
    if (url) setItems(prev => prev.map(it => it.key === key ? { ...it, photos: [...(it.photos || []), url] } : it))
    else if (r.error) f.toast.error(r.error)
  }

  const save = (status: "draft" | "submitted") => putSection("D", buildData(), status)

  return (
    <div className="mob-page">
      <MobTopBar back title={SECTION_META.D.label} right={<StatusChip status={f.currentStatus} />} />
      <RuleBanner items={MOBILE_RULE.D} />
      <ErrorBanner text={f.error} />
      {f.currentStatus === "returned" && <ReturnedBanner note={f.reviewNote} onReedit={() => f.doReedit(save)} disabled={f.submitting} />}

      <CardShell title={<><Music size={16} /> 参与项目</>} sub="按实际参与填写 · 小计实时累加 · 满分 5 分">
        {items.length === 0 && <div style={{ textAlign: "center", padding: "22px 0 12px", color: "var(--fg-3)", fontSize: 13 }}>暂无项目 · 点击下方「添加项目」开始填写</div>}
        {items.map(it => (
          <div key={it.key} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name || D_TYPE_SHORT[it.type] || it.type}</span>
              <span style={{ fontFamily: "var(--font-num)", fontSize: 11, color: "var(--fg-3)", flexShrink: 0 }}>
                {it.type === "award" && it.rank === 5
                  ? (it.score != null && it.score > 0 ? `+${it.score.toFixed(2)}` : "待确认")
                  : `+${itemScore(it).toFixed(2)}`}
              </span>
              {!f.isLocked && (
                <button type="button" aria-label="删除该项目" onClick={() => setItems(prev => prev.filter(x => x.key !== it.key))}
                  style={{ color: "var(--fg-3)", flexShrink: 0, padding: 4 }}><Trash2 size={16} /></button>
              )}
            </div>
            <PillGroup>
              {D_TYPES.map(t => (
                <Pill key={t.v} active={it.type === t.v} disabled={f.isLocked} onClick={() => updateItem(it.key, { type: t.v })}>
                  {D_TYPE_SHORT[t.v]}
                </Pill>
              ))}
            </PillGroup>
            <input placeholder="活动名称（如：校运会开幕式）" value={it.name} disabled={f.isLocked}
              onChange={e => updateItem(it.key, { name: e.target.value })}
              style={{ ...CONTROL_STYLE, marginTop: 8, fontSize: 13.5 }} />
            {it.type === "award" && (
              <>
                <PillGroup>
                  {D_LEVELS.map(l => <Pill key={l.v} active={it.level === l.v} disabled={f.isLocked} onClick={() => updateItem(it.key, { level: l.v })}>{l.label}</Pill>)}
                </PillGroup>
                <PillGroup>
                  {D_RANKS.map(r => <Pill key={r.v} active={it.rank === r.v} disabled={f.isLocked} onClick={() => updateItem(it.key, { rank: r.v })}>{r.label}</Pill>)}
                </PillGroup>
                {it.rank === 5 && (
                  <input placeholder="请注明具体奖项（如：特等奖）" value={it.rankNote} disabled={f.isLocked}
                    onChange={e => updateItem(it.key, { rankNote: e.target.value })}
                    style={{ ...CONTROL_STYLE, marginTop: 8, fontSize: 13.5 }} />
                )}
              </>
            )}
            <div style={{ marginTop: 10 }}>
              <PhotoGrid photos={it.photos} disabled={f.isLocked}
                onAdd={e => handleItemUpload(it.key, e)}
                onRemove={url => setItems(prev => prev.map(x => x.key === it.key ? { ...x, photos: (x.photos || []).filter(p => p !== url) } : x))} />
            </div>
          </div>
        ))}
        {!f.isLocked && (
          <button type="button" onClick={() => setItems(prev => [...prev, { key: kf(), type: "ceremony", name: "", date: "", level: "school", rank: 1, rankNote: "", photos: [] }])}
            style={{ width: "100%", minHeight: 42, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "1.5px dashed var(--border-strong)", borderRadius: 10, background: "transparent", color: "var(--fg-3)", fontSize: 13 }}>
            <Plus size={15} /> 添加项目
          </button>
        )}
      </CardShell>

      <ScoreBig label="当前得分" value={totalScore.toFixed(2)} max="5" sub={`${items.length} 个项目 · 小计 ${totalScore.toFixed(2)}`} />

      <FormActions status={f.currentStatus} submitting={f.submitting} autoSave={f.autosave.autoSave} lastSavedAt={f.autosave.lastSavedAt}
        onSubmit={() => f.doSubmit(save)} onWithdraw={() => f.doWithdraw(save)} />
    </div>
  )
}

// ============================================================
// E 社会实践/公益
// ============================================================
function SectionEForm() {
  const f = useSectionForm("E")
  const [form, setForm] = useState<EForm>({ isCaptain: false, teamAward: "none", schoolLevelAward: false, cityVolunteer: false, volunteerHours: 0 })
  const [evidence, setEvidence] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const initializedRef = useRef(false)

  const score = calcEScore(form)
  const hourBonus = Math.min(3, form.volunteerHours * 0.1)

  useEffect(() => {
    if (f.authStatus !== "authenticated") return
    void (async () => {
      const rec = await f.readSection()
      f.applySection(rec)
      if (rec) {
        setEvidence(parseJson<string[]>(rec.evidence, []))
        const p = parseJson<EForm>(rec.data, form)
        setForm({
          isCaptain: !!p.isCaptain,
          teamAward: p.teamAward || "none",
          schoolLevelAward: !!p.schoolLevelAward,
          cityVolunteer: !!p.cityVolunteer,
          volunteerHours: Number(p.volunteerHours) || 0,
        })
      }
      f.setLoading(false)
      initializedRef.current = true
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.authStatus])

  useEffect(() => {
    if (!initializedRef.current) return
    if (f.isLocked || f.currentStatus === "submitted") return
    f.autosave.schedule(async () => {
      const r = await putSection("E", form, "draft", evidence)
      if (!r.ok) throw new Error(r.error)
      if (r.score !== null) f.setServerScore(r.score)
      void f.refreshStatus()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, evidence])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    const r = await uploadImage(file)
    const url = r.url
    if (url) setEvidence(prev => [...prev, url])
    else if (r.error) f.toast.error(r.error)
    setUploading(false)
  }

  if (f.authStatus === "loading" || f.loading) return FORM_SHELL_LOADING
  if (!f.session) return null

  const parts: string[] = []
  if (form.isCaptain) parts.push("队长 +0.5")
  if (form.teamAward === "member") parts.push("优秀成员 +1")
  if (form.teamAward === "captain") parts.push("优秀队长 +1.5")
  if (form.schoolLevelAward) parts.push("校级积极分子 +2")
  if (form.cityVolunteer) parts.push("优秀志愿者 +1")
  const breakTxt = parts.length ? parts.join(" · ") + ` · 志愿 +${hourBonus.toFixed(2)}` : "尚未选择 · 0.00"

  const save = (status: "draft" | "submitted") => putSection("E", form, status, evidence)

  return (
    <div className="mob-page">
      <MobTopBar back title={SECTION_META.E.label} right={<StatusChip status={f.currentStatus} />} />
      <RuleBanner items={MOBILE_RULE.E} />
      <ErrorBanner text={f.error} />
      {f.currentStatus === "returned" && <ReturnedBanner note={f.reviewNote} onReedit={() => f.doReedit(save)} disabled={f.submitting} />}

      <CardShell title={<><Heart size={16} /> 参与情况</>} sub="按实际情况开 / 关 · 可多选">
        <SwitchRow label="担任社会实践分队队长 / 召集人" sub="按学年内任职" value="+0.5" on={form.isCaptain} disabled={f.isLocked} onToggle={() => setForm(x => ({ ...x, isCaptain: !x.isCaptain }))} />
        <SwitchRow label="个人获校级社会实践积极分子" sub="以表彰文件为准" value="+2" on={form.schoolLevelAward} disabled={f.isLocked} onToggle={() => setForm(x => ({ ...x, schoolLevelAward: !x.schoolLevelAward }))} />
        <SwitchRow label="市级以上优秀志愿者" sub="需上传 i 志愿截图佐证" value="+1" on={form.cityVolunteer} disabled={f.isLocked} onToggle={() => setForm(x => ({ ...x, cityVolunteer: !x.cityVolunteer }))} />
      </CardShell>

      <CardShell title={<><Medal size={16} /> 分队获奖</>} sub="单选 · 默认无">
        <PillGroup>
          <Pill active={form.teamAward === "none"} disabled={f.isLocked} onClick={() => setForm(x => ({ ...x, teamAward: "none" }))}>无</Pill>
          <Pill active={form.teamAward === "member"} disabled={f.isLocked} onClick={() => setForm(x => ({ ...x, teamAward: "member" }))}>优秀分队成员 +1</Pill>
          <Pill active={form.teamAward === "captain"} disabled={f.isLocked} onClick={() => setForm(x => ({ ...x, teamAward: "captain" }))}>优秀分队队长或召集人 +1.5</Pill>
        </PillGroup>
      </CardShell>

      <CardShell title={<><Zap size={16} /> 志愿时长</>} sub="两学期总时长 · i 志愿平台记录为准">
        <StepperRow label="志愿时长（小时）" sub="0.1 分 / 小时 · 封顶 3 分" value={form.volunteerHours} max={999} disabled={f.isLocked}
          onChange={v => setForm(x => ({ ...x, volunteerHours: v }))} />
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 8 }}>{form.volunteerHours.toFixed(1)} 小时 × 0.1 = +{hourBonus.toFixed(2)}（封顶 3）</div>
      </CardShell>

      {(evidence.length > 0 || !f.isLocked) && (
        <CardShell title={<><Upload size={16} /> 佐证照片</>} sub={f.isLocked ? "已提交的佐证截图（只读）" : "i 志愿截图 · 志愿服务证明"}>
          <PhotoGrid photos={evidence} disabled={f.isLocked} uploading={uploading}
            onAdd={handleUpload} onRemove={url => setEvidence(prev => prev.filter(x => x !== url))} />
        </CardShell>
      )}

      <ScoreBig label="当前得分" value={score.toFixed(2)} max="5" sub={breakTxt} />

      <FormActions status={f.currentStatus} submitting={f.submitting} autoSave={f.autosave.autoSave} lastSavedAt={f.autosave.lastSavedAt}
        onSubmit={() => f.doSubmit(save)} onWithdraw={() => f.doWithdraw(save)} />
    </div>
  )
}

// ============================================================
// F 奖惩附加（F1 学生工作 / F2 竞赛 / F3 荣誉 / F4 科研 / F5 惩罚）
// ============================================================
function SectionFForm() {
  const f = useSectionForm("F")
  const [f1, setF1] = useState<F1Item[]>([])
  const [f2, setF2] = useState<F2Item[]>([])
  const [f3, setF3] = useState<F3Item[]>([])
  const [f4, setF4] = useState<F4Item[]>([])
  const [f5, setF5] = useState<F5Item[]>([])
  const initializedRef = useRef(false)

  useEffect(() => {
    if (f.authStatus !== "authenticated") return
    void (async () => {
      const rec = await f.readSection()
      f.applySection(rec)
      if (rec) {
        const p = parseJson<{ f1?: F1Item[]; f2?: F2Item[]; f3?: F3Item[]; f4?: F4Item[]; f5?: F5Item[] }>(rec.data, {})
        const map = <T,>(arr: T[]) => (arr || []).map(it => ({ key: kf(), ...it }))
        setF1(map<Omit<F1Item, "key">>(p.f1 || []))
        setF2(map<Omit<F2Item, "key">>(p.f2 || []))
        setF3(map<Omit<F3Item, "key">>(p.f3 || []))
        setF4(map<Omit<F4Item, "key">>(p.f4 || []))
        setF5(map<Omit<F5Item, "key">>(p.f5 || []))
      }
      f.setLoading(false)
      initializedRef.current = true
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.authStatus])

  const buildData = () => ({
    f1: f1.map(({ key, ...rest }) => rest),
    f2: f2.map(({ key, ...rest }) => rest),
    f3: f3.map(({ key, ...rest }) => rest),
    f4: f4.map(({ key, ...rest }) => rest),
    f5: f5.map(({ key, ...rest }) => rest),
  })

  // F 板块条目照片上传（f1-f4 通用）
  async function handleFItemUpload<T extends { key: string; photos: string[] }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>, key: string, e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const r = await uploadImage(file)
    if (r.url) setter(prev => prev.map(it => it.key === key ? { ...it, photos: [...(it.photos || []), r.url as string] } : it))
    else if (r.error) f.toast.error(r.error)
  }
  const removeFItemPhoto = <T extends { key: string; photos: string[] }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>, key: string, url: string,
  ) => setter(prev => prev.map(it => it.key === key ? { ...it, photos: (it.photos || []).filter(p => p !== url) } : it))

  useEffect(() => {
    if (!initializedRef.current) return
    if (f.isLocked || f.currentStatus === "submitted") return
    f.autosave.schedule(async () => {
      const r = await putSection("F", buildData(), "draft")
      if (!r.ok) throw new Error(r.error)
      if (r.score !== null) f.setServerScore(r.score)
      void f.refreshStatus()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f1, f2, f3, f4, f5])

  if (f.authStatus === "loading" || f.loading) return FORM_SHELL_LOADING
  if (!f.session) return null

  const strip = {
    f1: f1.map(({ key, photos, ...rest }) => rest),
    f2: f2.map(({ key, photos, ...rest }) => rest),
    f3: f3.map(({ key, photos, ...rest }) => rest),
    f4: f4.map(({ key, photos, ...rest }) => rest),
    f5: f5.map(({ key, ...rest }) => rest),
  }
  const score = calcFScore(strip)
  const f1Sum = calcFScore({ f1: strip.f1 })
  const f2Sum = calcFScore({ f2: strip.f2 })
  const f3Sum = calcFScore({ f3: strip.f3 })
  const f4Sum = calcFScore({ f4: strip.f4 })
  let f5Sum = 0
  for (const p of f5) f5Sum += (F5_PENALTY_SCORES[p.type] || 0) * (p.count || 1)
  f5Sum = Math.min(5, f5Sum)

  const f1Groups = (() => {
    const g: { category: string; options: { type: string; label: string; year: number; sem: number }[] }[] = []
    for (const p of POSITION_PRESETS) {
      let grp = g.find(x => x.category === p.category)
      if (!grp) { grp = { category: p.category, options: [] }; g.push(grp) }
      grp.options.push({ type: p.type, label: p.label, year: p.yearScore, sem: p.semScore })
    }
    return g
  })()

  const f1ItemScore = (it: F1Item) => {
    const p = POSITION_PRESETS.find(x => x.type === it.position)
    if (!p) return 0
    let s = it.duration === "sem" ? p.semScore : p.yearScore
    if (it.evaluation === "excellent") s += 0.5
    else if (it.evaluation === "fail") s -= 0.5
    return Math.max(0, s)
  }
  const f2ItemScore = (it: F2Item) => {
    const r = it.rank === 0 ? 1 : it.rank
    const base = F2_RANK_SCORES[it.category]?.[Math.min(Math.max(r, 1), 3) - 1] ?? 0
    if (!it.isTeam) return base
    const size = Math.min(Math.max(it.teamSize, 1), 8)
    const pos = Math.min(Math.max(it.position, 1), size)
    let coef = 0.2
    if (size >= 6) coef = [0.5, 0.5, 0.45, 0.4, 0.35, 0.2][Math.min(pos, 6) - 1] ?? 0.2
    else coef = ({ 2: [0.9, 0.85], 3: [0.8, 0.75, 0.7], 4: [0.7, 0.65, 0.6, 0.55], 5: [0.6, 0.55, 0.5, 0.45, 0.4] } as Record<number, number[]>)[size]?.[pos - 1] ?? 0.2
    return base * coef
  }
  const f3ItemScore = (it: F3Item) => F3_HONOR_SCORES[it.level] || 0
  const f4ItemScore = (it: F4Item) => {
    switch (it.type) {
      case "newspaper": return 0.5
      case "journal": return it.rank === 1 ? 2 : it.rank === 2 ? 0.8 : Math.max(0.2, 0.8 - ((it.rank || 3) - 2) * 0.2)
      case "essay": return ({ 1: 1, 2: 0.8, 3: 0.5, 4: 0.25 } as Record<number, number>)[it.rank || 4] ?? 0
      case "research": return it.level === "province" ? 2.5 : 2
      case "patent": return 2
      default: return 0
    }
  }
  const f5ItemScore = (it: F5Item) => (F5_PENALTY_SCORES[it.type] || 0) * it.count

  const save = (status: "draft" | "submitted") => putSection("F", buildData(), status)

  return (
    <div className="mob-page">
      <MobTopBar back title={SECTION_META.F.label} right={<StatusChip status={f.currentStatus} />} />
      <RuleBanner items={MOBILE_RULE.F} />
      <ErrorBanner text={f.error} />
      {f.currentStatus === "returned" && <ReturnedBanner note={f.reviewNote} onReedit={() => f.doReedit(save)} disabled={f.submitting} />}

      {/* F1 学生工作 */}
      <CardShell title={<><Users size={16} /> F1 学生工作</>} sub="学干任职 · 最多叠加 3 个职位">
        {f1.length === 0 && <div style={{ textAlign: "center", padding: "18px 0 10px", color: "var(--fg-3)", fontSize: 13 }}>暂无职位记录</div>}
        {f1.map(it => {
          const pos = POSITION_PRESETS.find(x => x.type === it.position)
          const cat = pos?.category || ""
          const grp = f1Groups.find(g => g.category === cat)
          return (
            <div key={it.key} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{pos?.label || "未选职位"}</span>
                <span style={{ fontFamily: "var(--font-num)", fontSize: 13, fontWeight: 700, color: "var(--primary)", flexShrink: 0 }}>+{f1ItemScore(it).toFixed(2)}</span>
                {!f.isLocked && <button type="button" aria-label="删除该职位" onClick={() => setF1(prev => prev.filter(x => x.key !== it.key))} style={{ color: "var(--fg-3)", flexShrink: 0, padding: 4 }}><Trash2 size={16} /></button>}
              </div>
              <PillGroup>
                {f1Groups.map(g => (
                  <Pill key={g.category} active={cat === g.category} disabled={f.isLocked}
                    onClick={() => setF1(prev => prev.map(x => x.key === it.key ? { ...x, position: g.options[0]?.type || "", duration: g.category === "勤工助学" ? "sem" : x.duration } : x))}>
                    {g.category}
                  </Pill>
                ))}
              </PillGroup>
              {grp && (
                <PillGroup>
                  {grp.options.map(o => <Pill key={o.type} active={it.position === o.type} disabled={f.isLocked} onClick={() => setF1(prev => prev.map(x => x.key === it.key ? { ...x, position: o.type } : x))}>{o.label}</Pill>)}
                </PillGroup>
              )}
              <PillGroup>
                {cat === "勤工助学" ? (
                  <Pill active disabled>按学期计 1.1 分</Pill>
                ) : (
                  <>
                    <Pill active={it.duration === "year"} disabled={f.isLocked} onClick={() => setF1(prev => prev.map(x => x.key === it.key ? { ...x, duration: "year" } : x))}>一学年</Pill>
                    <Pill active={it.duration === "sem"} disabled={f.isLocked} onClick={() => setF1(prev => prev.map(x => x.key === it.key ? { ...x, duration: "sem" } : x))}>一学期</Pill>
                  </>
                )}
                {F1_EVAL_CATEGORIES.includes(cat) && (
                  <>
                    <Pill active={it.evaluation === "pass"} disabled={f.isLocked} onClick={() => setF1(prev => prev.map(x => x.key === it.key ? { ...x, evaluation: "pass" } : x))}>考评合格</Pill>
                    <Pill active={it.evaluation === "excellent"} disabled={f.isLocked} onClick={() => setF1(prev => prev.map(x => x.key === it.key ? { ...x, evaluation: "excellent" } : x))}>考评优秀 +0.5</Pill>
                    <Pill active={it.evaluation === "fail"} disabled={f.isLocked} onClick={() => setF1(prev => prev.map(x => x.key === it.key ? { ...x, evaluation: "fail" } : x))}>考评不合格 −0.5</Pill>
                  </>
                )}
              </PillGroup>
              <PhotoGrid photos={it.photos || []} disabled={f.isLocked}
                onAdd={e => handleFItemUpload(setF1, it.key, e)}
                onRemove={url => removeFItemPhoto(setF1, it.key, url)} />
            </div>
          )
        })}
        {!f.isLocked && (
          <button type="button" onClick={() => setF1(prev => [...prev, { key: kf(), position: "", duration: "year", evaluation: "pass", photos: [] }])}
            style={addBtnStyle}><Plus size={15} /> 添加职位</button>
        )}
      </CardShell>

      {/* F2 竞赛 */}
      <CardShell title={<><Trophy size={16} /> F2 竞赛</>} sub="学科竞赛获奖 · 类别 × 名次 × 个人/团队">
        {f2.length === 0 && <div style={{ textAlign: "center", padding: "18px 0 10px", color: "var(--fg-3)", fontSize: 13 }}>暂无竞赛记录</div>}
        {f2.map(it => (
          <div key={it.key} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{it.name || "竞赛项目"}</span>
              <span style={{ fontFamily: "var(--font-num)", fontSize: 13, fontWeight: 700, color: "var(--primary)", flexShrink: 0 }}>+{f2ItemScore(it).toFixed(2)}</span>
              {!f.isLocked && <button type="button" aria-label="删除该项目" onClick={() => setF2(prev => prev.filter(x => x.key !== it.key))} style={{ color: "var(--fg-3)", flexShrink: 0, padding: 4 }}><Trash2 size={16} /></button>}
            </div>
            <input placeholder="竞赛名称（如：数学建模）" value={it.name} disabled={f.isLocked}
              onChange={e => setF2(prev => prev.map(x => x.key === it.key ? { ...x, name: e.target.value } : x))}
              style={{ ...CONTROL_STYLE, marginTop: 8, fontSize: 13.5 }} />
            <PillGroup>
              {F2_CATEGORIES.map(c => <Pill key={c.v} active={it.category === c.v} disabled={f.isLocked} onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, category: c.v } : x))}>{c.label}</Pill>)}
            </PillGroup>
            <PillGroup>
              <Pill active={it.rank === 0} disabled={f.isLocked} onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, rank: 0 } : x))}>特等奖（按一等）</Pill>
              <Pill active={it.rank === 1} disabled={f.isLocked} onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, rank: 1 } : x))}>一等奖</Pill>
              <Pill active={it.rank === 2} disabled={f.isLocked} onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, rank: 2 } : x))}>二等奖</Pill>
              <Pill active={it.rank === 3} disabled={f.isLocked} onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, rank: 3 } : x))}>三等奖</Pill>
            </PillGroup>
            <PillGroup>
              <Pill active={!it.isTeam} disabled={f.isLocked} onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, isTeam: false } : x))}>个人</Pill>
              <Pill active={it.isTeam} disabled={f.isLocked} onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, isTeam: true } : x))}>团队</Pill>
            </PillGroup>
            {it.isTeam && (
              <>
                <PillGroup>
                  {[2, 3, 4, 5, 6, 7, 8].map(n => <Pill key={n} active={it.teamSize === n} disabled={f.isLocked} onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, teamSize: n } : x))}>{n} 人</Pill>)}
                </PillGroup>
                <PillGroup>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <Pill key={n} active={it.position === n} disabled={f.isLocked} onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, position: n } : x))}>第 {n} 位</Pill>)}
                </PillGroup>
              </>
            )}
            <PhotoGrid photos={it.photos || []} disabled={f.isLocked}
              onAdd={e => handleFItemUpload(setF2, it.key, e)}
              onRemove={url => removeFItemPhoto(setF2, it.key, url)} />
          </div>
        ))}
        {!f.isLocked && (
          <button type="button" onClick={() => setF2(prev => [...prev, { key: kf(), name: "", category: "A", rank: 1, isTeam: false, teamSize: 1, position: 1, photos: [] }])}
            style={addBtnStyle}><Plus size={15} /> 添加竞赛</button>
        )}
      </CardShell>

      {/* F3 荣誉 */}
      <CardShell title={<><Medal size={16} /> F3 荣誉</>} sub="荣誉称号 · 国家 3 / 省 2.5 / 市 2 / 校 1">
        {f3.length === 0 && <div style={{ textAlign: "center", padding: "18px 0 10px", color: "var(--fg-3)", fontSize: 13 }}>暂无荣誉称号</div>}
        {f3.map(it => (
          <div key={it.key} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{it.name || "荣誉称号"}</span>
              <span style={{ fontFamily: "var(--font-num)", fontSize: 13, fontWeight: 700, color: "var(--primary)", flexShrink: 0 }}>+{f3ItemScore(it).toFixed(2)}</span>
              {!f.isLocked && <button type="button" aria-label="删除该称号" onClick={() => setF3(prev => prev.filter(x => x.key !== it.key))} style={{ color: "var(--fg-3)", flexShrink: 0, padding: 4 }}><Trash2 size={16} /></button>}
            </div>
            <PillGroup>
              {F3_LEVELS.map(l => <Pill key={l.v} active={it.level === l.v} disabled={f.isLocked} onClick={() => setF3(prev => prev.map(x => x.key === it.key ? { ...x, level: l.v } : x))}>{l.label}</Pill>)}
            </PillGroup>
            <input placeholder="称号名称（如：优秀志愿者）" value={it.name} disabled={f.isLocked}
              onChange={e => setF3(prev => prev.map(x => x.key === it.key ? { ...x, name: e.target.value } : x))}
              style={{ ...CONTROL_STYLE, marginTop: 8, fontSize: 13.5 }} />
            <PhotoGrid photos={it.photos || []} disabled={f.isLocked}
              onAdd={e => handleFItemUpload(setF3, it.key, e)}
              onRemove={url => removeFItemPhoto(setF3, it.key, url)} />
          </div>
        ))}
        {!f.isLocked && (
          <button type="button" onClick={() => setF3(prev => [...prev, { key: kf(), level: "school", name: "", photos: [] }])}
            style={addBtnStyle}><Plus size={15} /> 添加称号</button>
        )}
      </CardShell>

      {/* F4 科研 */}
      <CardShell title={<><FlaskConical size={16} /> F4 科研</>} sub="校报 / 论文 / 征文 / 课题 / 专利">
        {f4.length === 0 && <div style={{ textAlign: "center", padding: "18px 0 10px", color: "var(--fg-3)", fontSize: 13 }}>暂无科研成果</div>}
        {f4.map(it => (
          <div key={it.key} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{F4_SHORT[it.type] || ""}</span>
              <span style={{ fontFamily: "var(--font-num)", fontSize: 13, fontWeight: 700, color: "var(--primary)", flexShrink: 0 }}>+{f4ItemScore(it).toFixed(2)}</span>
              {!f.isLocked && <button type="button" aria-label="删除该成果" onClick={() => setF4(prev => prev.filter(x => x.key !== it.key))} style={{ color: "var(--fg-3)", flexShrink: 0, padding: 4 }}><Trash2 size={16} /></button>}
            </div>
            <PillGroup>
              {F4_TYPES.map(t => <Pill key={t.v} active={it.type === t.v} disabled={f.isLocked} onClick={() => setF4(prev => prev.map(x => x.key === it.key ? { ...x, type: t.v } : x))}>{F4_SHORT[t.v]}</Pill>)}
            </PillGroup>
            {it.type === "journal" && (
              <PillGroup>
                <Pill active={it.rank === 1} disabled={f.isLocked} onClick={() => setF4(prev => prev.map(x => x.key === it.key ? { ...x, rank: 1 } : x))}>第一作者 +2</Pill>
                <Pill active={it.rank === 2} disabled={f.isLocked} onClick={() => setF4(prev => prev.map(x => x.key === it.key ? { ...x, rank: 2 } : x))}>第二作者 +0.8</Pill>
                <Pill active={it.rank >= 3} disabled={f.isLocked} onClick={() => setF4(prev => prev.map(x => x.key === it.key ? { ...x, rank: 3 } : x))}>第三作者及以后</Pill>
              </PillGroup>
            )}
            {it.type === "essay" && (
              <PillGroup>
                <Pill active={it.rank === 1} disabled={f.isLocked} onClick={() => setF4(prev => prev.map(x => x.key === it.key ? { ...x, rank: 1 } : x))}>一等奖 +1</Pill>
                <Pill active={it.rank === 2} disabled={f.isLocked} onClick={() => setF4(prev => prev.map(x => x.key === it.key ? { ...x, rank: 2 } : x))}>二等奖 +0.8</Pill>
                <Pill active={it.rank === 3} disabled={f.isLocked} onClick={() => setF4(prev => prev.map(x => x.key === it.key ? { ...x, rank: 3 } : x))}>三等奖 +0.5</Pill>
                <Pill active={it.rank === 4} disabled={f.isLocked} onClick={() => setF4(prev => prev.map(x => x.key === it.key ? { ...x, rank: 4 } : x))}>优秀奖 +0.25</Pill>
              </PillGroup>
            )}
            {it.type === "research" && (
              <PillGroup>
                <Pill active={it.level === "city"} disabled={f.isLocked} onClick={() => setF4(prev => prev.map(x => x.key === it.key ? { ...x, level: "city" } : x))}>市厅级 +2</Pill>
                <Pill active={it.level === "province"} disabled={f.isLocked} onClick={() => setF4(prev => prev.map(x => x.key === it.key ? { ...x, level: "province" } : x))}>省级 +2.5</Pill>
              </PillGroup>
            )}
            <input placeholder={it.type === "patent" ? "专利名称/专利号" : "名称/说明"} value={it.detail} disabled={f.isLocked}
              onChange={e => setF4(prev => prev.map(x => x.key === it.key ? { ...x, detail: e.target.value } : x))}
              style={{ ...CONTROL_STYLE, marginTop: 8, fontSize: 13.5 }} />
            <PhotoGrid photos={it.photos || []} disabled={f.isLocked}
              onAdd={e => handleFItemUpload(setF4, it.key, e)}
              onRemove={url => removeFItemPhoto(setF4, it.key, url)} />
          </div>
        ))}
        {!f.isLocked && (
          <button type="button" onClick={() => setF4(prev => [...prev, { key: kf(), type: "newspaper", detail: "", rank: 1, level: "city", photos: [] }])}
            style={addBtnStyle}><Plus size={15} /> 添加成果</button>
        )}
      </CardShell>

      {/* F5 惩罚 */}
      <CardShell title={<><ShieldAlert size={16} /> F5 惩罚</>} sub="处分记录 · 累计扣分不超过 5 分">
        {f5.length === 0 && <div style={{ textAlign: "center", padding: "18px 0 10px", color: "var(--fg-3)", fontSize: 13 }}>无处分记录</div>}
        {f5.map(it => (
          <div key={it.key} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{it.type}</span>
              <span style={{ fontFamily: "var(--font-num)", fontSize: 13, fontWeight: 700, color: "var(--danger)", flexShrink: 0 }}>−{f5ItemScore(it).toFixed(2)}</span>
              {!f.isLocked && <button type="button" aria-label="删除该处分" onClick={() => setF5(prev => prev.filter(x => x.key !== it.key))} style={{ color: "var(--fg-3)", flexShrink: 0, padding: 4 }}><Trash2 size={16} /></button>}
            </div>
            <PillGroup>
              {F5_TYPES.map(t => <Pill key={t} active={it.type === t} disabled={f.isLocked} onClick={() => setF5(prev => prev.map(x => x.key === it.key ? { ...x, type: t } : x))}>{t} −{F5_PENALTY_SCORES[t]}</Pill>)}
            </PillGroup>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: "var(--fg-3)" }}>次数</span>
              <Stepper value={it.count} min={1} max={5} disabled={f.isLocked}
                onChange={v => setF5(prev => prev.map(x => x.key === it.key ? { ...x, count: v } : x))} />
            </div>
          </div>
        ))}
        {!f.isLocked && (
          <button type="button" onClick={() => setF5(prev => [...prev, { key: kf(), type: "警告", count: 1 }])}
            style={addBtnStyle}><Plus size={15} /> 添加处分</button>
        )}
      </CardShell>

      <ScoreBig label="当前得分" value={score.toFixed(2)} max="10"
        sub={`F1 +${f1Sum.toFixed(2)} · F2 +${f2Sum.toFixed(2)} · F3 +${f3Sum.toFixed(2)} · F4 +${f4Sum.toFixed(2)} · F5 −${f5Sum.toFixed(2)}`} />

      <FormActions status={f.currentStatus} submitting={f.submitting} autoSave={f.autosave.autoSave} lastSavedAt={f.autosave.lastSavedAt}
        onSubmit={() => f.doSubmit(save)} onWithdraw={() => f.doWithdraw(save)} />
    </div>
  )
}

const addBtnStyle: React.CSSProperties = {
  width: "100%", minHeight: 42, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  border: "1.5px dashed var(--border-strong)", borderRadius: 10, background: "transparent", color: "var(--fg-3)", fontSize: 13,
}
