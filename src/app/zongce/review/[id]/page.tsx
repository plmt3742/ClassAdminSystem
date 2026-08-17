"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, X, Image, BookOpen, ShieldAlert, Undo2, Music, Heart, Award } from "lucide-react"
import { calcWeightedGPA, calcSScore, calcDScore } from "@/lib/zongce-utils"
import { POSITION_PRESETS, COMPETITION_LEVELS, F2_RANK_SCORES, F3_HONOR_SCORES, F5_PENALTY_SCORES, F2_TEAM_COEF, F2_TEAM_COEF_6 } from "@/lib/zongce-utils"
import ImageViewer, { type ViewerImage } from "@/components/ImageViewer"

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
const D_RANK_SCORES: Record<string, Record<number, number>> = {
  college: { 1: 1.5, 2: 1, 3: 0.5, 4: 0 },
  school: { 1: 2, 2: 1.5, 3: 1, 4: 0.5 },
  province: { 1: 2.5, 2: 2, 3: 1.5, 4: 1 },
  national: { 1: 3, 2: 2.5, 3: 2, 4: 1.5 },
}

const SECTION_LABELS: Record<string, string> = {
  "S": "学习成绩", "A": "学风考勤", "B": "集会政治学习",
  "C": "星级宿舍", "D": "文体活动", "E": "社会实践/公益", "F": "奖惩附加",
}

interface CourseScoreItem {
  id: string; courseId: string; userId: string
  score: number | null; grade: string | null; gpa: number | null
  course: { id: string; name: string; credits: number; semester: number; isElective: boolean; sortOrder: number }
}

export default function ReviewPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const reviewId = params.id as string

  // 返回上一级: 从各板块审核仪表盘进入则返回对应仪表盘，否则回综测看板
  const from = searchParams.get("from")
  const backPath = from === "a" ? "/zongce/review-a" : from === "s" ? "/zongce/review-s" : from === "d" ? "/zongce/review-d" : from === "e" ? "/zongce/review-e" : from === "f" ? "/zongce/review-f" : "/zongce"
  const backLabel = from === "a" ? "返回 A 审核" : from === "s" ? "返回 S 审核" : from === "d" ? "返回 D 审核" : from === "e" ? "返回 E 审核" : from === "f" ? "返回 F 审核" : "返回综测"

  const [section, setSection] = useState<any>(null)
  const [courseScores, setCourseScores] = useState<CourseScoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [reviewNote, setReviewNote] = useState("")
  const [noteError, setNoteError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  // D 板块："其他"名次项目的审核员手动确认加分（key = 项目下标）
  const [manualScores, setManualScores] = useState<Record<number, string>>({})
  // 图片查看器
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImages, setViewerImages] = useState<ViewerImage[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)
  const openViewer = (urls: string[], idx = 0) => {
    setViewerImages(urls.map(u => ({ url: u, label: u.split("/").pop() || "佐证图片" })))
    setViewerIndex(idx)
    setViewerOpen(true)
  }
  // 同板块学生列表（学号排序）——翻页与学生面板
  const [siblings, setSiblings] = useState<{ sectionId: string; name: string; studentId: string; status: string }[]>([])
  // 移动端检测（≤760px 隐藏左侧面板、翻页按钮下移到拇指区）
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)")
    setIsMobile(mq.matches)
    const fn = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", fn)
    return () => mq.removeEventListener("change", fn)
  }, [])

  useEffect(() => {
    fetch(`/api/zongce/review/${reviewId}`)
      .then(async res => {
        if (res.status === 403) { setDenied(true); setLoading(false); return }
        if (!res.ok) { setLoading(false); return }
        const d = await res.json()
        setSection(d.section)
        setCourseScores(d.courseScores || [])
        setSiblings(d.siblings || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [reviewId])

  const handleReview = async (approved: boolean) => {
    if (!approved && !reviewNote.trim()) { setNoteError("退回必须填写理由"); return }
    setNoteError("")
    setSubmitting(true)
    // D 板块手动确认加分：只提交填写了有效值的项
    let manual: Record<number, number> | undefined
    if (approved) {
      const entries = Object.entries(manualScores)
        .map(([k, v]) => [Number(k), Number(v)] as const)
        .filter(([, v]) => Number.isFinite(v) && v > 0)
      if (entries.length > 0) manual = Object.fromEntries(entries)
    }
    const res = await fetch(`/api/zongce/review/${reviewId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved, reviewNote: approved ? null : reviewNote, ...(manual ? { manualScores: manual } : {}) }),
    })
    setSubmitting(false)
    if (res.ok) router.push(backPath)
    else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || "操作失败")
    }
  }

  // 撤销驳回: returned → submitted（重新进入待审核队列）
  const handleReopen = async () => {
    if (!confirm("撤销驳回，将该板块重新置为待审核？")) return
    setSubmitting(true)
    const res = await fetch(`/api/zongce/review/${reviewId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reopen" }),
    })
    setSubmitting(false)
    if (res.ok) router.push(backPath)
  }

  // 撤销通过: approved → submitted（误点通过可撤回）
  const handleUnapprove = async () => {
    if (!confirm("撤销通过？该板块将重新进入待审核队列，需重新审核。")) return
    setSubmitting(true)
    const res = await fetch(`/api/zongce/review/${reviewId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unapprove" }),
    })
    setSubmitting(false)
    if (res.ok) router.push(backPath)
  }

  if (loading) return <p className="empty-state">加载中...</p>
  if (!session) return null
  if (denied) {
    return (
      <main className="m-main" style={{ width: "min(480px, calc(100vw - 56px))", margin: "0 auto", padding: "80px 0", textAlign: "center" }}>
        <div className="card" style={{ padding: "60px 40px", background: "#fff" }}>
          <ShieldAlert size={32} style={{ color: "#A8B4BD", marginBottom: 12 }} />
          <h2 style={{ marginBottom: 8 }}>无权审核</h2>
          <p style={{ color: "#7A8A94", fontSize: ".88rem" }}>该板块不属于您的审核范围</p>
          <button className="btn-ghost" onClick={() => router.push(backPath)} style={{ marginTop: 12 }}>
            <ArrowLeft size={14} /> {backLabel}
          </button>
        </div>
      </main>
    )
  }
  const tags: string[] = (session.user as any)?.tags || []
  const isAdmin = session.user?.role === "admin"
  const isCommittee = tags.some((t: string) => ["班长","副班长","团支书","副团支书","心理委员","学习委员","生活委员","文体委员","志愿队长","组织委员","宣传委员"].includes(t))
  if (!isAdmin && !isCommittee) {
    return <main style={{ maxWidth: 480, margin: "0 auto", padding: "80px 0", textAlign: "center" }}><div className="card" style={{ padding: "60px 40px", background: "#fff" }}><p style={{ color: "#7A8A94" }}>仅管理员和班委可审核</p></div></main>
  }
  if (!section) return <p className="empty-state">审核项不存在或无权访问</p>

  const sectionLabel = SECTION_LABELS[section.section] || section.section
  let parsedData: any = {}
  try { parsedData = JSON.parse(section.data || "{}") } catch {}

  let evidence: string[] = []
  try { evidence = JSON.parse(section.evidence || "[]") } catch {}

  // ===== F 板块分项加分计算（与评分引擎一致，供审核核对） =====
  const f1Score = (it: any): number => {
    const preset = POSITION_PRESETS.find(p => p.type === it.position)
    if (!preset) return 0
    let s = it.duration === "sem" ? preset.semScore : preset.yearScore
    if (it.evaluation === "excellent") s += 0.5
    else if (it.evaluation === "fail") s -= 0.5
    return Math.round(Math.max(0, s) * 100) / 100
  }
  const f2Score = (it: any): number => {
    const base = (F2_RANK_SCORES[it.category] || [0, 0, 0])[Math.min(Math.max(it.rank, 1), 3) - 1] || 0
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
  const f4Score = (it: any): number => {
    switch (it.type) {
      case "newspaper": return 0.5
      case "journal": return it.rank === 1 ? 2 : it.rank === 2 ? 0.8 : Math.max(0.2, 0.8 - ((it.rank || 3) - 2) * 0.2)
      case "essay": return ({ 1: 1, 2: 0.8, 3: 0.5, 4: 0.25 } as Record<number, number>)[it.rank || 4] ?? 0
      case "research": return it.level === "province" ? 2.5 : 2
      case "patent": return 2
      default: return 0
    }
  }

  // S 板块: 用与后端一致的 calcWeightedGPA 重算，供审核人核对
  const validScores = courseScores.filter(s => s.course)
  const gpa = calcWeightedGPA(
    validScores.map(s => ({ id: s.course.id, name: s.course.name, credits: s.course.credits, semester: s.course.semester, isElective: s.course.isElective })),
    validScores.map(s => ({ courseId: s.courseId, score: s.score, grade: s.grade, gpa: s.gpa }))
  )
  const sScore = calcSScore(gpa)

  // D 板块实时得分预览：合并审核员手动确认的加分后重算
  const dPreviewScore = section.section === "D" && Array.isArray(parsedData.items)
    ? calcDScore(parsedData.items.map((it: any, i: number) => {
        if (it.type === "award" && it.rank === 5) {
          const v = manualScores[i]
          const manual = v !== undefined && v !== "" ? Number(v) : (it.score ?? 0)
          return { ...it, score: Number.isFinite(manual) ? manual : 0 }
        }
        return it
      }))
    : null
  const showScore = dPreviewScore != null ? dPreviewScore : section.score

  // ===== 移动版（设计稿 review-detail.html · 真实数据 + 真实操作，≤640px 显示） =====
  const year = "2025-2026"
  const fmtTime = (t?: string | null) => {
    if (!t) return "—"
    const d = new Date(t)
    const p = (n: number) => String(n).padStart(2, "0")
    return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  }
  const rdCard: CSSProperties = { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "14px 16px" }
  const rdHead: CSSProperties = { display: "flex", alignItems: "center", gap: 10, paddingBottom: 10, borderBottom: "1px solid var(--color-border)", marginBottom: 10 }
  const rdHeadTxt: CSSProperties = { fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0 }
  const rdHeadMono: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".14em", color: "var(--color-muted)", textTransform: "uppercase", flex: "none" }
  const statusChip = section.status === "submitted" ? "pending" : section.status === "approved" ? "ok" : "none"
  const statusTxt = section.status === "submitted" ? "待审核" : section.status === "approved" ? "已通过" : section.status === "returned" ? "已退回" : section.status === "draft" ? "草稿" : "未提交"

  const mobileView = (
    <div className="m-page-root">
      <header className="m-topbar">
        <Link className="m-back" href={backPath} aria-label={backLabel}><ArrowLeft size={18} /></Link>
        <span className="m-title">审核详情<small>REVIEW</small></span>
        <span className="m-year">{year}</span>
      </header>

      <div style={{ padding: "14px 16px 0" }}>
        {/* 学生信息卡 */}
        <div style={{ ...rdCard, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <span className="m-avatar" style={{ width: 40, height: 40, fontSize: 18 }}>{section.user?.name?.[0] || "?"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700 }}>
                {section.user?.name || "—"}<span className="chip none"><span className="lamp" />提交人</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--color-muted)", letterSpacing: ".03em", marginTop: 4 }}>
                {section.user?.studentId || "—"} · 提交于 <b style={{ color: "var(--color-accent-hover)", fontWeight: 600 }}>{fmtTime(section.submittedAt)}</b>
              </div>
            </div>
          </div>
        </div>

        {/* 板块信息卡 */}
        <div style={{ ...rdCard, marginBottom: 12 }}>
          <div style={rdHead}>
            <span style={{ width: 26, height: 26, borderRadius: 6, flex: "none", background: "var(--color-accent-subtle)", color: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700 }}>{section.section}</span>
            <span style={rdHeadTxt}>{sectionLabel}</span>
            <span className={`chip ${statusChip}`}><span className="lamp" />{statusTxt}</span>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--color-muted)", letterSpacing: ".02em" }}>
            {statusTxt} · 得分 {showScore?.toFixed(2) ?? "—"}
          </div>
        </div>

        {/* 提交内容卡 */}
        <div style={{ ...rdCard, marginBottom: 12 }}>
          <div style={rdHead}>
            <span style={rdHeadMono}>SUBMISSION</span>
            <span style={rdHeadTxt}>提交内容</span>
          </div>

          {/* S 板块：成绩明细（按学期分组） */}
          {section.section === "S" && (
            <>
              {courseScores.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--color-muted)", padding: "10px 0" }}>该学生尚未录入课程成绩</div>
              ) : (
                <>
                  {[1, 2].map(sem => {
                    const list = courseScores
                      .filter(s => s.course?.semester === sem)
                      .sort((a, b) => (a.course?.sortOrder || 0) - (b.course?.sortOrder || 0))
                    if (list.length === 0) return null
                    return (
                      <div key={sem}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".14em", color: "var(--color-muted)", textTransform: "uppercase", margin: "10px 0 2px" }}>第{sem === 1 ? "一" : "二"}学期 · {list.length} 门</div>
                        {list.map(s => {
                          const failed = (s.score != null && s.score < 60) || s.grade === "不及格"
                          const showGpa = s.gpa != null ? s.gpa
                            : s.score != null && s.score > 0 ? Math.round((4 + (s.score - 90) * 0.1 >= 0 ? Math.min(5, s.score >= 90 ? 4 + (s.score - 90) * 0.1 : 3 + (s.score - 80) * 0.1) : 0) * 100) / 100
                            : null
                          return (
                            <div key={s.id} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--color-border)" }}>
                              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--color-fg)", lineHeight: 1.45 }}>
                                {s.course?.name || s.courseId}
                                {failed && <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, color: "#C4615A", marginLeft: 6 }}>挂科</span>}
                                {(s as any).repeat === true && <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, color: "#C7924B", marginLeft: 6 }}>重修</span>}
                              </span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)", flex: "none" }}>{s.course?.credits ?? "—"} 学分</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--color-accent-hover)", flex: "none" }}>GPA {showGpa != null ? showGpa.toFixed(2) : "—"}</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: failed ? "#C4615A" : "var(--color-accent-hover)", flex: "none" }}>{s.score != null ? s.score : (s.grade || "—")}</span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 11, color: "var(--color-muted)" }}>
                    <span>加权绩点 <b style={{ fontFamily: "var(--font-mono)", color: "var(--color-accent-hover)" }}>{gpa > 0 ? gpa.toFixed(2) : "—"}</b></span>
                    <span>重算 S <b style={{ fontFamily: "var(--font-mono)", color: "var(--color-accent-hover)" }}>{gpa > 0 ? sScore.toFixed(2) : "—"}</b></span>
                    {section.score != null && section.score > 0 && (
                      <span>提交 S <b style={{ fontFamily: "var(--font-mono)", color: Math.abs(sScore - section.score) > 0.01 ? "#C4615A" : "var(--color-muted)" }}>{section.score.toFixed(2)}</b>{Math.abs(sScore - section.score) > 0.01 && " · 成绩已变动"}</span>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* A 板块：旷课/迟到/请假 + 公式 */}
          {section.section === "A" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: "10px 0" }}>
                {[{ k: "旷课", v: parsedData.absences || 0 }, { k: "迟到", v: parsedData.tardies || 0 }, { k: "请假", v: parsedData.specialLeaves || 0 }].map(it => (
                  <div key={it.k} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 700, color: "var(--color-accent-hover)" }}>{it.v}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted)", marginTop: 2 }}>{it.k}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)", background: "rgba(59,107,138,.05)", borderRadius: 6, padding: "8px 12px", lineHeight: 1.6 }}>
                A = 5 - {parsedData.absences || 0}×1 - {parsedData.tardies || 0}×0.25 = {Math.max(0, 5 - (parsedData.absences || 0) * 1 - (parsedData.tardies || 0) * 0.25).toFixed(2)}
                （特殊情况请假不扣分）
              </div>
            </>
          )}

          {/* D 板块：活动项目明细（名次 5 可手动确认加分） */}
          {section.section === "D" && (
            !Array.isArray(parsedData.items) || parsedData.items.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--color-muted)", padding: "10px 0" }}>该学生尚未填写文体活动记录</div>
            ) : (
              <>
                {parsedData.items.map((it: any, i: number) => {
                  const typeLabel = D_TYPE_LABELS[it.type] || it.type
                  const awardTxt = it.type === "award"
                    ? (it.rank === 5 ? `其他·${it.rankNote || "未注明"}` : `${D_LEVEL_LABELS[it.level] || it.level}·${D_RANK_LABELS[it.rank] || "第" + it.rank + "名"}`)
                    : "—"
                  const score = it.type === "award"
                    ? (it.rank === 5 ? 0 : (D_RANK_SCORES[it.level]?.[it.rank] ?? 0))
                    : (D_TYPE_SCORES[it.type] ?? 0)
                  return (
                    <div key={i} style={{ padding: "9px 0", borderBottom: "1px solid var(--color-border)" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--color-fg)", lineHeight: 1.45 }}>
                          {typeLabel} · {it.name || "—"}
                          <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 8.5, color: "var(--color-muted-light)", letterSpacing: ".02em" }}>{it.date || "—"}{awardTxt !== "—" ? ` · ${awardTxt}` : ""}</span>
                        </span>
                        {it.rank === 5 ? (
                          <input type="number" step="0.1" min="0" max="5" placeholder="0"
                            value={manualScores[i] ?? (it.score != null && it.score > 0 ? String(it.score) : "")}
                            onChange={e => setManualScores(m => ({ ...m, [i]: e.target.value }))}
                            title="审核员确认加分（0-5）"
                            style={{ width: 64, height: 34, border: "1.5px solid var(--color-border-strong)", borderRadius: 6, textAlign: "center", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", outline: "none", color: "var(--color-accent-hover)", flex: "none" }} />
                        ) : (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: score > 0 ? "var(--color-accent-hover)" : "var(--color-muted)", flex: "none" }}>+{score.toFixed(2)}</span>
                        )}
                      </div>
                      {/* 佐证照片（移动版） */}
                      {Array.isArray(it.photos) && it.photos.length > 0 && (
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          {it.photos.slice(0, 5).map((url: string, pi: number) => (
                            <span key={pi} onClick={() => openViewer(it.photos, pi)} title="查看证明"
                              style={{ width: 44, height: 44, borderRadius: 6, overflow: "hidden", border: "1px solid var(--color-border)", display: "block", background: "#F5F2ED", cursor: "zoom-in" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="证明" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </span>
                          ))}
                          {it.photos.length > 5 && <span style={{ fontSize: 10, color: "var(--color-muted-light)", alignSelf: "center" }}>+{it.photos.length - 5}</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
                {dPreviewScore != null && (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#C7924B", marginTop: 8 }}>实时合计 {dPreviewScore.toFixed(2)}（含手动确认加分）</div>
                )}
              </>
            )
          )}

          {/* E 板块：社会实践信息 */}
          {section.section === "E" && (
            [
              { label: "担任分队队长/召集人", v: parsedData.isCaptain ? "+0.5" : "否", on: !!parsedData.isCaptain },
              { label: "分队获奖", v: parsedData.teamAward === "member" ? "优秀分队成员 (+1)" : parsedData.teamAward === "captain" ? "优秀分队队长/召集人 (+1.5)" : "无", on: parsedData.teamAward !== "none" && !!parsedData.teamAward },
              { label: "校级社会实践积极分子", v: parsedData.schoolLevelAward ? "+2" : "否", on: !!parsedData.schoolLevelAward },
              { label: "市级以上优秀志愿者", v: parsedData.cityVolunteer ? "+1" : "否", on: !!parsedData.cityVolunteer },
              { label: "志愿时长", v: parsedData.volunteerHours ? `${parsedData.volunteerHours} 小时（+${Math.min(3, parsedData.volunteerHours * 0.1).toFixed(2)}）` : "未填写", on: (parsedData.volunteerHours || 0) > 0 },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
                <span style={{ fontSize: 13, color: "var(--color-fg-secondary)" }}>{r.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: r.on ? "var(--color-success)" : "var(--color-muted-light)", flex: "none", textAlign: "right" }}>{r.v}</span>
              </div>
            ))
          )}

          {/* F 板块：五组明细（详细展示 + 单项加分） */}
          {section.section === "F" && (() => {
            const F4_TYPE: Record<string, string> = { newspaper: "校报文章", journal: "期刊论文", essay: "征文/课题", research: "课题调研", patent: "专利" }
            const F4_DETAIL = (it: any) => {
              if (it.type === "journal") return it.rank === 1 ? "第一作者" : it.rank === 2 ? "第二作者" : `第${it.rank || 3}作者`
              if (it.type === "essay") return `第${it.rank || 4}作者`
              if (it.type === "research") return it.level === "province" ? "省级课题" : "校级课题"
              return it.detail || ""
            }
            const GROUPS = [
              { title: "F1 学生工作", items: parsedData.f1 || [], score: f1Score, photos: (it: any) => it.photos || [], desc: (it: any) => {
                  const p = POSITION_PRESETS.find(x => x.type === it.position)
                  return p
                    ? `${p.label}（${p.category}）· ${it.duration === "sem" ? "一学期" : "一学年"} · 考评${it.evaluation === "excellent" ? "优秀" : it.evaluation === "fail" ? "不合格" : "合格"}${it.evaluation === "excellent" ? "（+0.5）" : it.evaluation === "fail" ? "（-0.5）" : ""}`
                    : `${it.position || "未选职位"} · ${it.duration === "sem" ? "一学期" : "一学年"} · 考评${it.evaluation || "合格"}`
                } },
              { title: "F2 竞赛获奖", items: parsedData.f2 || [], score: f2Score, photos: (it: any) => it.photos || [], desc: (it: any) => {
                  const base = (F2_RANK_SCORES[it.category] || [0, 0, 0])[Math.min(Math.max(it.rank, 1), 3) - 1] || 0
                  const rankTxt = it.rank === 0 ? "特等奖" : it.rank === 1 ? "一等奖" : it.rank === 2 ? "二等奖" : "三等奖"
                  const teamTxt = it.isTeam
                    ? `团队 ${it.teamSize || 1} 人${it.position ? `，排第 ${it.position} 位` : ""}（等级分 ${base.toFixed(1)} × 系数 ${f2Score(it) > 0 ? (f2Score(it) / base).toFixed(2) : "—"}）`
                    : "个人"
                  return `${it.name || "未填名称"} · ${COMPETITION_LEVELS[it.category]?.label || it.category + "类"} · ${rankTxt} · ${teamTxt}`
                } },
              { title: "F3 荣誉称号", items: parsedData.f3 || [], score: (it: any) => F3_HONOR_SCORES[it.level] || 0, photos: (it: any) => it.photos || [], desc: (it: any) => {
                  const L: Record<string, string> = { national: "国家级", province: "省级", city: "市级", school: "校级" }
                  return `${L[it.level] || it.level || "未填级别"} · ${it.name || "未填名称"}`
                } },
              { title: "F4 科研奖励", items: parsedData.f4 || [], score: f4Score, photos: (it: any) => it.photos || [], desc: (it: any) => {
                  const extra = it.type === "journal" || it.type === "essay" ? ` · ${F4_DETAIL(it)}` : ""
                  return `${F4_TYPE[it.type] || it.type || "未填类型"}${extra}${it.detail && it.type !== "journal" && it.type !== "essay" ? ` · ${it.detail}` : ""}`
                } },
              { title: "F5 惩罚扣分", items: parsedData.f5 || [], score: (it: any) => -(F5_PENALTY_SCORES[it.type] || 0) * (it.count || 1), photos: () => [], desc: (it: any) => `${it.type || "未填"} × ${it.count || 1} 次` },
            ]
            return (
              <div style={{ marginBottom: 16 }}>
                <div className="form-label" style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                  <Award size={14} /> 奖惩附加明细
                </div>
                {GROUPS.map(g => (
                  <div key={g.title}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".14em", color: "var(--color-muted)", textTransform: "uppercase", margin: "10px 0 2px" }}>{g.title}（{g.items.length}）</div>
                    {g.items.length === 0 ? (
                      <div style={{ fontSize: 11, color: "var(--color-muted-light)", padding: "4px 0" }}>无记录</div>
                    ) : g.items.map((it: any, i: number) => {
                      const sc = g.score(it)
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 6, background: "var(--color-bg-alt)", marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "var(--color-fg)", flex: 1, minWidth: 180, lineHeight: 1.5 }}>
                            {g.desc(it)}
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: g.title === "F5 惩罚扣分" ? "var(--color-danger)" : sc > 0 ? "var(--color-accent-hover)" : "var(--color-muted)", flex: "none" }}>
                            {sc > 0 ? `+${sc.toFixed(2)}` : sc < 0 ? sc.toFixed(2) : "0.00"}
                          </span>
                          {g.photos(it).length > 0 && (
                            <div style={{ display: "flex", gap: 4 }}>
                              {g.photos(it).slice(0, 3).map((url: string, pi: number) => (
                                <span key={pi} onClick={() => openViewer(g.photos(it), pi)} title="查看佐证"
                                  style={{ width: 30, height: 30, borderRadius: 4, overflow: "hidden", border: "1px solid var(--color-border)", display: "block", background: "#F5F2ED", cursor: "zoom-in" }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={url} alt="佐证" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </span>
                              ))}
                              {g.photos(it).length > 3 && <span style={{ fontSize: 10, color: "var(--color-muted-light)", alignSelf: "center" }}>+{g.photos(it).length - 3}</span>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )
          })()}

          {/* 其他板块（B/C）：得分 */}
          {section.section !== "A" && section.section !== "S" && section.section !== "D" && section.section !== "E" && section.section !== "F" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
              <span style={{ fontSize: 13, color: "var(--color-fg-secondary)" }}>本板块得分</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "var(--color-accent-hover)" }}>{parsedData.score || 0}</span>
            </div>
          )}

          {/* 佐证照片（真实缩略图，点击查看大图） */}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".14em", color: "var(--color-muted)", textTransform: "uppercase", margin: "12px 0 8px" }}>佐证照片</div>
          {evidence.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--color-muted-light)", padding: "4px 0" }}>无佐证材料</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {evidence.map((url: string, i: number) => (
                <div key={i} onClick={() => openViewer(evidence, i)} title="查看大图" style={{ border: "1px solid var(--color-border)", borderRadius: 6, padding: 6, cursor: "zoom-in", background: "#FDFDFC" }}>
                  <img src={url} alt={`佐证 ${i + 1}`} loading="lazy"
                    style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 4, display: "block", background: "#EDF0F5" }} />
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted)", letterSpacing: ".02em", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url.split("/").pop() || `佐证 ${i + 1}`}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 审核操作卡（真实操作） */}
        <div style={{ ...rdCard, marginBottom: 12 }}>
          <div style={rdHead}>
            <span style={rdHeadMono}>DECISION</span>
            <span style={rdHeadTxt}>审核操作</span>
          </div>
          {section.status === "submitted" && (
            <>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-fg-secondary)", marginBottom: 6 }}>
                审核意见<small style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted)", fontWeight: 400, marginLeft: 6 }}>退回时必填</small>
              </label>
              <textarea
                value={reviewNote}
                onChange={e => { setReviewNote(e.target.value); setNoteError("") }}
                placeholder="填写审核意见，或说明退回理由…"
                style={{ width: "100%", minHeight: 84, resize: "vertical", border: "1px solid var(--color-border-strong)", borderRadius: 6, padding: "10px 12px", background: "#fff", fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--color-fg)", lineHeight: 1.6, boxSizing: "border-box" }}
              />
              {noteError && <div style={{ color: "#C4615A", fontSize: 11, marginTop: 6 }}>{noteError}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button onClick={() => handleReview(false)} disabled={submitting}
                  style={{ flex: 1, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#C4615A", border: "1px solid rgba(196,97,90,.4)", background: "var(--color-danger-bg)" }}>
                  <X size={13} /> 退回
                </button>
                <button onClick={() => handleReview(true)} disabled={submitting} className="btn-primary" style={{ flex: 1 }}>
                  <Check size={13} /> 通过
                </button>
              </div>
            </>
          )}
          {section.status === "approved" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: "#4A8B5C" }}>
                <Check size={14} style={{ verticalAlign: -2 }} /> 已审核通过{section.reviewedAt ? ` · ${fmtTime(section.reviewedAt)}` : ""}
              </span>
              <button onClick={handleUnapprove} disabled={submitting} className="btn-ghost" style={{ color: "#B8783F", border: "1px solid rgba(184,120,63,.45)", fontSize: 12 }}>
                <Undo2 size={13} /> {submitting ? "处理中..." : "撤销通过"}
              </button>
            </div>
          )}
          {section.status === "returned" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: "#C4615A" }}>
                <X size={14} style={{ verticalAlign: -2 }} /> 已驳回{section.reviewNote && <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 6 }}>理由：{section.reviewNote}</span>}
              </span>
              <button onClick={handleReopen} disabled={submitting} className="btn-ghost" style={{ color: "#C7924B", border: "1px solid rgba(201,146,75,.4)", fontSize: 12 }}>
                <Undo2 size={13} /> 撤销驳回
              </button>
            </div>
          )}
          {section.status === "draft" && (
            <div style={{ fontSize: 13, color: "#C7924B" }}>学生已撤回或重新编辑，等待重新提交审核</div>
          )}
        </div>
      </div>

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        提交项经审核后分数生效 · 退回项将由学生修改后重新提交<br /><b style={{ color: "var(--color-muted)" }}>审核详情</b> · {year} 学年
      </div>
    </div>
  )

  return (
    <>
      {mobileView}
      <div className="reviewR-desktop">
      <main className="m-main" style={{ width: "min(720px, calc(100vw - 56px))", margin: "0 auto", padding: "36px 0 80px" }}>
      <button className="btn-ghost" onClick={() => router.push(backPath)} style={{ marginBottom: 20 }}>
        <ArrowLeft size={14} /> {backLabel}
      </button>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1.15rem", marginBottom: 4 }}>审核 {sectionLabel}</h2>
        <div style={{ fontSize: "0.82rem", color: "var(--color-muted)", marginBottom: 16 }}>
          {section.user?.name} ({section.user?.studentId}) · 提交于 {section.submittedAt ? new Date(section.submittedAt).toLocaleString("zh-CN") : "—"}
        </div>

        {/* Score display */}
        <div style={{
          padding: "14px 18px", borderRadius: "var(--radius)",
          background: "var(--color-bg-alt)", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>当前得分：</span>
          <span style={{ fontSize: "1.4rem", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--color-accent)" }}>
            {showScore?.toFixed(2) ?? "—"}
          </span>
          {dPreviewScore != null && (
            <span style={{ fontSize: ".68rem", color: "#C7924B", background: "#FDF5EA", border: "1px solid rgba(201,146,75,.3)", padding: "2px 8px", borderRadius: 6 }}>
              含手动确认加分
            </span>
          )}
        </div>

        {/* S 板块: 成绩明细（按学期分组，逐项核对） */}
        {section.section === "S" && (
          <div style={{ marginBottom: 16 }}>
            <div className="form-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <BookOpen size={14} /> 成绩明细
            </div>
            {courseScores.length === 0 ? (
              <p style={{ fontSize: ".82rem", color: "#7A8A94", padding: "12px 0" }}>该学生尚未录入课程成绩</p>
            ) : (
              <>
                {[1, 2].map(sem => {
                  const list = courseScores
                    .filter(s => s.course?.semester === sem)
                    .sort((a, b) => (a.course?.sortOrder || 0) - (b.course?.sortOrder || 0))
                  if (list.length === 0) return null
                  return (
                    <div key={sem} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#3D5A6E", marginBottom: 6 }}>
                        第{sem === 1 ? "一" : "二"}学期（{list.length}门）
                      </div>
                      <div style={{ border: "1px solid #E8E3D9", borderRadius: 8, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".76rem" }}>
                          <thead>
                            <tr style={{ background: "#F9F8F5" }}>
                              <th style={{ textAlign: "left", padding: "7px 12px", fontWeight: 600, color: "#7A8A94" }}>课程</th>
                              <th style={{ width: 44, padding: "7px 8px", fontWeight: 600, color: "#7A8A94" }}>学分</th>
                              <th style={{ width: 64, padding: "7px 8px", fontWeight: 600, color: "#7A8A94" }}>成绩</th>
                              <th style={{ width: 56, padding: "7px 8px", fontWeight: 600, color: "#7A8A94" }}>绩点</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map(s => {
                              const failed = (s.score != null && s.score < 60) || s.grade === "不及格"
                              return (
                                <tr key={s.id} style={{ borderTop: "1px solid #F1F0EC", background: failed ? "#FDF6F5" : undefined }}>
                                  <td style={{ padding: "7px 12px", fontWeight: 500 }}>
                                    {s.course?.name || s.courseId}
                                    {s.course?.isElective && <span className="tag" style={{ marginLeft: 6, fontSize: ".55rem" }}>任选</span>}
                                    {failed && <span className="tag" style={{ marginLeft: 6, fontSize: ".55rem", background: "#FEF2F2", color: "#C4615A", border: "1px solid rgba(196,97,90,.3)" }}>挂科</span>}
                                    {(s as any).repeat === true && <span className="tag" style={{ marginLeft: 6, fontSize: ".55rem", background: "#FDF5EA", color: "#C7924B", border: "1px solid rgba(201,146,75,.35)" }}>重修</span>}
                                  </td>
                                  <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace" }}>
                                    {s.course?.credits ?? "—"}
                                  </td>
                                  <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: failed ? "#C4615A" : undefined }}>
                                    {s.score != null ? s.score : (s.grade || "—")}
                                  </td>
                                  <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", color: s.gpa != null ? "#3D5A6E" : "#A8B4BD" }}>
                                    {s.gpa != null ? s.gpa.toFixed(2) : "—"}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
                {/* GPA 汇总: 当前重算 vs 提交时 */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4, fontSize: ".78rem", color: "#556773" }}>
                  <span>加权平均绩点 <strong style={{ fontFamily: "'JetBrains Mono',monospace", color: "#3D5A6E" }}>
                    {gpa > 0 ? gpa.toFixed(2) : "—"}
                  </strong></span>
                  <span>按当前成绩重算 S <strong style={{ fontFamily: "'JetBrains Mono',monospace", color: "#3D5A6E" }}>
                    {gpa > 0 ? sScore.toFixed(2) : "—"}
                  </strong></span>
                  {section.score != null && section.score > 0 && (
                    <span style={{ color: Math.abs(sScore - section.score) > 0.01 ? "#C4615A" : "#556773" }}>
                      提交时 S 得分 <strong style={{ fontFamily: "'JetBrains Mono',monospace" }}>{section.score.toFixed(2)}</strong>
                      {Math.abs(sScore - section.score) > 0.01 && (
                        <span style={{ marginLeft: 6, color: "#C4615A", fontSize: ".68rem" }}>成绩已变动，请核实</span>
                      )}
                    </span>
                  )}
                </div>
                {/* 手填成绩汇总（教务系统数值） */}
                {(parsedData.sem1Gpa != null || parsedData.sem2Gpa != null || parsedData.yearGpa != null || parsedData.totalScore != null) && (
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, padding: "10px 14px", background: "#F3FAF5", borderRadius: 6, fontSize: ".76rem", color: "#3E7A5C" }}>
                    <span style={{ fontWeight: 600 }}>手填汇总</span>
                    {parsedData.sem1Gpa != null && <span>GPA₁ <strong style={{ fontFamily: "'JetBrains Mono',monospace" }}>{Number(parsedData.sem1Gpa).toFixed(2)}</strong></span>}
                    {parsedData.sem2Gpa != null && <span>GPA₂ <strong style={{ fontFamily: "'JetBrains Mono',monospace" }}>{Number(parsedData.sem2Gpa).toFixed(2)}</strong></span>}
                    {parsedData.yearGpa != null && <span>学年 GPA <strong style={{ fontFamily: "'JetBrains Mono',monospace" }}>{Number(parsedData.yearGpa).toFixed(2)}</strong></span>}
                    {parsedData.totalScore != null && <span>S <strong style={{ fontFamily: "'JetBrains Mono',monospace" }}>{Number(parsedData.totalScore).toFixed(2)}</strong></span>}
                  </div>
                )}
                {/* 佐证材料（移动版） */}
                {evidence.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: ".7rem", fontWeight: 700, color: "#3D5A6E", marginBottom: 6 }}>佐证材料（{evidence.length}）</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {evidence.map((url: string, ei: number) => (
                        <span key={ei} onClick={() => openViewer(evidence, ei)} title="点击查看大图"
                          style={{ width: 72, height: 72, borderRadius: 6, overflow: "hidden", border: "1px solid #E8E3D9", background: `url(${url}) center/cover`, cursor: "zoom-in", display: "block" }} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Data display */}
        {section.section === "A" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">旷课次数</label>
                <div style={{ fontSize: "1rem", fontWeight: 600 }}>{parsedData.absences || 0}</div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">迟到次数</label>
                <div style={{ fontSize: "1rem", fontWeight: 600 }}>{parsedData.tardies || 0}</div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">特殊情况请假</label>
                <div style={{ fontSize: "1rem", fontWeight: 600 }}>{parsedData.specialLeaves || 0}</div>
              </div>
            </div>
            <div style={{ fontSize: ".8rem", color: "#556773", padding: "10px 14px", background: "rgba(59,107,138,.04)", borderRadius: 6, fontFamily: "'JetBrains Mono',monospace" }}>
              A = 5 - {parsedData.absences || 0}×1 - {parsedData.tardies || 0}×0.25 ={" "}
              {Math.max(0, 5 - (parsedData.absences || 0) * 1 - (parsedData.tardies || 0) * 0.25).toFixed(2)}
              {" "}（特殊情况请假不扣分）
            </div>
          </div>
        )}

        {section.section !== "A" && section.section !== "S" && section.section !== "D" && section.section !== "E" && section.section !== "F" && (
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">得分</label>
            <div style={{ fontSize: "1rem", fontWeight: 600 }}>{parsedData.score || 0}</div>
          </div>
        )}

        {/* F 板块: 五组明细 */}
        {section.section === "F" && (
          <div style={{ marginBottom: 16 }}>
            <div className="form-label" style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
              <Award size={14} /> 奖惩附加明细
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(() => {
                const F4_TYPE: Record<string, string> = { newspaper: "校报文章", journal: "期刊论文", essay: "征文/课题", research: "课题调研", patent: "专利" }
                const F4_DETAIL = (it: any) => {
                  if (it.type === "journal") return it.rank === 1 ? "第一作者" : it.rank === 2 ? "第二作者" : `第${it.rank || 3}作者`
                  if (it.type === "essay") return `第${it.rank || 4}作者`
                  if (it.type === "research") return it.level === "province" ? "省级课题" : "校级课题"
                  return it.detail || ""
                }
                const GROUPS = [
                  { title: "F1 学生工作", items: parsedData.f1 || [], score: f1Score, photos: (it: any) => it.photos || [], desc: (it: any) => {
                      const p = POSITION_PRESETS.find(x => x.type === it.position)
                      return p
                        ? `${p.label}（${p.category}）· ${it.duration === "sem" ? "一学期" : "一学年"} · 考评${it.evaluation === "excellent" ? "优秀" : it.evaluation === "fail" ? "不合格" : "合格"}${it.evaluation === "excellent" ? "（+0.5）" : it.evaluation === "fail" ? "（-0.5）" : ""}`
                        : `${it.position || "未选职位"} · ${it.duration === "sem" ? "一学期" : "一学年"} · 考评${it.evaluation || "合格"}`
                    } },
                  { title: "F2 竞赛获奖", items: parsedData.f2 || [], score: f2Score, photos: (it: any) => it.photos || [], desc: (it: any) => {
                      const base = (F2_RANK_SCORES[it.category] || [0, 0, 0])[Math.min(Math.max(it.rank, 1), 3) - 1] || 0
                      const rankTxt = it.rank === 0 ? "特等奖" : it.rank === 1 ? "一等奖" : it.rank === 2 ? "二等奖" : "三等奖"
                      const teamTxt = it.isTeam
                        ? `团队 ${it.teamSize || 1} 人${it.position ? `，排第 ${it.position} 位` : ""}（等级分 ${base.toFixed(1)} × 系数 ${f2Score(it) > 0 ? (f2Score(it) / base).toFixed(2) : "—"}）`
                        : "个人"
                      return `${it.name || "未填名称"} · ${COMPETITION_LEVELS[it.category]?.label || it.category + "类"} · ${rankTxt} · ${teamTxt}`
                    } },
                  { title: "F3 荣誉称号", items: parsedData.f3 || [], score: (it: any) => F3_HONOR_SCORES[it.level] || 0, photos: (it: any) => it.photos || [], desc: (it: any) => {
                      const L: Record<string, string> = { national: "国家级", province: "省级", city: "市级", school: "校级" }
                      return `${L[it.level] || it.level || "未填级别"} · ${it.name || "未填名称"}`
                    } },
                  { title: "F4 科研奖励", items: parsedData.f4 || [], score: f4Score, photos: (it: any) => it.photos || [], desc: (it: any) => {
                      const extra = it.type === "journal" || it.type === "essay" ? ` · ${F4_DETAIL(it)}` : ""
                      return `${F4_TYPE[it.type] || it.type || "未填类型"}${extra}${it.detail && it.type !== "journal" && it.type !== "essay" ? ` · ${it.detail}` : ""}`
                    } },
                  { title: "F5 惩罚扣分", items: parsedData.f5 || [], score: (it: any) => -(F5_PENALTY_SCORES[it.type] || 0) * (it.count || 1), photos: () => [], desc: (it: any) => `${it.type || "未填"} × ${it.count || 1} 次` },
                ]
                return GROUPS.map(g => (
                  <div key={g.title}>
                    <div style={{ fontSize: ".7rem", fontWeight: 700, color: "#3D5A6E", marginBottom: 6 }}>{g.title}（{g.items.length}）</div>
                    {g.items.length === 0 ? (
                      <div style={{ fontSize: ".7rem", color: "#C8CDD2", padding: "4px 0" }}>无记录</div>
                    ) : (
                      g.items.map((it: any, i: number) => {
                        const sc = g.score(it)
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "#F9F8F5", marginBottom: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: ".76rem", color: "#1A1D22", flex: 1, minWidth: 170, lineHeight: 1.55 }}>{g.desc(it)}</span>
                            <span style={{ fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".78rem", fontWeight: 700, color: g.title === "F5 惩罚扣分" ? "#C4615A" : sc > 0 ? "#3B6B8A" : "#A8B4BD", flex: "none" }}>
                              {sc > 0 ? `+${sc.toFixed(2)}` : sc < 0 ? sc.toFixed(2) : "0.00"}
                            </span>
                            {g.photos(it).length > 0 && (
                              <div style={{ display: "flex", gap: 4 }}>
                                {g.photos(it).slice(0, 3).map((url: string, pi: number) => (
                                  <span key={pi} onClick={() => openViewer(g.photos(it), pi)} title="查看佐证"
                                    style={{ width: 30, height: 30, borderRadius: 5, overflow: "hidden", border: "1px solid #E8E3D9", display: "block", background: "#F5F2ED", cursor: "zoom-in" }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt="佐证" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  </span>
                                ))}
                                {g.photos(it).length > 3 && <span style={{ fontSize: ".58rem", color: "#A8B4BD", alignSelf: "center" }}>+{g.photos(it).length - 3}</span>}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                ))
              })()}
            </div>
          </div>
        )}

        {/* E 板块: 社会实践信息 */}
        {section.section === "E" && (
          <div style={{ marginBottom: 16 }}>
            <div className="form-label" style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
              <Heart size={14} /> 社会实践信息
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "担任分队队长/召集人", v: parsedData.isCaptain ? "+0.5" : "否", on: !!parsedData.isCaptain },
                { label: "分队获奖", v: parsedData.teamAward === "member" ? "优秀分队成员 (+1)" : parsedData.teamAward === "captain" ? "优秀分队队长/召集人 (+1.5)" : "无", on: parsedData.teamAward !== "none" && parsedData.teamAward },
                { label: "校级社会实践积极分子", v: parsedData.schoolLevelAward ? "+2" : "否", on: !!parsedData.schoolLevelAward },
                { label: "市级以上优秀志愿者", v: parsedData.cityVolunteer ? "+1" : "否", on: !!parsedData.cityVolunteer },
                { label: "志愿时长", v: parsedData.volunteerHours ? `${parsedData.volunteerHours} 小时（+${Math.min(3, parsedData.volunteerHours * 0.1).toFixed(2)}）` : "未填写", on: parsedData.volunteerHours > 0 },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: r.on ? "#F3FAF5" : "#F9F8F5" }}>
                  <span style={{ fontSize: ".8rem", color: "#556773" }}>{r.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: ".78rem", fontWeight: 600, color: r.on ? "#3E7A5C" : "#A8B4BD" }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* D 板块: 文体活动项目明细 */}
        {section.section === "D" && (
          <div style={{ marginBottom: 16 }}>
            <div className="form-label" style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
              <Music size={14} /> 活动项目明细（{Array.isArray(parsedData.items) ? parsedData.items.length : 0} 项）
            </div>
            {!Array.isArray(parsedData.items) || parsedData.items.length === 0 ? (
              <p style={{ fontSize: ".82rem", color: "#7A8A94", padding: "12px 0" }}>该学生尚未填写文体活动记录</p>
            ) : (
              <div style={{ border: "1px solid #E8E3D9", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".76rem" }}>
                  <thead>
                    <tr style={{ background: "#F9F8F5" }}>
                      <th style={{ textAlign: "left", padding: "7px 12px", fontWeight: 600, color: "#7A8A94" }}>活动类型</th>
                      <th style={{ textAlign: "left", padding: "7px 8px", fontWeight: 600, color: "#7A8A94" }}>活动名称</th>
                      <th style={{ width: 84, padding: "7px 8px", fontWeight: 600, color: "#7A8A94" }}>日期</th>
                      <th style={{ width: 80, padding: "7px 8px", fontWeight: 600, color: "#7A8A94" }}>级别/名次</th>
                      <th style={{ width: 64, padding: "7px 8px", fontWeight: 600, color: "#7A8A94" }}>加分</th>
                      <th style={{ width: 90, padding: "7px 8px", fontWeight: 600, color: "#7A8A94" }}>证明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.items.map((it: any, i: number) => {
                      const typeLabel = D_TYPE_LABELS[it.type] || it.type
                      const awardTxt = it.type === "award"
                        ? (it.rank === 5 ? `其他·${it.rankNote || "未注明"}` : `${D_LEVEL_LABELS[it.level] || it.level}·${D_RANK_LABELS[it.rank] || "第" + it.rank + "名"}`)
                        : "—"
                      const score = it.type === "award"
                        ? (it.rank === 5 ? 0 : (D_RANK_SCORES[it.level]?.[it.rank] ?? 0))
                        : (D_TYPE_SCORES[it.type] ?? 0)
                      return (
                        <tr key={i} style={{ borderTop: "1px solid #F1F0EC" }}>
                          <td style={{ padding: "7px 12px", fontWeight: 500 }}>{typeLabel}</td>
                          <td style={{ padding: "7px 8px" }}>{it.name || "—"}</td>
                          <td style={{ padding: "7px 8px", textAlign: "center", color: "#7A8A94" }}>{it.date || "—"}</td>
                          <td style={{ padding: "7px 8px", textAlign: "center", color: it.type === "award" ? "#B8783F" : "#A8B4BD" }}>{awardTxt}</td>
                          <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: it.rank === 5 ? "#C7924B" : (score > 0 ? "#3D5A6E" : "#A8B4BD") }}>
                            {it.rank === 5 ? (
                              <input
                                type="number" step="0.1" min="0" max="5"
                                placeholder="0"
                                value={manualScores[i] ?? (it.score != null && it.score > 0 ? String(it.score) : "")}
                                onChange={e => setManualScores(m => ({ ...m, [i]: e.target.value }))}
                                title="审核员确认加分（0-5）"
                                style={{
                                  width: 58, height: 26, border: "1.5px solid #E3E7EB", borderRadius: 6,
                                  textAlign: "center", fontSize: ".72rem", fontFamily: "'JetBrains Mono',monospace",
                                  outline: "none", background: "#FDFDFC", color: "#3D5A6E",
                                }}
                              />
                            ) : (
                              `+${score.toFixed(2)}`
                            )}
                          </td>
                          <td style={{ padding: "7px 8px", textAlign: "center" }}>
                            {Array.isArray(it.photos) && it.photos.length > 0 ? (
                              <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                                {it.photos.slice(0, 3).map((url: string, pi: number) => (
                                  <span key={pi} onClick={() => openViewer(it.photos, pi)} title="查看证明"
                                    style={{ width: 30, height: 30, borderRadius: 5, overflow: "hidden", border: "1px solid #E8E3D9", display: "block", background: "#F5F2ED", cursor: "zoom-in" }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt="证明" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  </span>
                                ))}
                                {it.photos.length > 3 && <span style={{ fontSize: ".58rem", color: "#A8B4BD", alignSelf: "center" }}>+{it.photos.length - 3}</span>}
                              </div>
                            ) : (
                              <span style={{ fontSize: ".6rem", color: "#C8CDD2" }}>无</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Evidence images */}
        {evidence.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Image size={14} /> 佐证材料
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {evidence.map((url: string, i: number) => (
                <span key={i} onClick={() => openViewer(evidence, i)} title="点击查看大图"
                  style={{
                    width: 100, height: 100, borderRadius: "var(--radius)",
                    border: "1px solid var(--color-border)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    background: `url(${url}) center/cover`, color: "transparent",
                    cursor: "zoom-in",
                  }}>
                  图片 {i + 1}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Review actions — 按审核状态显示 */}
        {section.status === "submitted" && (
          <>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                审核意见（退回时必填）
              </label>
              <textarea
                className="form-input"
                rows={3}
                value={reviewNote}
                onChange={e => { setReviewNote(e.target.value); setNoteError("") }}
                placeholder="填写退回修改的理由..."
                style={{ resize: "vertical" }}
              />
            </div>
            {noteError && <div style={{ color: "var(--color-danger)", fontSize: ".78rem", marginBottom: 10 }}>{noteError}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                className="btn-secondary"
                onClick={() => handleReview(false)}
                disabled={submitting}
                style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
              >
                <X size={14} /> 退回修改
              </button>
              <button
                className="btn-primary"
                onClick={() => handleReview(true)}
                disabled={submitting}
              >
                <Check size={14} /> 审核通过
              </button>
            </div>
          </>
        )}
        {section.status === "approved" && (
          <div style={{ padding: "14px 18px", borderRadius: "var(--radius)", background: "#EDF7F0", color: "#4A8B5C", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: ".85rem" }}><Check size={14} style={{ verticalAlign: -2 }} /> 已审核通过</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: ".72rem", opacity: .85 }}>
                得分 {section.score?.toFixed(2) ?? "—"}
                {section.reviewedAt ? ` · ${new Date(section.reviewedAt).toLocaleString("zh-CN")}` : ""}
              </span>
              <button className="btn-ghost" onClick={handleUnapprove} disabled={submitting}
                style={{ color: "#B8783F", border: "1px solid rgba(184,120,63,.45)", fontSize: ".75rem" }}>
                <Undo2 size={13} /> {submitting ? "处理中..." : "撤销通过"}
              </button>
            </span>
          </div>
        )}
        {section.status === "returned" && (
          <div style={{ padding: "14px 18px", borderRadius: "var(--radius)", background: "#FDF3F2", color: "#C4615A", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: ".85rem" }}>
              <X size={14} style={{ verticalAlign: -2 }} /> 已驳回
              {section.reviewNote && <span style={{ fontWeight: 400, fontSize: ".75rem", marginLeft: 8 }}>理由：{section.reviewNote}</span>}
            </span>
            <button className="btn-ghost" onClick={handleReopen} disabled={submitting}
              style={{ color: "#C7924B", border: "1px solid rgba(201,146,75,.4)", fontSize: ".75rem" }}>
              <Undo2 size={13} /> 撤销驳回
            </button>
          </div>
        )}
        {section.status === "draft" && (
          <div style={{ padding: "14px 18px", borderRadius: "var(--radius)", background: "#FDF5EA", color: "#C7924B", fontSize: ".82rem" }}>
            学生已撤回或重新编辑，等待重新提交审核
          </div>
        )}
      </div>
    </main>
      </div>

      {/* 图片查看器（移出桌面容器，移动端也可显示） */}
      {viewerOpen && (
        <ImageViewer
          images={viewerImages}
          index={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onIndexChange={setViewerIndex}
        />
      )}

      {/* 同板块学生（学号排序）——翻页与学生面板 */}
      {siblings.length > 0 && section && (() => {
        const currentIdx = siblings.findIndex(s => s.sectionId === reviewId)
        const prev = currentIdx > 0 ? siblings[currentIdx - 1] : null
        const next = currentIdx >= 0 && currentIdx < siblings.length - 1 ? siblings[currentIdx + 1] : null
        const go = (sectionId: string) => router.push(`/zongce/review/${sectionId}?from=${from}`)
        const STATUS_TXT: Record<string, string> = { submitted: "待审核", approved: "已通过", returned: "已退回", draft: "草稿", not_started: "未填写" }
        const STATUS_CLR: Record<string, string> = { approved: "#5A8C6F", submitted: "#C7924B", returned: "#C4615A", draft: "#8A93A0", not_started: "#B6BDC8" }
        return (
          <>
            {/* 左右翻页：桌面贴主内容两侧 / 移动端贴底部拇指区 */}
            {prev && (
              <button onClick={() => go(prev.sectionId)} title={`上一个：${prev.name}（${prev.studentId}）`}
                style={{
                  position: "fixed", zIndex: 600,
                  top: isMobile ? undefined : "50%",
                  bottom: isMobile ? 84 : undefined,
                  left: isMobile ? 12 : "calc((100vw - min(720px, calc(100vw - 56px))) / 2 - 58px)",
                  transform: isMobile ? "none" : "translateY(-50%)",
                  width: isMobile ? 40 : 44, height: isMobile ? 40 : 44,
                  borderRadius: "50%", border: "1px solid #E0E5EC", background: "rgba(255,255,255,.95)",
                  color: "#3B6B8A", boxShadow: "0 4px 16px rgba(0,0,0,.12)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 18 : 20,
                }}>
                ‹
              </button>
            )}
            {next && (
              <button onClick={() => go(next.sectionId)} title={`下一个：${next.name}（${next.studentId}）`}
                style={{
                  position: "fixed", zIndex: 600,
                  top: isMobile ? undefined : "50%",
                  bottom: isMobile ? 84 : undefined,
                  right: isMobile ? 12 : "calc((100vw - min(720px, calc(100vw - 56px))) / 2 - 58px)",
                  transform: isMobile ? "none" : "translateY(-50%)",
                  width: isMobile ? 40 : 44, height: isMobile ? 40 : 44,
                  borderRadius: "50%", border: "1px solid #E0E5EC", background: "rgba(255,255,255,.95)",
                  color: "#3B6B8A", boxShadow: "0 4px 16px rgba(0,0,0,.12)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 18 : 20,
                }}>
                ›
              </button>
            )}

            {/* 左侧学生面板（仅桌面显示，左上角区域，随身份切换横幅下移） */}
            {!isMobile && (
            <div style={{
              position: "fixed", left: 16, top: "calc(var(--sticky-offset, 56px) + 20px)", zIndex: 500,
              width: 268, maxHeight: "40vh", display: "flex", flexDirection: "column",
              background: "#fff", border: "1px solid #E0E5EC", borderRadius: 8,
              boxShadow: "0 8px 30px rgba(0,0,0,.1)", overflow: "hidden",
            }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F5", display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                <span style={{ fontSize: ".78rem", fontWeight: 700, color: "#1A1D22" }}>{section.section} {sectionLabel}</span>
                <span style={{ marginLeft: "auto", fontSize: ".66rem", color: "#8A93A0", fontFamily: "'JetBrains Mono',Consolas,monospace" }}>{siblings.length} 人</span>
              </div>
              <div style={{ overflowY: "auto", flex: 1, minHeight: 0, overscrollBehavior: "contain" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".72rem" }}>
                  <tbody>
                    {siblings.map((s, i) => {
                      const active = s.sectionId === reviewId
                      return (
                        <tr key={s.sectionId}
                          onClick={() => !active && go(s.sectionId)}
                          style={{
                            borderBottom: "1px solid #F5F6F8", cursor: active ? "default" : "pointer",
                            background: active ? "#EBEFF5" : "transparent",
                            transition: "background .1s",
                          }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#F7F9FB" }}
                          onMouseLeave={e => { e.currentTarget.style.background = active ? "#EBEFF5" : "transparent" }}>
                          <td style={{ padding: "6px 6px", textAlign: "center", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".62rem", color: active ? "#3B6B8A" : "#B6BDC8", fontWeight: 700, width: 26 }}>{i + 1}</td>
                          <td style={{ padding: "6px 4px", fontWeight: active ? 700 : 500, color: "#1A1D22", whiteSpace: "nowrap" }}>{s.name}</td>
                          <td style={{ padding: "6px 4px", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".62rem", color: "#8A93A0", whiteSpace: "nowrap" }}>{s.studentId}</td>
                          <td style={{ padding: "6px 6px", textAlign: "center", fontSize: ".6rem", fontWeight: 600, color: STATUS_CLR[s.status] || "#B6BDC8", whiteSpace: "nowrap" }}>{STATUS_TXT[s.status] || "未填写"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "7px 14px", borderTop: "1px solid #EEF1F5", fontSize: ".62rem", color: "#8A93A0", fontFamily: "'JetBrains Mono',Consolas,monospace", textAlign: "center" }}>
                按学号排序 · 点击行跳转
              </div>
            </div>
            )}
            </>
          )
        })()}
    </>
  )
}
