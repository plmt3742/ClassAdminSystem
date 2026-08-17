"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import { ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react"
import MobTopBar from "@/app/m/_components/MobTopBar"
import MobEmpty from "@/app/m/_components/MobEmpty"
import MobLoading from "@/app/m/_components/MobLoading"
import MobCard from "@/app/m/_components/MobCard"
import MobChip from "@/app/m/_components/MobChip"
import MobButton from "@/app/m/_components/MobButton"
import MobAvatar from "@/app/m/_components/MobAvatar"
import MobField from "@/app/m/_components/MobField"
import MobImageViewer, { type MobViewerImage } from "@/app/m/_components/MobImageViewer"
import { useToast } from "@/app/m/_components/MobToast"
import {
  SECTION_META,
  scoreToGPA,
  calcWeightedGPA,
  calcSScore,
  calcDScore,
  D_RANK_TABLE,
  POSITION_PRESETS,
  COMPETITION_LEVELS,
  F2_RANK_SCORES,
  F3_HONOR_SCORES,
  F5_PENALTY_SCORES,
  F2_TEAM_COEF,
  F2_TEAM_COEF_6,
} from "@/lib/zongce-utils"

type Tone = "ok" | "warn" | "danger" | "info" | "neutral" | "s" | "m" | "t"

interface CourseScoreItem {
  id: string
  courseId: string
  userId: string
  score: number | null
  grade: string | null
  gpa: number | null
  repeat?: boolean
  course: { id: string; name: string; credits: number; semester: number; isElective: boolean; sortOrder: number }
}

interface SectionUser {
  id: string
  name: string
  studentId: string
}

interface ReviewSection {
  id: string
  section: string
  status: string
  data: string | null
  evidence: string | null
  score: number | null
  reviewNote: string | null
  reviewedAt: string | null
  submittedAt: string | null
  userId: string
  user?: SectionUser
}

interface Sibling {
  sectionId: string
  name: string
  studentId: string
  status: string
}

interface DItem {
  type: string
  name?: string
  date?: string
  level?: string
  rank?: number
  rankNote?: string
  score?: number
  photos?: string[]
  count?: number
}

interface F1Item { position?: string; duration?: string; evaluation?: string; photos?: string[] }
interface F2Item { category?: string; rank?: number; isTeam?: boolean; teamSize?: number; position?: number; name?: string; photos?: string[] }
interface F3Item { level?: string; name?: string; photos?: string[] }
interface F4Item { type?: string; rank?: number; level?: string; detail?: string; photos?: string[] }
interface F5Item { type?: string; count?: number }

interface ParsedSectionData {
  absences?: number
  tardies?: number
  specialLeaves?: number
  items?: DItem[]
  isCaptain?: boolean
  teamAward?: string
  schoolLevelAward?: boolean
  cityVolunteer?: boolean
  volunteerHours?: number
  f1?: F1Item[]
  f2?: F2Item[]
  f3?: F3Item[]
  f4?: F4Item[]
  f5?: F5Item[]
  sem1Gpa?: number | null
  sem2Gpa?: number | null
  yearGpa?: number | null
  totalScore?: number | null
  score?: number
}

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  submitted: { label: "待审核", tone: "warn" },
  approved: { label: "已通过", tone: "ok" },
  returned: { label: "已退回", tone: "danger" },
  draft: { label: "草稿", tone: "neutral" },
  not_started: { label: "未提交", tone: "neutral" },
}

// D 板块展示映射（与填写端一致）
const D_TYPE_LABELS: Record<string, string> = {
  ceremony: "大型活动", team_unranked: "队伍参赛未获奖", performance: "文艺表演",
  rehearsal: "文艺排练", sports: "阳光体育", sports_unranked: "运动会参与未获奖", award: "获奖项目",
}
const D_TYPE_SCORES: Record<string, number> = {
  ceremony: 0.2, team_unranked: 0.3, performance: 0.3, rehearsal: 0.2, sports: 0.5, sports_unranked: 0.3,
}
const D_LEVEL_LABELS: Record<string, string> = { college: "院级", school: "校级", province: "省级", national: "国家级" }
const D_RANK_LABELS: Record<number, string> = { 1: "一等奖", 2: "二等奖", 3: "三等奖", 4: "第4-8名", 5: "其他" }

// F 板块分项加分（与评分引擎一致，供审核核对）
function f1Score(it: F1Item): number {
  const preset = POSITION_PRESETS.find(p => p.type === it.position)
  if (!preset) return 0
  let s = it.duration === "sem" ? preset.semScore : preset.yearScore
  if (it.evaluation === "excellent") s += 0.5
  else if (it.evaluation === "fail") s -= 0.5
  return Math.round(Math.max(0, s) * 100) / 100
}

function f2Score(it: F2Item): number {
  const base = (F2_RANK_SCORES[it.category || ""] || [0, 0, 0])[Math.min(Math.max(it.rank ?? 1, 1), 3) - 1] || 0
  if (!it.isTeam) return base
  const size = Math.min(Math.max(it.teamSize || 1, 1), 8)
  let coef = 0.2
  const pos = it.position ?? 0
  if (pos > 0) {
    const p = Math.min(Math.max(pos, 1), size)
    if (size >= 6) coef = F2_TEAM_COEF_6[Math.min(p, 6) - 1] ?? 0.2
    else coef = (F2_TEAM_COEF[size] || [1])[p - 1] ?? 0.2
  } else {
    let sum = 0
    if (size >= 6) sum = F2_TEAM_COEF_6.reduce((a, b) => a + b, 0) + (size - 6) * 0.2
    else sum = (F2_TEAM_COEF[size] || [1]).reduce((a, b) => a + b, 0)
    coef = Math.round((sum / size) * 1000) / 1000
  }
  return Math.round(base * coef * 100) / 100
}

function f4Score(it: F4Item): number {
  switch (it.type) {
    case "newspaper": return 0.5
    case "journal": return it.rank === 1 ? 2 : it.rank === 2 ? 0.8 : Math.max(0.2, 0.8 - ((it.rank ?? 3) - 2) * 0.2)
    case "essay": return ({ 1: 1, 2: 0.8, 3: 0.5, 4: 0.25 } as Record<number, number>)[it.rank ?? 4] ?? 0
    case "research": return it.level === "province" ? 2.5 : 2
    case "patent": return 2
    default: return 0
  }
}

const F4_TYPE: Record<string, string> = { newspaper: "校报文章", journal: "期刊论文", essay: "征文/课题", research: "课题调研", patent: "专利" }

function f4Detail(it: F4Item): string {
  if (it.type === "journal") return it.rank === 1 ? "第一作者" : it.rank === 2 ? "第二作者" : `第${it.rank ?? 3}作者`
  if (it.type === "essay") return `第${it.rank ?? 4}作者`
  if (it.type === "research") return it.level === "province" ? "省级课题" : "校级课题"
  return it.detail || ""
}

interface FGroupBlockProps<T> {
  title: string
  items: T[]
  score: (it: T) => number
  photos: (it: T) => string[]
  desc: (it: T) => string
  danger?: boolean
  onView: (urls: string[], idx: number) => void
}

function FGroupBlock<T>({ title, items, score, photos, desc, danger = false, onView }: FGroupBlockProps<T>) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--fg-3)", fontWeight: 700, margin: "6px 0 4px" }}>
        {title}（{items.length}）
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--fg-3)", padding: "4px 0" }}>无记录</div>
      ) : (
        items.map((it, i) => {
          const sc = score(it)
          const ph = photos(it)
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "var(--surface-2)", marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--fg)", flex: 1, minWidth: 160, lineHeight: 1.5 }}>{desc(it)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: danger ? "var(--danger)" : sc > 0 ? "var(--primary)" : "var(--fg-3)", flex: "none", fontFamily: "var(--font-num)" }}>
                {sc > 0 ? `+${sc.toFixed(2)}` : sc < 0 ? sc.toFixed(2) : "0.00"}
              </span>
              {ph.length > 0 && (
                <div style={{ display: "flex", gap: 4 }}>
                  {ph.slice(0, 3).map((url, pi) => (
                    <button
                      key={pi}
                      type="button"
                      onClick={() => onView(ph, pi)}
                      style={{ width: 34, height: 34, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", padding: 0, background: "var(--surface)" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="佐证" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </button>
                  ))}
                  {ph.length > 3 && <span style={{ fontSize: 11, color: "var(--fg-3)", alignSelf: "center" }}>+{ph.length - 3}</span>}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function fmtTime(t?: string | null): string {
  if (!t) return "—"
  const d = new Date(t)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function sectionLabelOf(sectionKey: string): string {
  const meta = SECTION_META[sectionKey]
  return meta ? meta.label : sectionKey
}

export default function ReviewDetailPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams<{ section: string; id: string }>()
  const toast = useToast()

  const sectionKey = (params.section || "").toLowerCase()
  const reviewId = params.id as string
  const listPath = `/m/zongce/review/${sectionKey}`

  const [section, setSection] = useState<ReviewSection | null>(null)
  const [courseScores, setCourseScores] = useState<CourseScoreItem[]>([])
  const [siblings, setSiblings] = useState<Sibling[]>([])
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const [reviewNote, setReviewNote] = useState("")
  const [noteError, setNoteError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [manualScores, setManualScores] = useState<Record<number, string>>({})

  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImages, setViewerImages] = useState<MobViewerImage[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)

  const openViewer = (urls: string[], idx = 0) => {
    setViewerImages(urls.map(u => ({ url: u, label: u.split("/").pop() || "佐证图片" })))
    setViewerIndex(idx)
    setViewerOpen(true)
  }

  useEffect(() => {
    fetch(`/api/zongce/review/${reviewId}`)
      .then(async res => {
        if (res.status === 403) {
          setDenied(true)
          setLoading(false)
          return
        }
        if (res.status === 404) {
          setNotFound(true)
          setLoading(false)
          return
        }
        if (!res.ok) {
          setLoading(false)
          return
        }
        const d = await res.json()
        setSection(d.section as ReviewSection)
        setCourseScores(d.courseScores || [])
        setSiblings(d.siblings || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [reviewId])

  const handleReview = async (approved: boolean) => {
    if (!approved && !reviewNote.trim()) {
      setNoteError("退回必须填写理由")
      return
    }
    setNoteError("")
    setSubmitting(true)
    const manual: Record<number, number> = {}
    if (approved) {
      for (const [k, v] of Object.entries(manualScores)) {
        const idx = Number(k)
        const val = Number(v)
        if (Number.isFinite(val) && val > 0) manual[idx] = val
      }
    }
    const body: Record<string, unknown> = { approved, reviewNote: approved ? null : reviewNote }
    if (Object.keys(manual).length > 0) body.manualScores = manual
    try {
      const res = await fetch(`/api/zongce/review/${reviewId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(approved ? "已通过" : "已退回")
        router.push(listPath)
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(d.error || "操作失败")
      }
    } catch {
      toast.error("网络异常，请重试")
    } finally {
      setSubmitting(false)
    }
  }

  const handleAction = async (action: "reopen" | "unapprove", successMsg: string) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/zongce/review/${reviewId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        toast.success(successMsg)
        router.push(listPath)
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(d.error || "操作失败")
      }
    } catch {
      toast.error("网络异常，请重试")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mob-page">
        <MobTopBar title="审核详情" back onBack={() => router.push(listPath)} />
        <MobLoading rows={7} />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="mob-page">
        <MobTopBar title="审核详情" back onBack={() => router.push(listPath)} />
        <MobEmpty
          icon={<ShieldAlert size={28} />}
          title="无权审核"
          desc="该板块不属于您的审核范围"
          actionText="返回列表"
          onAction={() => router.push(listPath)}
        />
      </div>
    )
  }

  if (notFound || !section) {
    return (
      <div className="mob-page">
        <MobTopBar title="审核详情" back onBack={() => router.push(listPath)} />
        <MobEmpty
          icon={<ShieldAlert size={28} />}
          title="审核项不存在"
          desc="或无权访问"
          actionText="返回列表"
          onAction={() => router.push(listPath)}
        />
      </div>
    )
  }

  let parsedData: ParsedSectionData = {}
  try {
    parsedData = (section.data ? JSON.parse(section.data) : {}) as ParsedSectionData
  } catch {
    /* ignore */
  }
  let evidence: string[] = []
  try {
    evidence = JSON.parse(section.evidence || "[]") as string[]
  } catch {
    /* ignore */
  }

  const st = STATUS_META[section.status] || { label: section.status, tone: "neutral" as Tone }
  const sectionLabel = sectionLabelOf(section.section)
  const userName = section.user?.name || "—"
  const studentId = section.user?.studentId || "—"

  // S 板块：重算加权绩点与 S 得分
  const validScores = courseScores.filter(s => s.course)
  const gpa = calcWeightedGPA(
    validScores.map(s => ({ id: s.course.id, name: s.course.name, credits: s.course.credits, semester: s.course.semester, isElective: s.course.isElective })),
    validScores.map(s => ({ courseId: s.courseId, score: s.score, grade: s.grade, gpa: s.gpa })),
  )
  const sScore = calcSScore(gpa)

  // D 板块：合并手动确认加分后的实时得分
  const dItems: DItem[] = parsedData.items ?? []
  const dPreviewScore =
    section.section === "D" && dItems.length > 0
      ? calcDScore(
          dItems.map((it, i) => {
            if (it.type === "award" && it.rank === 5) {
              const v = manualScores[i]
              const manual = v !== undefined && v !== "" ? Number(v) : (it.score ?? 0)
              return { ...it, score: Number.isFinite(manual) ? manual : 0 }
            }
            return it
          }),
        )
      : null
  const showScore = dPreviewScore != null ? dPreviewScore : section.score

  // 同板块前后学生
  const currentIdx = siblings.findIndex(s => s.sectionId === reviewId)
  const prevSib = currentIdx > 0 ? siblings[currentIdx - 1] : null
  const nextSib = currentIdx >= 0 && currentIdx < siblings.length - 1 ? siblings[currentIdx + 1] : null
  const goSibling = (s: Sibling) => router.push(`/m/zongce/review/${sectionKey}/${s.sectionId}`)

  const f1Items = parsedData.f1 ?? []
  const f2Items = parsedData.f2 ?? []
  const f3Items = parsedData.f3 ?? []
  const f4Items = parsedData.f4 ?? []
  const f5Items = parsedData.f5 ?? []

  return (
    <div className="mob-page" style={{ paddingBottom: 24 }}>
      <MobTopBar title="审核详情" back onBack={() => router.push(listPath)} />

      {/* 学生信息卡 */}
      <MobCard>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MobAvatar name={userName} size="md" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>{userName}</span>
              <MobChip tone={st.tone}>{st.label}</MobChip>
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 3 }}>
              {studentId} · 提交于 {fmtTime(section.submittedAt)}
            </div>
          </div>
        </div>
      </MobCard>

      {/* 板块信息卡 */}
      <MobCard>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MobChip tone={section.section === "S" ? "s" : section.section === "D" ? "m" : section.section === "E" ? "t" : "info"}>
            {section.section}
          </MobChip>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", flex: 1 }}>{sectionLabel}</span>
          <span style={{ fontSize: 13, color: "var(--fg-2)", fontFamily: "var(--font-num)" }}>
            得分 {showScore != null ? showScore.toFixed(2) : "—"}
          </span>
        </div>
      </MobCard>

      {/* 提交内容卡 */}
      <MobCard>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--fg-3)", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
          提交内容
        </div>

        {/* S 板块：成绩明细（按学期分组） */}
        {section.section === "S" && (
          <>
            {courseScores.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--fg-3)", padding: "10px 0" }}>该学生尚未录入课程成绩</div>
            ) : (
              <>
                {[1, 2].map(sem => {
                  const list = courseScores
                    .filter(s => s.course?.semester === sem)
                    .sort((a, b) => (a.course?.sortOrder || 0) - (b.course?.sortOrder || 0))
                  if (list.length === 0) return null
                  return (
                    <div key={sem} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--fg-3)", margin: "6px 0 4px" }}>
                        第{sem === 1 ? "一" : "二"}学期 · {list.length} 门
                      </div>
                      {list.map(s => {
                        const failed = (s.score != null && s.score < 60) || s.grade === "不及格"
                        const showGpa = s.gpa != null ? s.gpa : s.score != null && s.score > 0 ? scoreToGPA(s.score) : null
                        return (
                          <div
                            key={s.id}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)" }}
                          >
                            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--fg)", lineHeight: 1.45 }}>
                              {s.course?.name || s.courseId}
                              {failed && <span style={{ fontSize: 10, color: "var(--danger)", marginLeft: 6 }}>挂科</span>}
                              {s.repeat === true && <span style={{ fontSize: 10, color: "var(--warn)", marginLeft: 6 }}>重修</span>}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--fg-3)", flex: "none", fontFamily: "var(--font-num)" }}>{s.course?.credits ?? "—"} 学分</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", flex: "none", fontFamily: "var(--font-num)" }}>
                              {showGpa != null ? `GPA ${showGpa.toFixed(2)}` : "—"}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: failed ? "var(--danger)" : "var(--primary)", flex: "none", fontFamily: "var(--font-num)" }}>
                              {s.score != null ? s.score : s.grade || "—"}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 12, color: "var(--fg-2)" }}>
                  <span>加权绩点 <b style={{ fontFamily: "var(--font-num)", color: "var(--primary)" }}>{gpa > 0 ? gpa.toFixed(2) : "—"}</b></span>
                  <span>重算 S <b style={{ fontFamily: "var(--font-num)", color: "var(--primary)" }}>{gpa > 0 ? sScore.toFixed(2) : "—"}</b></span>
                  {section.score != null && section.score > 0 && (
                    <span>
                      提交 S <b style={{ fontFamily: "var(--font-num)", color: Math.abs(sScore - section.score) > 0.01 ? "var(--danger)" : "var(--fg-3)" }}>{section.score.toFixed(2)}</b>
                      {Math.abs(sScore - section.score) > 0.01 && " · 成绩已变动"}
                    </span>
                  )}
                </div>
                {(parsedData.sem1Gpa != null || parsedData.sem2Gpa != null || parsedData.yearGpa != null || parsedData.totalScore != null) && (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 8, fontSize: 12, color: "var(--ok)" }}>
                    <span style={{ fontWeight: 600 }}>手填汇总</span>
                    {parsedData.sem1Gpa != null && <span>GPA₁ <b style={{ fontFamily: "var(--font-num)" }}>{Number(parsedData.sem1Gpa).toFixed(2)}</b></span>}
                    {parsedData.sem2Gpa != null && <span>GPA₂ <b style={{ fontFamily: "var(--font-num)" }}>{Number(parsedData.sem2Gpa).toFixed(2)}</b></span>}
                    {parsedData.yearGpa != null && <span>学年 GPA <b style={{ fontFamily: "var(--font-num)" }}>{Number(parsedData.yearGpa).toFixed(2)}</b></span>}
                    {parsedData.totalScore != null && <span>S <b style={{ fontFamily: "var(--font-num)" }}>{Number(parsedData.totalScore).toFixed(2)}</b></span>}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* A 板块：旷课/迟到/请假 + 公式 */}
        {section.section === "A" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: "6px 0 10px" }}>
              {[
                { k: "旷课", v: parsedData.absences || 0 },
                { k: "迟到", v: parsedData.tardies || 0 },
                { k: "请假", v: parsedData.specialLeaves || 0 },
              ].map(it => (
                <div key={it.k} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-num)" }}>{it.v}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 3 }}>{it.k}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-2)", background: "var(--primary-soft)", borderRadius: 8, padding: "10px 12px", lineHeight: 1.7, fontFamily: "var(--font-num)" }}>
              A = 5 - {parsedData.absences || 0}×1 - {parsedData.tardies || 0}×0.25 = {Math.max(0, 5 - (parsedData.absences || 0) * 1 - (parsedData.tardies || 0) * 0.25).toFixed(2)}
              （特殊情况请假不扣分）
            </div>
          </>
        )}

        {/* D 板块：活动项目明细 */}
        {section.section === "D" &&
          (dItems.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--fg-3)", padding: "10px 0" }}>该学生尚未填写文体活动记录</div>
          ) : (
            <>
              {dItems.map((it, i) => {
                const typeLabel = D_TYPE_LABELS[it.type] || it.type
                const awardTxt =
                  it.type === "award"
                    ? it.rank === 5
                      ? `其他·${it.rankNote || "未注明"}`
                      : `${D_LEVEL_LABELS[it.level || ""] || it.level || ""}·${D_RANK_LABELS[it.rank ?? 0] || `第${it.rank}名`}`
                    : "—"
                const table = D_RANK_TABLE[it.level || "school"] || D_RANK_TABLE.school
                const autoScore = it.type === "award" ? (it.rank === 5 ? 0 : table[Math.min(Math.max(it.rank ?? 4, 1), 4) - 1] || 0) : D_TYPE_SCORES[it.type] || 0
                return (
                  <div key={i} style={{ padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--fg)", lineHeight: 1.45 }}>
                        {typeLabel} · {it.name || "—"}
                        <span style={{ display: "block", fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>
                          {it.date || "—"}
                          {awardTxt !== "—" ? ` · ${awardTxt}` : ""}
                        </span>
                      </span>
                      {it.rank === 5 ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          inputMode="decimal"
                          placeholder="0"
                          value={manualScores[i] ?? (it.score != null && it.score > 0 ? String(it.score) : "")}
                          onChange={e => setManualScores(m => ({ ...m, [i]: e.target.value }))}
                          title="审核员确认加分（0-5）"
                          style={{
                            width: 64, height: 34, border: "1px solid var(--border-strong)", borderRadius: 8,
                            textAlign: "center", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-num)",
                            outline: "none", color: "var(--primary)", background: "var(--surface-2)", flex: "none",
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 700, color: autoScore > 0 ? "var(--primary)" : "var(--fg-3)", flex: "none", fontFamily: "var(--font-num)" }}>
                          +{autoScore.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {Array.isArray(it.photos) && it.photos.length > 0 && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        {it.photos.slice(0, 5).map((url, pi) => (
                          <button
                            key={pi}
                            type="button"
                            onClick={() => openViewer(it.photos || [], pi)}
                            style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", padding: 0, background: "var(--surface-2)" }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="证明" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          </button>
                        ))}
                        {it.photos.length > 5 && (
                          <span style={{ fontSize: 11, color: "var(--fg-3)", alignSelf: "center" }}>+{it.photos.length - 5}</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {dPreviewScore != null && (
                <div style={{ fontSize: 11, color: "var(--warn)", marginTop: 10, fontFamily: "var(--font-num)" }}>
                  实时合计 {dPreviewScore.toFixed(2)}（含手动确认加分）
                </div>
              )}
            </>
          ))}

        {/* E 板块：社会实践信息 */}
        {section.section === "E" && (
          <>
            {[
              { label: "担任分队队长/召集人", v: parsedData.isCaptain ? "+0.5" : "否", on: !!parsedData.isCaptain },
              {
                label: "分队获奖",
                v: parsedData.teamAward === "member" ? "优秀分队成员 (+1)" : parsedData.teamAward === "captain" ? "优秀分队队长/召集人 (+1.5)" : "无",
                on: parsedData.teamAward !== "none" && !!parsedData.teamAward,
              },
              { label: "校级社会实践积极分子", v: parsedData.schoolLevelAward ? "+2" : "否", on: !!parsedData.schoolLevelAward },
              { label: "市级以上优秀志愿者", v: parsedData.cityVolunteer ? "+1" : "否", on: !!parsedData.cityVolunteer },
              {
                label: "志愿时长",
                v: parsedData.volunteerHours ? `${parsedData.volunteerHours} 小时（+${Math.min(3, parsedData.volunteerHours * 0.1).toFixed(2)}）` : "未填写",
                on: (parsedData.volunteerHours || 0) > 0,
              },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--fg-2)" }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: r.on ? "var(--ok)" : "var(--fg-3)", flex: "none", textAlign: "right", fontFamily: "var(--font-num)" }}>
                  {r.v}
                </span>
              </div>
            ))}
          </>
        )}

        {/* F 板块：五组明细 */}
        {section.section === "F" && (
          <>
            <FGroupBlock
              title="F1 学生工作"
              items={f1Items}
              score={f1Score}
              photos={it => it.photos || []}
              desc={it => {
                const p = POSITION_PRESETS.find(x => x.type === it.position)
                return p
                  ? `${p.label}（${p.category}）· ${it.duration === "sem" ? "一学期" : "一学年"} · 考评${it.evaluation === "excellent" ? "优秀" : it.evaluation === "fail" ? "不合格" : "合格"}${it.evaluation === "excellent" ? "（+0.5）" : it.evaluation === "fail" ? "（-0.5）" : ""}`
                  : `${it.position || "未选职位"} · ${it.duration === "sem" ? "一学期" : "一学年"} · 考评${it.evaluation || "合格"}`
              }}
              onView={openViewer}
            />
            <FGroupBlock
              title="F2 竞赛获奖"
              items={f2Items}
              score={f2Score}
              photos={it => it.photos || []}
              desc={it => {
                const base = (F2_RANK_SCORES[it.category || ""] || [0, 0, 0])[Math.min(Math.max(it.rank ?? 1, 1), 3) - 1] || 0
                const rankTxt = it.rank === 0 ? "特等奖" : it.rank === 1 ? "一等奖" : it.rank === 2 ? "二等奖" : "三等奖"
                const teamTxt = it.isTeam
                  ? `团队 ${it.teamSize || 1} 人${it.position ? `，排第 ${it.position} 位` : ""}（等级分 ${base.toFixed(1)} × 系数 ${f2Score(it) > 0 ? (f2Score(it) / base).toFixed(2) : "—"}）`
                  : "个人"
                return `${it.name || "未填名称"} · ${COMPETITION_LEVELS[it.category || ""]?.label || it.category + "类"} · ${rankTxt} · ${teamTxt}`
              }}
              onView={openViewer}
            />
            <FGroupBlock
              title="F3 荣誉称号"
              items={f3Items}
              score={it => F3_HONOR_SCORES[it.level || ""] || 0}
              photos={it => it.photos || []}
              desc={it => {
                const L: Record<string, string> = { national: "国家级", province: "省级", city: "市级", school: "校级" }
                return `${L[it.level || ""] || it.level || "未填级别"} · ${it.name || "未填名称"}`
              }}
              onView={openViewer}
            />
            <FGroupBlock
              title="F4 科研奖励"
              items={f4Items}
              score={f4Score}
              photos={it => it.photos || []}
              desc={it => {
                const extra = it.type === "journal" || it.type === "essay" ? ` · ${f4Detail(it)}` : ""
                return `${F4_TYPE[it.type || ""] || it.type || "未填类型"}${extra}${it.detail && it.type !== "journal" && it.type !== "essay" ? ` · ${it.detail}` : ""}`
              }}
              onView={openViewer}
            />
            <FGroupBlock
              title="F5 惩罚扣分"
              items={f5Items}
              score={it => -(F5_PENALTY_SCORES[it.type || ""] || 0) * (it.count || 1)}
              photos={() => []}
              desc={it => `${it.type || "未填"} × ${it.count || 1} 次`}
              danger
              onView={openViewer}
            />
          </>
        )}

        {/* 其他板块（B/C）：得分 */}
        {section.section !== "A" && section.section !== "S" && section.section !== "D" && section.section !== "E" && section.section !== "F" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
            <span style={{ fontSize: 13, color: "var(--fg-2)" }}>本板块得分</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-num)" }}>{parsedData.score || 0}</span>
          </div>
        )}

        {/* 佐证照片 */}
        <div style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--fg-3)", fontWeight: 700, textTransform: "uppercase", margin: "12px 0 8px" }}>
          佐证照片
        </div>
        {evidence.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--fg-3)", padding: "4px 0" }}>无佐证材料</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {evidence.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => openViewer(evidence, i)}
                style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 6, background: "var(--surface)", textAlign: "left" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`佐证 ${i + 1}`} loading="lazy" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 6, display: "block", background: "var(--surface-2)" }} />
                <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {url.split("/").pop() || `佐证 ${i + 1}`}
                </div>
              </button>
            ))}
          </div>
        )}
      </MobCard>

      {/* 审核操作卡 */}
      <MobCard>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--fg-3)", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
          审核操作
        </div>

        {section.status === "submitted" && (
          <>
            <MobField
              label="审核意见"
              hint="退回时必填"
              type="textarea"
              placeholder="填写审核意见，或说明退回理由…"
              value={reviewNote}
              onChange={v => {
                setReviewNote(v)
                setNoteError("")
              }}
              error={noteError || undefined}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <MobButton variant="danger" block disabled={submitting} onClick={() => handleReview(false)}>
                退回
              </MobButton>
              <MobButton block disabled={submitting} loading={submitting} onClick={() => handleReview(true)}>
                通过
              </MobButton>
            </div>
          </>
        )}

        {section.status === "approved" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ok)" }}>
              已审核通过{section.reviewedAt ? ` · ${fmtTime(section.reviewedAt)}` : ""}
            </span>
            <MobButton size="sm" variant="ghost" disabled={submitting} onClick={() => handleAction("unapprove", "已撤销通过")}>
              {submitting ? "处理中" : "撤销通过"}
            </MobButton>
          </div>
        )}

        {section.status === "returned" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--danger)" }}>
              已驳回
              {section.reviewNote && <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 6 }}>理由：{section.reviewNote}</span>}
            </span>
            <MobButton size="sm" variant="ghost" disabled={submitting} onClick={() => handleAction("reopen", "已撤销驳回")}>
              撤销驳回
            </MobButton>
          </div>
        )}

        {section.status === "draft" && (
          <div style={{ fontSize: 13, color: "var(--warn)" }}>学生已撤回或重新编辑，等待重新提交审核</div>
        )}

        {section.status === "not_started" && <div style={{ fontSize: 13, color: "var(--fg-3)" }}>该学生尚未提交</div>}
      </MobCard>

      {/* 图片查看器 */}
      {viewerOpen && (
        <MobImageViewer images={viewerImages} index={viewerIndex} onClose={() => setViewerOpen(false)} onIndexChange={setViewerIndex} />
      )}

      {/* 上/下一位学生（悬浮，避开底部 TabBar） */}
      {prevSib && (
        <button
          type="button"
          onClick={() => goSibling(prevSib)}
          title={`上一个：${prevSib.name}（${prevSib.studentId}）`}
          aria-label="上一位学生"
          style={{
            position: "fixed", bottom: "calc(76px + env(safe-area-inset-bottom))", left: 16, zIndex: 45,
            width: 44, height: 44, borderRadius: "50%", border: "1px solid var(--border-strong)",
            background: "var(--surface)", color: "var(--primary)", boxShadow: "var(--shadow-card)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {nextSib && (
        <button
          type="button"
          onClick={() => goSibling(nextSib)}
          title={`下一个：${nextSib.name}（${nextSib.studentId}）`}
          aria-label="下一位学生"
          style={{
            position: "fixed", bottom: "calc(76px + env(safe-area-inset-bottom))", right: 16, zIndex: 45,
            width: 44, height: 44, borderRadius: "50%", border: "1px solid var(--border-strong)",
            background: "var(--surface)", color: "var(--primary)", boxShadow: "var(--shadow-card)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  )
}
