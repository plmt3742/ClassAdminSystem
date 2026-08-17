"use client"

import { useCallback, useEffect, useState, type CSSProperties } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ZcGauge from "@/components/ZcGauge"
import {
  BookOpen, ClipboardCheck, Users, Home, Music, Heart, Award,
  PencilLine, ArrowRight, ChevronRight, Lock, Images, FileText, ArrowLeft, ChevronDown, Trophy, ListChecks, BarChart3, HeartPulse,
} from "lucide-react"

const SECTION_ICONS: Record<string, any> = {
  "S": BookOpen, "A": ClipboardCheck, "B": Users,
  "C": Home, "D": Music, "E": Heart, "F": Award,
}
const SECTION_LABELS: Record<string, string> = {
  "S": "学习成绩", "A": "学风考勤", "B": "集会政治学习",
  "C": "星级宿舍", "D": "文体活动", "E": "社会实践 / 公益", "F": "奖惩附加",
}
const SECTION_MAX: Record<string, string> = {
  "S": "", "A": "5", "B": "2.5", "C": "2.5", "D": "5", "E": "5", "F": "10",
}
const SECTION_REVIEWERS: Record<string, string> = {
  "S": "学习委员", "A": "班长", "B": "团支书", "C": "生活委员", "D": "文体委员", "E": "组织委员", "F": "班长",
}
const STATUS_TEXT: Record<string, string> = {
  not_started: "未填写", draft: "草稿", submitted: "待审核", approved: "已通过", returned: "退回修改",
}
// 板块状态 → 设计稿 A 的 data-status（ok=通过绿 / pending=待审琥珀 / returned=退回红 / draft=草稿蓝灰 / none=未填灰/锁定）
const STATUS_DATA: Record<string, string> = {
  not_started: "none", draft: "draft", submitted: "pending", approved: "ok", returned: "returned",
}
// B/C 板块由班委评定填写（学生只读），状态文案按板块定制：
// B 集会政治学习 — 团支书评定，保存即生效（approved）: 待团支书填写 / 已上传
// C 星级宿舍 — 生活委员评定，保存即生效: 待生活委员评定 / 已上传
function getStatusText(section: string, status: string, locked: boolean): string {
  if (locked) return "暂未开放"
  if (section === "B") {
    if (status === "not_started") return "待团支书填写"
    if (status === "approved") return "已上传"
    return STATUS_TEXT[status] || "未填写"
  }
  if (section === "C") {
    if (status === "not_started") return "待生活委员评定"
    if (status === "draft" || status === "submitted" || status === "approved") return "已上传"
    return STATUS_TEXT[status] || "未填写"
  }
  return STATUS_TEXT[status] || "未填写"
}
// B/C 板块一旦由班委评定保存即视为已上传（绿），未评定为灰
function getDataStatus(section: string, status: string, locked: boolean): string {
  if (locked) return "none"
  if ((section === "B" && status === "approved") ||
      (section === "C" && (status === "draft" || status === "submitted" || status === "approved"))) return "ok"
  return STATUS_DATA[status] || "none"
}

interface SectionItem {
  section: string; label: string; max: number; reviewer: string; icon: string; status: string; score: number; data: any; locked: boolean
}
interface PendingReview {
  id: string; section: string; sectionLabel: string; userName: string; userStudentId: string; submittedAt: string; status: string
}
interface StudentSummary {
  id: string; name: string; studentId: string; role: string
  sScore: number; mScore: number; totalScore: number; gpa: number
  approvedCount: number; totalSections: number; hasScores: boolean; sectionCount: number
}
// 班级总排名（全班公开）
interface RankSectionScore { section: string; status: string; score: number }
interface RankCourseDetail { name: string; credits: number; semester: number; score: number | null; grade: string | null; gpa: number | null; repeat: boolean; failed: boolean }
interface RankRow {
  id: string; name: string; studentId: string; physicalTest?: boolean | null; gpa: number
  sScore: number; mScore: number; totalScore: number
  failedCount?: number; failedPolicyCount?: number
  sectionScores: RankSectionScore[]
  sectionDetails: Record<string, Record<string, unknown>>
  coursesDetail: RankCourseDetail[]
}
const D_TYPE_LABEL: Record<string, string> = {
  ceremony: "大型活动", team_unranked: "队伍参赛未获奖", performance: "文艺表演",
  rehearsal: "排练", sports: "阳光体育", sports_unranked: "运动会参与未获奖", award: "获奖项目",
}
const D_LEVEL_LABEL: Record<string, string> = { college: "院级", school: "校级", province: "省级", national: "国家级" }
const D_RANK_LABEL: Record<number, string> = { 1: "一等奖", 2: "二等奖", 3: "三等奖", 4: "第4-8名", 5: "其他" }
const F3_LEVEL_LABEL: Record<string, string> = { national: "国家级", province: "省级", city: "市级", school: "校级" }
const F4_TYPE_LABEL: Record<string, string> = { newspaper: "校报投稿", journal: "期刊论文", essay: "征文/课题", research: "课题调研", patent: "专利" }
const M_SECTION_LABELS: Record<string, string> = {
  A: "学风考勤", B: "集会政治学习", C: "星级宿舍", D: "文体活动", E: "社会实践", F: "奖惩附加",
}
const asNum = (v: unknown): number => (typeof v === "number" ? v : 0)
const asBool = (v: unknown): boolean => v === true
const asStr = (v: unknown): string => (typeof v === "string" ? v : "")
const asArr = (v: unknown): Record<string, unknown>[] =>
  (Array.isArray(v) ? v.filter(x => x && typeof x === "object") : []) as Record<string, unknown>[]

export default function ZongceDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sScore, setSScore] = useState(0)
  const [mScore, setMScore] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [weightedGPA, setWeightedGPA] = useState(0)
  const [sections, setSections] = useState<SectionItem[]>([])
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([])
  const [courseCount, setCourseCount] = useState(0)
  const [filledScoreCount, setFilledScoreCount] = useState(0)
  const [allStudents, setAllStudents] = useState<{ id: string; name: string; studentId: string; role: string }[]>([])
  const [viewingUser, setViewingUser] = useState<{ name: string; studentId: string; physicalTest?: boolean | null } | null>(null)
  const [ptValue, setPtValue] = useState<boolean | null>(null)
  const [ptSaving, setPtSaving] = useState(false)

  // 体测是否过关（自己视角拉取）
  useEffect(() => {
    if (!session) return
    fetch("/api/me")
      .then(r => (r.ok ? r.json() : null))
      .then((d: { user?: { physicalTest?: boolean | null } } | null) => {
        setPtValue(d?.user?.physicalTest == null ? null : !!d.user.physicalTest)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const submitPt = async (v: boolean) => {
    setPtSaving(true)
    try {
      const res = await fetch("/api/me/physical-test", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passed: v }),
      })
      if (res.ok) setPtValue(v)
    } catch {
      /* ignore */
    } finally {
      setPtSaving(false)
    }
  }
  const [viewingUserId, setViewingUserId] = useState("")
  const [photoCount, setPhotoCount] = useState(0)
  const [committeeDone, setCommitteeDone] = useState(false)
  // 班级总排名（全班公开）
  const [rankRows, setRankRows] = useState<RankRow[]>([])
  const [rankLoaded, setRankLoaded] = useState(false)
  const [mExpandedId, setMExpandedId] = useState<string | null>(null)
  const [rankShowAll, setRankShowAll] = useState(false)
  // 民主评议排行榜（全班公开，仅计普通同学投票）
  const [crRows, setCrRows] = useState<{ name: string; role: string; count: number; avg: number | null }[]>([])
  const [crLoaded, setCrLoaded] = useState(false)
  const [reportRow, setReportRow] = useState<RankRow | null>(null)
  const year = "2025-2026" // 当前综测学年（评分数据按学年隔离）——必须声明在组件顶部，effect 与 early return 之前

  // 拉取全班排名
  useEffect(() => {
    if (!session) return
    fetch("/api/zongce/ranking")
      .then(r => (r.ok ? r.json() : null))
      .then((d: { rows?: RankRow[] } | null) => {
        if (d?.rows) setRankRows(d.rows)
        setRankLoaded(true)
      })
      .catch(() => setRankLoaded(true))
    fetch("/api/zongce/committee/public-ranking")
      .then(r => (r.ok ? r.json() : null))
      .then((d: { rows?: { name: string; role: string; count: number; avg: number | null }[] } | null) => {
        if (d?.rows) setCrRows(d.rows)
        setCrLoaded(true)
      })
      .catch(() => setCrLoaded(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // 班委民主评议状态灯：当前用户是否已打分
  useEffect(() => {
    if (!session) return
    fetch(`/api/zongce/committee?year=${year}`)
      .then(r => r.json())
      .then(d => setCommitteeDone((d.submittedCount || 0) > 0))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const fetchDashboard = useCallback(async (userId?: string) => {
    let url = "/api/zongce/dashboard"
    if (userId) url = `/api/zongce/dashboard?userId=${userId}`
    const res = await fetch(url)
    if (!res.ok) return
    const d = await res.json()
    {
      setSScore(d.sScore || 0); setMScore(d.mScore || 0); setTotalScore(d.totalScore || 0)
      setWeightedGPA(d.weightedGPA || 0); setSections(d.sections || [])
      setPendingReviews(d.pendingReviews || []); setCourseCount(d.courseCount || 0)
      setFilledScoreCount(d.filledScoreCount || 0); setAllStudents(d.allStudents || [])
      setViewingUser(d.viewingUser || null)
      setPhotoCount(d.photoCount || 0)
    }
    setLoading(false)
  }, [])

  useEffect(() => { if (session) fetchDashboard() }, [session, fetchDashboard])

  // Auto-init courses on first visit
  useEffect(() => {
    if (session) { fetch("/api/zongce/init", { method: "POST" }).catch(() => {}) }
  }, [session])

  const handleViewStudent = (userId: string) => { setViewingUserId(userId); fetchDashboard(userId) }
  const handleBackToSelf = () => { setViewingUserId(""); setViewingUser(null); fetchDashboard() }

  if (loading) return <p className="empty-state">加载中...</p>
  if (!session) return null

  const user = session.user
  const tags: string[] = (user as any)?.tags || []
  const isAdmin = user?.role === "admin"
  const isGuest = user?.role === "guest"
  const isManager = isAdmin || tags.length > 0

  // 班委待办任务栏：当前班委负责的板块中，有待审核任务的条目（点击跳转对应审核页）
  // 游客模式下隐藏审核入口（数据为演示，且审核页不对游客开放）
  const reviewTasks = (isGuest ? [] : [
    { section: "S", href: "/zongce/review-s", reviewer: "学习委员", allowed: isAdmin || tags.includes("学习委员") },
    { section: "A", href: "/zongce/review-a", reviewer: "班长", allowed: isAdmin || tags.includes("班长") },
    { section: "B", href: "/zongce/b-manage", reviewer: "团支书", allowed: isAdmin || tags.includes("团支书") },
    { section: "D", href: "/zongce/review-d", reviewer: "文体委员", allowed: isAdmin || tags.includes("文体委员") },
    { section: "E", href: "/zongce/review-e", reviewer: "组织委员", allowed: isAdmin || tags.includes("组织委员") },
    { section: "F", href: "/zongce/review-f", reviewer: "班长", allowed: isAdmin || tags.includes("班长") },
  ])
    .filter(t => t.allowed)
    .map(t => ({ ...t, count: pendingReviews.filter(r => r.section === t.section).length }))
    .filter(t => t.count > 0)
  const reviewTotal = reviewTasks.reduce((s, t) => s + t.count, 0)
  // 最早提交时间（pendingReviews 已按 submittedAt 升序）
  const earliestTime = pendingReviews[0]?.submittedAt
    ? new Date(pendingReviews[0].submittedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : "—"

  // ===== 移动版（设计稿 zongce.html · 真实数据，≤640px 显示） =====
  // 审核管理：移动版始终显示全部板块（按权限过滤，无待办时显示"已清空"）；游客隐藏
  const reviewAll = (isGuest ? [] : [
    { section: "S", href: "/zongce/review-s", reviewer: "学习委员", allowed: isAdmin || tags.includes("学习委员") },
    { section: "A", href: "/zongce/review-a", reviewer: "班长", allowed: isAdmin || tags.includes("班长") },
    { section: "B", href: "/zongce/b-manage", reviewer: "团支书", allowed: isAdmin || tags.includes("团支书") },
    { section: "D", href: "/zongce/review-d", reviewer: "文体委员", allowed: isAdmin || tags.includes("文体委员") },
    { section: "E", href: "/zongce/review-e", reviewer: "组织委员", allowed: isAdmin || tags.includes("组织委员") },
    { section: "F", href: "/zongce/review-f", reviewer: "班长", allowed: isAdmin || tags.includes("班长") },
  ]).filter(t => t.allowed)
  const mobileView = (
    <div className="m-page-root">
      <header className="m-topbar">
        <Link className="m-back" href="/modules" aria-label="返回模块"><ArrowLeft size={18} /></Link>
        <span className="m-title">综测工作<small>ZONGCE</small></span>
        <span className="m-year">{year}</span>
      </header>

      {/* 总分三列 */}
      <div className="m-pad-x" style={{ paddingTop: 14 }}>
        <div className="m-total">
          <div className="item"><div className="k">S 成绩</div><div className="v s">{sScore.toFixed(2)}</div><div className="unit">GPA {weightedGPA.toFixed(2)}</div></div>
          <div className="item"><div className="k">M 品德</div><div className="v m">{mScore.toFixed(2)}</div><div className="unit">/ 30</div></div>
          <div className="item"><div className="k">T 总分</div><div className="v t">{totalScore.toFixed(2)}</div><div className="unit">S + M</div></div>
        </div>
      </div>

      {/* 七大板块 + 评议 */}
      <div className="m-pad-x" style={{ paddingTop: 14 }}>
        <div className="m-grid">
          {sections.map((s, i) => {
            const IconComp = SECTION_ICONS[s.section]
            const st = s.locked ? "none" : getDataStatus(s.section, s.status, false)
            const chipTxt = getStatusText(s.section, s.status, s.locked)
            const pct = s.section === "S"
              ? (courseCount > 0 ? Math.round((filledScoreCount / courseCount) * 100) : 0)
              : (s.max > 0 ? Math.min(100, Math.round((s.score / s.max) * 100)) : 0)
            return (
              <Link key={s.section} href={`/zongce/${s.section}`} className="m-tile fx-item" data-status={st} style={{ animationDelay: `${i * 45}ms` }}>
                <div className="m-tile-top">
                  <span className="m-tile-icon"><IconComp size={16} /></span>
                  <span className={`chip ${st === "ok" ? "ok" : st === "pending" ? "pending" : st === "returned" ? "returned" : st === "draft" ? "draft" : "none"}`}><span className="lamp" />{chipTxt}</span>
                </div>
                <div className="m-tile-name">{SECTION_LABELS[s.section]}</div>
                <div className="m-tile-reviewer">{SECTION_REVIEWERS[s.section]} · 负责</div>
                <div className="m-tile-track"><div className={`m-tile-fill${st === "pending" ? " pending" : st === "draft" ? " draft" : ""}`} data-fill={pct} /></div>
                <div className="m-tile-bottom">
                  <span className="m-tile-score">
                    {s.section === "S" ? sScore.toFixed(2) : s.score.toFixed(2)}
                    {s.section !== "S" && s.max > 0 && <span className="max"> / {SECTION_MAX[s.section]}</span>}
                  </span>
                  <span className="m-tile-hint">
                    {s.locked ? "暂未开放" : st === "ok" ? "已通过审核" : st === "pending" ? "查看详情" : st === "returned" ? "修改重交" : st === "draft" ? "继续编辑" : s.section === "F" ? "立即填写" : ""}
                  </span>
                </div>
              </Link>
            )
          })}
          {/* 班委民主评议 · 第 8 格 */}
          <Link href={`/zongce/committee?year=${year}`} className="m-tile ghost fx-item" data-status={committeeDone ? "ok" : "none"} style={{ animationDelay: `${sections.length * 45}ms` }}>
            <div className="m-tile-top">
              <span className="m-tile-icon"><Trophy size={16} /></span>
              <span className={`chip ${committeeDone ? "ok" : "none"}`}><span className="lamp" />{committeeDone ? "已打分" : "待打分"}</span>
            </div>
            <div className="m-tile-name">班委民主评议</div>
            <div className="m-tile-reviewer">全员匿名 · 互不可见</div>
            <div className="m-tile-track"><div className="m-tile-fill" data-fill={committeeDone ? 100 : 0} /></div>
            <div className="m-tile-bottom">
              <span className="m-tile-hint">{committeeDone ? "查看报单" : "去打分"}</span>
            </div>
          </Link>
        </div>
      </div>

      {/* 待办审核（按板块分别列出，各自跳转对应审核页） */}
      {isManager && reviewTotal > 0 && (
        <div className="m-pad-x" style={{ paddingTop: 14 }}>
          <div className="m-section-head">
            <span className="m-eyebrow">待办审核</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)" }}>{reviewTotal} 项</span>
          </div>
          <div className="m-rlist">
            {reviewAll
              .map(t => ({ ...t, count: pendingReviews.filter(r => r.section === t.section).length }))
              .filter(t => t.count > 0)
              .map(t => (
                <Link key={t.section} href={t.href} className="m-rrow fx-item">
                  <span className="sec">{t.section}</span>
                  <span className="body">
                    <span className="nm">{SECTION_LABELS[t.section]}</span>
                    <span className="rv">{t.reviewer} · 待审核 {t.count} 份</span>
                  </span>
                  <span className="badge">{t.count} 待办</span>
                  <span className="chev"><ChevronRight size={14} /></span>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* 审核管理（班委） */}
      {isManager && (
        <div className="m-pad-x m-section-gap">
          <div className="m-section-head">
            <span className="m-eyebrow">审核管理</span>
          </div>
          <div className="m-rlist">
            {reviewAll.map(t => (
              <Link key={t.section} href={t.href} className="m-rrow fx-item">
                <span className="sec">{t.section}</span>
                <span className="body">
                  <span className="nm">{SECTION_LABELS[t.section]}</span>
                  <span className="rv">{t.reviewer} · 负责</span>
                </span>
                <span className={`badge${pendingReviews.filter(r => r.section === t.section).length === 0 ? " zero" : ""}`}>
                  {pendingReviews.filter(r => r.section === t.section).length > 0 ? `${pendingReviews.filter(r => r.section === t.section).length} 待办` : "已清空"}
                </span>
                <span className="chev"><ChevronRight size={14} /></span>
              </Link>
            ))}
            <Link href="/zongce/photos" className="m-rrow fx-item">
              <span className="sec" style={{ color: "#2F5A75", background: "#EBEFF5" }}><Images size={14} /></span>
              <span className="body">
                <span className="nm">照片中心</span>
                <span className="rv">佐证照片汇总</span>
              </span>
              <span className={`badge${photoCount > 0 ? "" : " zero"}`}>{photoCount > 0 ? `${photoCount} 张` : "暂无照片"}</span>
              <span className="chev"><ChevronRight size={14} /></span>
            </Link>
            {isAdmin && (
              <Link href="/zongce/unfilled" className="m-rrow fx-item">
                <span className="sec" style={{ color: "#2F5A75", background: "#EBEFF5" }}><ListChecks size={14} /></span>
                <span className="body">
                  <span className="nm">未填写清单</span>
                  <span className="rv">各板块未填名单</span>
                </span>
                <span className="badge zero">查看</span>
                <span className="chev"><ChevronRight size={14} /></span>
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        各板块由对应负责人维护
      </div>
    </div>
  )

  return (
    <>
    {mobileView}
    <div className="zongce-desktop">
    <main className="zc-wrap" style={{ paddingTop: 88 }}>
      {/* ========== 固定返回首页按钮（替代原顶部横栏） ========== */}
      <button className="zc2-fixed-back" onClick={() => router.push("/")} aria-label="返回首页">
        <ArrowLeft size={15} /> 返回首页
      </button>

      {/* ========== IDENTITY ========== */}
      <div className="zc2-identity zc2-fade-in" style={{ "--i": 1 } as CSSProperties}>
        <div className="zc2-avatar">{viewingUser ? viewingUser.name[0] : (user?.name?.[0] || "?")}</div>
        <div className="zc2-id-meta">
          <div className="zc2-id-name">
            {viewingUser ? viewingUser.name : user?.name}
            <span className="zc2-role">{viewingUser ? "同学" : ((user as any)?.role === "admin" ? "管理员" : "学生")}</span>
          </div>
          <div className="zc2-id-sub">{viewingUser ? viewingUser.studentId : (user as any)?.studentId || "—"}</div>
        </div>
        <div className="zc2-id-actions">
          {isAdmin && allStudents.length > 0 && (
            viewingUser ? (
              <button className="zc2-back-btn" onClick={handleBackToSelf}>返回自己</button>
            ) : (
              <label className="zc2-viewer">查看同学
                <select className="zc2-student-select" value={viewingUserId}
                  onChange={e => { if (e.target.value) handleViewStudent(e.target.value); else handleBackToSelf() }}>
                  <option value="">查看同学...</option>
                  {allStudents.map(s => <option key={s.id} value={s.id}>{s.studentId} — {s.name}</option>)}
                </select>
              </label>
            )
          )}
          <Link href="/zongce/select" className="zc2-year-badge" title="切换综测学年">
            2025-2026 学年<ChevronDown size={11} />
          </Link>
        </div>
      </div>

      {/* 正在查看提示 */}
      {viewingUserId && viewingUser && (
        <div className="zc-viewing-bar">
          正在查看 {viewingUser.name}（{viewingUser.studentId}）的综测数据
        </div>
      )}

      {/* ========== TITLE ========== */}
      <div className="zc2-title-block zc2-fade-in" style={{ "--i": 2 } as CSSProperties}>
        <div>
          <div className="zc2-eyebrow">综合素质测评</div>
          <h1 className="zc2-display-title">综测看板</h1>
        </div>
        <Link href="/zongce/rules" className="zc2-ghost-btn">
          <FileText size={15} /> 综测细则参考
        </Link>
      </div>

{/* ========== 个人综测报表入口 ========== */}
      <section className="zc2-section">
        <Link href="/zongce/report" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <div style={{
            background: "#fff", border: "1px solid #E5EAEF", borderRadius: 10,
            padding: "22px 26px", display: "flex", alignItems: "center", gap: 16,
            transition: "box-shadow .15s ease",
          }}>
            <span style={{
              width: 46, height: 46, borderRadius: 13, flexShrink: 0,
              background: "rgba(61,90,110,.09)", color: "#3D5A6E",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <FileText size={20} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: 'Georgia, "Noto Serif SC", serif', fontSize: 17, fontWeight: 700, color: "#1A1D22" }}>个人综测报表</span>
              <span style={{ display: "block", fontSize: 12.5, color: "#8A93A0", marginTop: 4 }}>查看各板块得分与全部详细明细 · 系统核算为准</span>
            </span>
            <span style={{ color: "#A0A8B2", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
              查看报表 <ChevronRight size={16} />
            </span>
          </div>
        </Link>
      </section>



      {/* ========== GAUGE ========== */}
      <section className="zc2-fade-in" style={{ "--i": 3 } as CSSProperties} aria-label="综合评分概览">
        <ZcGauge
          sScore={sScore}
          mScore={mScore}
          totalScore={totalScore}
          gpa={weightedGPA}
          filled={filledScoreCount}
          total={courseCount}
          sActive={weightedGPA > 0}
          mActive={sections.some(s => s.status !== "not_started")}
        />
      </section>

      {/* ========== 班委待办任务栏 · T2 仪表总览 ========== */}
      {isManager && !viewingUserId && (
        <section className="zc2-taskbar zc2-fade-in" style={{ "--i": 4 } as CSSProperties}>
          <div className="zc2-tg-gauge">
            <div className="zc2-tg-num" style={reviewTotal === 0 ? { color: "#3E8E63" } : undefined}>{reviewTotal}</div>
            <div className="zc2-tg-unit">项待审核</div>
            {reviewTotal > 0 ? (
              <div className="zc2-tg-sub">覆盖 <b>{reviewTasks.length}</b> 个板块<br />最早提交于 <b>{earliestTime}</b></div>
            ) : (
              <div className="zc2-tg-sub">全部板块已清空</div>
            )}
          </div>
          {reviewTotal > 0 ? (
            <div className="zc2-tg-list">
              {reviewTasks.map(t => {
                const IconComp = SECTION_ICONS[t.section]
                return (
                  <Link key={t.section} href={t.href} className="zc2-tg-row">
                    <span className="zc2-tg-ic"><IconComp size={14} /></span>
                    <span className="zc2-tg-mid">
                      <span className="zc2-tg-top"><span className="zc2-tg-name">{SECTION_LABELS[t.section]}</span><span className="zc2-tg-who">{t.reviewer}</span></span>
                      <span className="zc2-tg-track"><span className="zc2-tg-fill" style={{ width: `${Math.round((t.count / reviewTotal) * 100)}%` }} /></span>
                    </span>
                    <span className="zc2-tg-count">{t.count}</span>
                    <ChevronRight size={12} className="zc2-tg-chev" />
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="zc2-tg-empty">各板块审核队列已清空</div>
          )}
        </section>
      )}

      {/* ========== 体测是否过关（学生自填收集） ========== */}
      <section className="zc2-section">
        <div className="zc2-pt-bar">
          <span className="zc2-pt-icon"><HeartPulse size={16} /></span>
          <span className="zc2-pt-label">体测是否过关？</span>
          {viewingUserId ? (
            <span className="zc2-pt-chip" data-v={viewingUser?.physicalTest == null ? "none" : viewingUser?.physicalTest ? "yes" : "no"}>
              {viewingUser?.physicalTest == null ? "未填写" : viewingUser.physicalTest ? "过关" : "未过关"}
            </span>
          ) : (
            <span className="zc2-pt-actions">
              <button type="button" className={`zc2-pt-btn${ptValue === false ? " no" : ""}`} disabled={ptSaving} onClick={() => submitPt(false)}>否</button>
              <button type="button" className={`zc2-pt-btn${ptValue === true ? " yes" : ""}`} disabled={ptSaving} onClick={() => submitPt(true)}>是</button>
            </span>
          )}
        </div>
      </section>

      {/* ========== SECTION GRID (4x2) ========== */}
      <section className="zc2-section">
        <div className="zc2-grid-head">
          <h2>分项明细</h2>
          <span className="zc2-grid-note">{sections.length} 个评测板块 · 每项独立核算</span>
        </div>
        <div className="zc2-cards">
          {sections.map((s, i) => {
            const IconComp = SECTION_ICONS[s.section]
            const max = s.max
            const progPct = max > 0 ? Math.min((s.score / max) * 100, 100) : 0
            const isLocked = s.locked
            const dataStatus = getDataStatus(s.section, s.status, isLocked)
            const chipText = getStatusText(s.section, s.status, isLocked)
            const sPct = s.section === "S"
              ? (weightedGPA > 0 ? (filledScoreCount / Math.max(courseCount, 1)) * 100 : 0)
              : progPct
            const tileContent = (
              <>
                <div className="zc2-tile-top">
                  <div className="zc2-tile-icon"><IconComp size={18} /></div>
                  <span className="zc2-tile-chip"><span className="zc2-lamp"></span>{chipText}</span>
                </div>
                <div className="zc2-tile-mid">
                  <h3 className="zc2-tile-name">{SECTION_LABELS[s.section]}</h3>
                  <p className="zc2-tile-reviewer">{SECTION_REVIEWERS[s.section]} · 负责</p>
                </div>
                <div className="zc2-tile-bottom">
                  <div className="zc2-tile-score">
                    {s.section === "S" ? (weightedGPA > 0 ? sScore.toFixed(2) : "--") : s.score.toFixed(2)}
                    {s.section !== "S" && <span className="zc2-max"> / {SECTION_MAX[s.section]}</span>}
                  </div>
                  <div className="zc2-tile-track">
                    <div className="zc2-tile-fill" style={{ width: `${sPct}%` }}></div>
                  </div>
                  {!viewingUserId && (
                    <div className="zc2-tile-hint">
                      {isLocked && <><Lock size={10} /> 暂未开放</>}
                      {!isLocked && s.section === "B" && s.status === "not_started" && <>待团支书填写</>}
                      {!isLocked && s.section === "B" && s.status === "approved" && <>团支书已上传</>}
                      {!isLocked && s.section === "C" && s.status === "not_started" && <>待生活委员评定</>}
                      {!isLocked && s.section === "C" && s.status !== "not_started" && <>生活委员已上传</>}
                      {!isLocked && s.section !== "B" && s.section !== "C" && s.status === "not_started" && <><PencilLine size={10} /> 立即填写</>}
                      {!isLocked && s.section !== "B" && s.section !== "C" && s.status === "draft" && <><PencilLine size={10} /> 继续编辑</>}
                      {!isLocked && s.section !== "B" && s.section !== "C" && s.status === "submitted" && <><ArrowRight size={10} /> 查看详情</>}
                      {!isLocked && s.section !== "B" && s.section !== "C" && s.status === "approved" && <>已通过审核</>}
                      {!isLocked && s.section !== "B" && s.section !== "C" && s.status === "returned" && <>修改重交</>}
                    </div>
                  )}
                </div>
              </>
            )
            if (isLocked || viewingUserId) {
              return (
                <div key={s.section} className="zc2-tile" data-status={dataStatus} style={{ "--i": i, cursor: "default", opacity: viewingUserId ? 0.85 : 0.55 } as CSSProperties}>
                  {tileContent}
                </div>
              )
            }
            return (
              <Link key={s.section} href={`/zongce/${s.section}`} className="zc2-tile" data-status={dataStatus} style={{ "--i": i, cursor: "pointer" } as CSSProperties}>
                {tileContent}
              </Link>
            )
          })}
          {/* 班委民主评议 — 第 8 格（所有同学可打分，互不可见；状态灯显示是否已打分） */}
          <Link href={`/zongce/committee?year=${year}`} className="zc2-tile" data-status={committeeDone ? "ok" : "none"} style={{ "--i": sections.length } as CSSProperties}>
            <div className="zc2-tile-top">
              <div className="zc2-tile-icon"><Trophy size={18} /></div>
              <span className="zc2-tile-chip"><span className="zc2-lamp"></span>{committeeDone ? "已打分" : "待打分"}</span>
            </div>
            <div className="zc2-tile-mid">
              <h3 className="zc2-tile-name">班委民主评议</h3>
            </div>
            <div className="zc2-tile-bottom">
              <span className="zc2-ghost-link">{committeeDone ? "查看报单" : "去打分"} <ChevronRight size={14} /></span>
            </div>
          </Link>
        </div>
      </section>

      {/* ========== 当前班级总排名（全班公开） ========== */}
      <section className="zc2-section">
        <div className="zc2-grid-head">
          <h2>当前班级总排名</h2>
          <span className="zc2-grid-note">全班公开</span>
        </div>
        <div className="zc2-rank">
          {!rankLoaded ? (
            <div className="zc2-rank-empty">榜单加载中…</div>
          ) : rankRows.length === 0 ? (
            <div className="zc2-rank-empty">暂无排名数据</div>
          ) : (
            <>
              <div className="zc2-rank-head">
                <span className="zc2-rank-cell zc2-rank-rank">名次</span>
                <span className="zc2-rank-cell zc2-rank-name">姓名</span>
                <span className="zc2-rank-cell zc2-rank-num">学业 S</span>
                <span className="zc2-rank-cell zc2-rank-num">品行 M</span>
                <span className="zc2-rank-cell zc2-rank-num zc2-rank-total">总分</span>
              </div>
              {rankRows.map((row, i) => {
                const isMe = row.id === session?.user?.id
                const mOpen = mExpandedId === row.id
                const shown = rankShowAll || i < 10 || isMe
                if (!shown) return null
                return (
                  <div key={row.id} className={`zc2-rank-row${isMe ? " zc2-rank-row--me" : ""}`}>
                    <div className="zc2-rank-main">
                      <span className="zc2-rank-cell zc2-rank-rank">
                        {i < 3 ? <span className="zc2-rank-medal" data-rank={i + 1}>{i + 1}</span> : <span className="zc2-rank-pos">{i + 1}</span>}
                      </span>
                      <span className="zc2-rank-cell zc2-rank-name">
                        <span className="zc2-rank-name-t">{row.name}</span>
                        {row.physicalTest === false && (
                          <span style={{ marginLeft: 6, padding: "1px 7px", borderRadius: 999, background: "rgba(196,97,90,.12)", color: "#C4615A", fontSize: 11, fontWeight: 600 }}>体测不合格</span>
                        )}
                        {isMe && <span className="zc2-rank-me">我</span>}
                        <span className="zc2-rank-sid">{row.studentId}</span>
                      </span>
                      <span className="zc2-rank-cell zc2-rank-num zc2-rank-s">{row.sScore.toFixed(1)}</span>
                      <button type="button" className={`zc2-rank-cell zc2-rank-num zc2-rank-m${mOpen ? " open" : ""}`} onClick={() => setMExpandedId(mOpen ? null : row.id)}>
                        {row.mScore.toFixed(1)}
                      </button>
                      <span className="zc2-rank-cell zc2-rank-num zc2-rank-total">{row.totalScore.toFixed(1)}</span>
                    </div>
                    {mOpen && (
                      <div className="zc2-rank-detail">
                        <span className="zc2-rank-sub zc2-rank-sub-sum" style={{ color: "var(--fg-2)", borderTop: "none", paddingTop: 0 }}>
                          <span>挂科情况</span>
                          <span style={{ color: ((row.failedCount ?? 0) + (row.failedPolicyCount ?? 0)) > 0 ? "#C4615A" : "#8A93A0" }}>
                            {((row.failedCount ?? 0) + (row.failedPolicyCount ?? 0)) > 0 ? `挂科 ${(row.failedCount ?? 0) + (row.failedPolicyCount ?? 0)} 门` : "无挂科"}
                          </span>
                        </span>
                        {["A", "B", "C", "D", "E", "F"].map(k => {
                          const sc = row.sectionScores.find(s => s.section === k)
                          const approved = sc?.status === "approved"
                          return (
                            <span key={k} className="zc2-rank-sub">
                              <span className="zc2-rank-sub-k">{k} {M_SECTION_LABELS[k]}</span>
                              <span className="zc2-rank-sub-v">{approved ? (sc?.score ?? 0).toFixed(2) : "—"}</span>
                            </span>
                          )
                        })}
                        <span className="zc2-rank-sub zc2-rank-sub-sum">
                          <span>品行合计 M</span>
                          <span>{row.mScore.toFixed(2)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
              {rankRows.length > 10 && (
                <button type="button" className="zc2-rank-more" onClick={() => setRankShowAll(v => !v)}>
                  {rankShowAll ? "收起榜单" : `展开全部 ${rankRows.length} 人`}
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {/* ========== 民主评议排行榜（全班公开） ========== */}
      <section className="zc2-section">
        <div className="zc2-grid-head">
          <h2>民主评议</h2>
          <span className="zc2-grid-note">仅统计普通同学投票 · 班委互评不计入</span>
        </div>
        <div className="zc2-rank">
          {!crLoaded ? (
            <div className="zc2-rank-empty">评议数据加载中…</div>
          ) : crRows.length === 0 ? (
            <div className="zc2-rank-empty">暂无评议数据</div>
          ) : (
            <>
              <div className="zc2-rank-head">
                <span className="zc2-rank-cell zc2-rank-rank">名次</span>
                <span className="zc2-rank-cell zc2-rank-name">班委</span>
                <span className="zc2-rank-cell zc2-rank-num">平均分</span>
                <span className="zc2-rank-cell zc2-rank-num zc2-rank-total">票数</span>
              </div>
              {crRows.map((m, i) => (
                <div key={m.name} className="zc2-rank-row">
                  <div className="zc2-rank-main">
                    <span className="zc2-rank-cell zc2-rank-rank">
                      {i < 3 ? <span className="zc2-rank-medal" data-rank={i + 1}>{i + 1}</span> : <span className="zc2-rank-pos">{i + 1}</span>}
                    </span>
                    <span className="zc2-rank-cell zc2-rank-name">
                      <span className="zc2-rank-name-t">{m.name}</span>
                      <span className="zc2-rank-sid">{m.role}</span>
                    </span>
                    <span className="zc2-rank-cell zc2-rank-num zc2-rank-m" style={{ color: m.avg != null ? "#C5855A" : "#A0A8B2", fontFamily: "Georgia, serif", fontSize: 15 }}>
                      {m.avg != null ? m.avg.toFixed(1) : "—"}
                    </span>
                    <span className="zc2-rank-cell zc2-rank-num zc2-rank-total" style={{ color: "#5B6675", background: "none" }}>{m.count}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {/* ========== REVIEW MANAGEMENT ========== */}
      {isManager && (
        <section className="zc2-section">
          <div className="zc2-grid-head">
            <h2>审核管理</h2>
            <span className="zc2-grid-note">各板块负责人 · 待办数</span>
          </div>
          <div className="zc2-review-grid">
            {(isAdmin || tags.includes("学习委员")) && (
              <Link href="/zongce/review-s" className="zc2-review-row" style={{ "--i": 0 } as CSSProperties}>
                <span className="zc2-rv-icon"><BookOpen size={17} /></span>
                <span className="zc2-rv-meta">
                  <span className="zc2-rv-name">S 学习成绩</span>
                  <span className="zc2-rv-who">学习委员</span>
                </span>
                <span className={pendingReviews.filter(r => r.section === "S").length > 0 ? "zc2-rv-badge" : "zc2-rv-badge zero"}>
                  {pendingReviews.filter(r => r.section === "S").length > 0 ? `${pendingReviews.filter(r => r.section === "S").length} 待办` : "已清空"}
                </span>
                <span className="zc2-rv-chev"><ChevronRight size={16} /></span>
              </Link>
            )}
            {(isAdmin || tags.includes("班长")) && (
              <Link href="/zongce/review-a" className="zc2-review-row" style={{ "--i": 1 } as CSSProperties}>
                <span className="zc2-rv-icon"><ClipboardCheck size={17} /></span>
                <span className="zc2-rv-meta">
                  <span className="zc2-rv-name">A 学风考勤</span>
                  <span className="zc2-rv-who">班长</span>
                </span>
                <span className={pendingReviews.filter(r => r.section === "A").length > 0 ? "zc2-rv-badge" : "zc2-rv-badge zero"}>
                  {pendingReviews.filter(r => r.section === "A").length > 0 ? `${pendingReviews.filter(r => r.section === "A").length} 待办` : "已清空"}
                </span>
                <span className="zc2-rv-chev"><ChevronRight size={16} /></span>
              </Link>
            )}
            {(isAdmin || tags.includes("团支书")) && (
              <Link href="/zongce/b-manage" className="zc2-review-row" style={{ "--i": 2 } as CSSProperties}>
                <span className="zc2-rv-icon"><Users size={17} /></span>
                <span className="zc2-rv-meta">
                  <span className="zc2-rv-name">B 集会政治学习</span>
                  <span className="zc2-rv-who">团支书</span>
                </span>
                <span className={pendingReviews.filter(r => r.section === "B").length > 0 ? "zc2-rv-badge" : "zc2-rv-badge zero"}>
                  {pendingReviews.filter(r => r.section === "B").length > 0 ? `${pendingReviews.filter(r => r.section === "B").length} 待办` : "已清空"}
                </span>
                <span className="zc2-rv-chev"><ChevronRight size={16} /></span>
              </Link>
            )}
            {(isAdmin || tags.includes("文体委员")) && (
              <Link href="/zongce/review-d" className="zc2-review-row" style={{ "--i": 3 } as CSSProperties}>
                <span className="zc2-rv-icon"><Music size={17} /></span>
                <span className="zc2-rv-meta">
                  <span className="zc2-rv-name">D 文体活动</span>
                  <span className="zc2-rv-who">文体委员</span>
                </span>
                <span className={pendingReviews.filter(r => r.section === "D").length > 0 ? "zc2-rv-badge" : "zc2-rv-badge zero"}>
                  {pendingReviews.filter(r => r.section === "D").length > 0 ? `${pendingReviews.filter(r => r.section === "D").length} 待办` : "已清空"}
                </span>
                <span className="zc2-rv-chev"><ChevronRight size={16} /></span>
              </Link>
            )}
            {(isAdmin || tags.includes("组织委员")) && (
              <Link href="/zongce/review-e" className="zc2-review-row" style={{ "--i": 4 } as CSSProperties}>
                <span className="zc2-rv-icon"><Heart size={17} /></span>
                <span className="zc2-rv-meta">
                  <span className="zc2-rv-name">E 社会实践公益</span>
                  <span className="zc2-rv-who">组织委员</span>
                </span>
                <span className={pendingReviews.filter(r => r.section === "E").length > 0 ? "zc2-rv-badge" : "zc2-rv-badge zero"}>
                  {pendingReviews.filter(r => r.section === "E").length > 0 ? `${pendingReviews.filter(r => r.section === "E").length} 待办` : "已清空"}
                </span>
                <span className="zc2-rv-chev"><ChevronRight size={16} /></span>
              </Link>
            )}
            {(isAdmin || tags.includes("班长")) && (
              <Link href="/zongce/review-f" className="zc2-review-row" style={{ "--i": 5 } as CSSProperties}>
                <span className="zc2-rv-icon"><Award size={17} /></span>
                <span className="zc2-rv-meta">
                  <span className="zc2-rv-name">F 奖惩附加</span>
                  <span className="zc2-rv-who">班长</span>
                </span>
                <span className={pendingReviews.filter(r => r.section === "F").length > 0 ? "zc2-rv-badge" : "zc2-rv-badge zero"}>
                  {pendingReviews.filter(r => r.section === "F").length > 0 ? `${pendingReviews.filter(r => r.section === "F").length} 待办` : "已清空"}
                </span>
                <span className="zc2-rv-chev"><ChevronRight size={16} /></span>
              </Link>
            )}
            {isManager && (
              <Link href="/zongce/photos" className="zc2-review-row zc2-photo-row" style={{ "--i": 6 } as CSSProperties}>
                <span className="zc2-rv-icon"><Images size={17} /></span>
                <span className="zc2-rv-meta">
                  <span className="zc2-rv-name">照片中心</span>
                  <span className="zc2-rv-who">佐证照片汇总 · 服务器状态</span>
                </span>
                <span className={photoCount > 0 ? "zc2-rv-badge" : "zc2-rv-badge zero"}>
                  {photoCount > 0 ? `${photoCount} 张` : "暂无照片"}
                </span>
                <span className="zc2-rv-chev"><ChevronRight size={16} /></span>
              </Link>
            )}
            {isAdmin && (
              <Link href="/zongce/unfilled" className="zc2-review-row" style={{ "--i": 8 } as CSSProperties}>
                <span className="zc2-rv-icon"><ListChecks size={17} /></span>
                <span className="zc2-rv-meta">
                  <span className="zc2-rv-name">未填写清单</span>
                  <span className="zc2-rv-who">各板块未填/待审名单 · 仅管理员</span>
                </span>
                <span className="zc2-rv-badge">查看</span>
                <span className="zc2-rv-chev"><ChevronRight size={16} /></span>
              </Link>
            )}
            {isManager && (
              <Link href="/zongce/physical-test" className="zc2-review-row" style={{ "--i": 9 } as CSSProperties}>
                <span className="zc2-rv-icon"><HeartPulse size={17} /></span>
                <span className="zc2-rv-meta">
                  <span className="zc2-rv-name">体测结果</span>
                  <span className="zc2-rv-who">全班体测填报汇总 · 班委可见</span>
                </span>
                <span className="zc2-rv-badge">查看</span>
                <span className="zc2-rv-chev"><ChevronRight size={16} /></span>
              </Link>
            )}
            {(isAdmin || tags.includes("班长") || tags.includes("团支书") || tags.includes("学习委员")) && (
              <Link href="/zongce/ranking" className="zc2-review-row" style={{ "--i": 10 } as CSSProperties}>
                <span className="zc2-rv-icon"><BarChart3 size={17} /></span>
                <span className="zc2-rv-meta">
                  <span className="zc2-rv-name">班级排名</span>
                  <span className="zc2-rv-who">全班排名总面板 · 班长/团支书/学委</span>
                </span>
                <span className="zc2-rv-badge">查看</span>
                <span className="zc2-rv-chev"><ChevronRight size={16} /></span>
              </Link>
            )}
          </div>
        </section>
      )}

            <footer className="zc2-foot">
        各板块由对应负责人维护
      </footer>

    </main>
    </div>
    </>
  )
}
