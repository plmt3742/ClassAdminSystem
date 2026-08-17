"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  BookOpen, ClipboardCheck, Users, Home, Music, Heart, Award, Trophy,
  ChevronRight, BarChart3, Images, ListChecks, Settings, FileText,
  Search, X, UserRound, Inbox, GraduationCap, CalendarRange, HeartPulse,
} from "lucide-react"
import MobTopBar from "../_components/MobTopBar"
import MobCard from "../_components/MobCard"
import MobChip from "../_components/MobChip"
import MobButton from "../_components/MobButton"
import MobBottomSheet from "../_components/MobBottomSheet"
import MobScoreRing from "../_components/MobScoreRing"
import MobListItem from "../_components/MobListItem"
import MobLoading from "../_components/MobLoading"
import MobAvatar from "../_components/MobAvatar"
import MobSegmented from "../_components/MobSegmented"
import MobYearBadge from "../_components/MobYearBadge"
import { useToast } from "../_components/MobToast"

const SECTION_ICONS: Record<string, typeof BookOpen> = {
  S: BookOpen, A: ClipboardCheck, B: Users,
  C: Home, D: Music, E: Heart, F: Award,
}
const SECTION_REVIEWERS: Record<string, string> = {
  S: "学习委员", A: "班长", B: "团支书", C: "生活委员", D: "文体委员", E: "组织委员", F: "班长",
}
const SECTION_MAX: Record<string, string> = { S: "130", A: "5", B: "2.5", C: "2.5", D: "5", E: "5", F: "10" }
const STATUS_TEXT: Record<string, string> = {
  not_started: "未填写", draft: "草稿", submitted: "待审核", approved: "已通过", returned: "已退回",
}
const STATUS_TONE: Record<string, "neutral" | "info" | "warn" | "ok" | "danger"> = {
  not_started: "neutral", draft: "info", submitted: "warn", approved: "ok", returned: "danger",
}

interface SectionItem {
  section: string
  label: string
  max: number
  reviewer: string
  icon: string
  status: string
  score: number
  data: Record<string, unknown>
  locked: boolean
}
interface PendingReview {
  id: string
  section: string
  sectionLabel: string
  userName: string
  userStudentId: string
  submittedAt: string
  status: string
}
interface StudentSummary {
  id: string
  name: string
  studentId: string
  role: string
  sScore: number
  mScore: number
  totalScore: number
  gpa: number
  statusCounts: Record<string, number>
  hasScores: boolean
  sectionCount: number
  approvedCount: number
  totalSections: number
}
interface MemberItem {
  id: string
  studentId: string
  name: string
  role: string
}

// 班级总排名（全班公开）
interface RankSectionScore { section: string; status: string; score: number }
interface RankCourseDetail { name: string; credits: number; semester: number; score: number | null; grade: string | null; gpa: number | null; repeat: boolean; failed: boolean }
interface RankRow {
  id: string
  name: string
  studentId: string
  physicalTest?: boolean | null
  gpa: number
  sScore: number
  mScore: number
  totalScore: number
  failedCount?: number
  failedPolicyCount?: number
  sectionScores: RankSectionScore[]
  sectionDetails: Record<string, Record<string, unknown>>
  coursesDetail: RankCourseDetail[]
}

// 排名报表用中文标签（与板块表单数据形状一致）
const D_TYPE_LABEL: Record<string, string> = {
  ceremony: "大型活动", team_unranked: "队伍参赛未获奖", performance: "文艺表演",
  rehearsal: "排练", sports: "阳光体育", sports_unranked: "运动会参与未获奖", award: "获奖项目",
}
const D_LEVEL_LABEL: Record<string, string> = { college: "院级", school: "校级", province: "省级", national: "国家级" }
const D_RANK_LABEL: Record<number, string> = { 1: "一等奖", 2: "二等奖", 3: "三等奖", 4: "第4-8名", 5: "其他" }
const F3_LEVEL_LABEL: Record<string, string> = { national: "国家级", province: "省级", city: "市级", school: "校级" }
const F4_TYPE_LABEL: Record<string, string> = { newspaper: "校报投稿", journal: "期刊论文", essay: "征文/课题", research: "课题调研", patent: "专利" }
const F5_LABEL: Record<string, string> = { "留校察看": "留校察看", "记过": "记过", "严重警告": "严重警告", "警告": "警告", "通报批评": "通报批评" }
const M_SECTION_LABELS: Record<string, string> = {
  A: "学风考勤", B: "集会政治学习", C: "星级宿舍", D: "文体活动", E: "社会实践", F: "奖惩附加",
}

const YEAR = "2025-2026"
const YEAR_OPTIONS = [
  { value: "2025-2026", label: "2025-2026 学年", open: true },
  { value: "2026-2027", label: "2026-2027 学年", open: false },
  { value: "2027-2028", label: "2027-2028 学年", open: false },
  { value: "2028-2029", label: "2028-2029 学年", open: false },
]

// ---------- 班级总排名组件 ----------
const MEDAL_COLORS = ["#C7924B", "#8A93A0", "#B08A5E"]
const asNum = (v: unknown): number => (typeof v === "number" ? v : 0)
const asBool = (v: unknown): boolean => v === true
const asStr = (v: unknown): string => (typeof v === "string" ? v : "")
const asArr = (v: unknown): Record<string, unknown>[] =>
  (Array.isArray(v) ? v.filter(x => x && typeof x === "object") : []) as Record<string, unknown>[]

/** 榜单行：名次 / 姓名 / 学业S / 品行M（可展开细项） / 总分（点击出报表） */
function RankLine({ row, rank, isMe, mExpanded, onToggleM }: {
  row: RankRow; rank: number; isMe?: boolean; mExpanded: boolean; onToggleM: () => void
}) {
  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: isMe ? "var(--primary-soft)" : undefined }}>
        <span style={{ width: 34, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          {rank <= 3 ? (
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: MEDAL_COLORS[rank - 1], color: "#fff", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-num)" }}>{rank}</span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>{rank}</span>
          )}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
            {isMe && <span style={{ flexShrink: 0 }}><MobChip tone="info">我</MobChip></span>}
          </span>
          <span style={{ display: "block", fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-num)", marginTop: 1 }}>{row.studentId}</span>
          {row.physicalTest === false && (
            <span style={{ display: "inline-block", marginTop: 3 }}><MobChip tone="danger">体测不合格</MobChip></span>
          )}
        </span>
        <span style={{ width: 44, textAlign: "right", fontSize: 13, fontFamily: "var(--font-num)", fontWeight: 600, color: "var(--zc-s)", flexShrink: 0 }}>{row.sScore.toFixed(1)}</span>
        <button type="button" onClick={onToggleM} aria-expanded={mExpanded}
          style={{ width: 44, textAlign: "right", fontSize: 13, fontFamily: "var(--font-num)", fontWeight: 700, color: mExpanded ? "var(--zc-m)" : "var(--fg-2)", flexShrink: 0, background: mExpanded ? "rgba(197,133,90,.12)" : "transparent", border: "none", borderRadius: 8, padding: "4px 6px", marginLeft: -6 }}>
          {row.mScore.toFixed(1)}
        </button>
        <span style={{ width: 52, textAlign: "right", fontSize: 14, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--primary)", flexShrink: 0 }}>
          {row.totalScore.toFixed(1)}
        </span>
      </div>
      {mExpanded && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "0 16px 12px", background: isMe ? "var(--primary-soft)" : "var(--surface-2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: 11.5, color: "var(--fg-2)", gridColumn: "1 / -1" }}>
            <span>挂科情况</span>
            <span style={{ fontFamily: "var(--font-num)", fontWeight: 700, color: ((row.failedCount ?? 0) + (row.failedPolicyCount ?? 0)) > 0 ? "var(--danger)" : "var(--fg-3)" }}>
              {((row.failedCount ?? 0) + (row.failedPolicyCount ?? 0)) > 0 ? `挂科 ${(row.failedCount ?? 0) + (row.failedPolicyCount ?? 0)} 门` : "无挂科"}
            </span>
          </div>
          {["A", "B", "C", "D", "E", "F"].map(k => {
            const sc = row.sectionScores.find(s => s.section === k)
            const approved = sc?.status === "approved"
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: 11.5, color: "var(--fg-2)" }}>
                <span>{k} {M_SECTION_LABELS[k]}</span>
                <span style={{ fontFamily: "var(--font-num)", fontWeight: 700, color: approved ? "var(--fg)" : "var(--fg-3)" }}>{approved ? (sc?.score ?? 0).toFixed(2) : "—"}</span>
              </div>
            )
          })}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: "var(--zc-m)", paddingTop: 4, borderTop: "1px dashed var(--border-strong)" }}>
            <span>品行合计 M</span>
            <span style={{ fontFamily: "var(--font-num)" }}>{row.mScore.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MobileZongceDashboard() {
  const { data: session, status } = useSession()
  const toast = useToast()

  const [yearSheetOpen, setYearSheetOpen] = useState(false)

  // 班级总排名（全班公开）
  const [rankRows, setRankRows] = useState<RankRow[]>([])
  const [rankLoaded, setRankLoaded] = useState(false)
  const [rankShowAll, setRankShowAll] = useState(false)
  const [mExpandedId, setMExpandedId] = useState<string | null>(null)

  // 民主评议排行榜（全班公开，仅计普通同学投票）
  const [crRows, setCrRows] = useState<{ name: string; role: string; count: number; avg: number | null }[]>([])
  const [crLoaded, setCrLoaded] = useState(false)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/ranking")
      .then(r => (r.ok ? r.json() : null))
      .then((d: { rows?: RankRow[] } | null) => {
        if (d?.rows) setRankRows(d.rows)
        setRankLoaded(true)
      })
      .catch(() => setRankLoaded(true))
  }, [status])

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/committee/public-ranking")
      .then(r => (r.ok ? r.json() : null))
      .then((d: { rows?: { name: string; role: string; count: number; avg: number | null }[] } | null) => {
        if (d?.rows) setCrRows(d.rows)
        setCrLoaded(true)
      })
      .catch(() => setCrLoaded(true))
  }, [status])

  const [loading, setLoading] = useState(true)

  // self / viewing-other data
  const [sScore, setSScore] = useState(0)
  const [mScore, setMScore] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [weightedGPA, setWeightedGPA] = useState(0)
  const [sections, setSections] = useState<SectionItem[]>([])
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([])
  const [courseCount, setCourseCount] = useState(0)
  const [filledScoreCount, setFilledScoreCount] = useState(0)
  const [allStudents, setAllStudents] = useState<MemberItem[]>([])
  const [viewingUser, setViewingUser] = useState<{ name: string; studentId: string; physicalTest?: boolean | null } | null>(null)
  const [viewingUserId, setViewingUserId] = useState("")
  const [committeeDone, setCommitteeDone] = useState(false)

  // 体测是否过关（学生自填）
  const [ptValue, setPtValue] = useState<boolean | null>(null)
  const [ptSaving, setPtSaving] = useState(false)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/me")
      .then(r => (r.ok ? r.json() : null))
      .then((d: { user?: { physicalTest?: boolean | null } } | null) => {
        setPtValue(d?.user?.physicalTest == null ? null : !!d.user.physicalTest)
      })
      .catch(() => {})
  }, [status])

  const submitPt = async (v: boolean) => {
    setPtSaving(true)
    try {
      const res = await fetch("/api/me/physical-test", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passed: v }),
      })
      if (res.ok) {
        setPtValue(v)
        toast.success(v ? "已记录：体测过关" : "已记录：体测未过关")
      } else {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || "保存失败")
      }
    } catch {
      toast.error("保存失败，请检查网络")
    } finally {
      setPtSaving(false)
    }
  }

  // student selector sheet
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [memberSearch, setMemberSearch] = useState("")
  const [membersLoading, setMembersLoading] = useState(false)

  const isAdmin = session?.user?.role === "admin"
  const tags = useMemo(() => session?.user?.tags ?? [], [session])

  // 待办审核按板块聚合（useMemo 置于所有早期 return 之前，保证 hooks 顺序稳定）
  const reviewBySection = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of pendingReviews) map.set(r.section, (map.get(r.section) || 0) + 1)
    return map
  }, [pendingReviews])

  // 班委民主评议状态灯
  useEffect(() => {
    if (status !== "authenticated") return
    fetch(`/api/zongce/committee?year=${YEAR}`)
      .then(r => r.json())
      .then(d => setCommitteeDone((d.submittedCount || 0) > 0))
      .catch(() => {})
  }, [status])

  const fetchDashboard = useCallback(async (userId?: string) => {
    let url = "/api/zongce/dashboard"
    if (userId) url = `/api/zongce/dashboard?userId=${userId}`
    try {
      const res = await fetch(url)
      if (!res.ok) return
      const d = await res.json()
      setSScore(d.sScore || 0)
      setMScore(d.mScore || 0)
      setTotalScore(d.totalScore || 0)
      setWeightedGPA(d.weightedGPA || 0)
      setSections(d.sections || [])
      setPendingReviews(d.pendingReviews || [])
      setCourseCount(d.courseCount || 0)
      setFilledScoreCount(d.filledScoreCount || 0)
      setAllStudents(d.allStudents || [])
      setViewingUser(d.viewingUser || null)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "authenticated") fetchDashboard()
  }, [status, fetchDashboard])

  const handleViewStudent = (userId: string) => {
    setViewingUserId(userId)
    fetchDashboard(userId)
  }
  const handleBackToSelf = () => {
    setViewingUserId("")
    setViewingUser(null)
    fetchDashboard()
  }
  const openSelector = async () => {
    setSelectorOpen(true)
    if (membersLoading) return
    setMembersLoading(true)
    try {
      const res = await fetch("/api/members")
      if (res.ok) {
        const d = await res.json()
        setAllStudents(d.members || [])
      }
    } catch {
      /* ignore */
    } finally {
      setMembersLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="mob-page">
        <MobTopBar title="综测" right={<MobYearBadge year={YEAR} />} />
        <MobLoading rows={6} />
      </div>
    )
  }
  if (!session) return null

  const filteredMembers = memberSearch.trim()
    ? allStudents.filter(m => m.name.includes(memberSearch.trim()) || m.studentId.includes(memberSearch.trim()))
    : allStudents

  const reviewTotal = pendingReviews.length
  const isManager = isAdmin || tags.length > 0

  // 管理工具入口（角色过滤）——与"参考"分区区分
  const manageEntries: { key: string; label: string; desc: string; icon: typeof BookOpen; href: string; show: boolean }[] = [
    { key: "ranking", label: "班级排名", desc: "全班总分排行", icon: BarChart3, href: "/m/zongce/ranking", show: isAdmin || tags.includes("班长") || tags.includes("团支书") || tags.includes("学习委员") },
    { key: "stats", label: "测评统计", desc: "班委民主评议汇总", icon: Trophy, href: "/m/zongce/committee-stats", show: isAdmin || tags.includes("班长") },
    { key: "photos", label: "照片中心", desc: "佐证照片汇总", icon: Images, href: "/m/zongce/photos", show: isManager },
    { key: "unfilled", label: "未填写名单", desc: "各板块未填名单", icon: ListChecks, href: "/m/zongce/unfilled", show: isAdmin },
    { key: "courses", label: "课程配置", desc: "本学年课程管理", icon: Settings, href: "/m/zongce/courses", show: isAdmin || tags.includes("学习委员") },
    { key: "physical-test", label: "体测结果", desc: "全班体测填报汇总", icon: HeartPulse, href: "/m/zongce/physical-test", show: isManager },
  ]
  const visibleManage = manageEntries.filter(e => e.show)
  // 参考入口（独立分区）
  const referenceEntries = [
    { key: "rules", label: "测评细则", desc: "综合测评评分细则全文", icon: FileText, href: "/m/zongce/rules" },
  ]

  // 我的排名（榜单中高亮）
  const myRankIndex = rankRows.findIndex(r => r.id === session?.user?.id)
  const myRank = myRankIndex >= 0 ? { row: rankRows[myRankIndex], rank: myRankIndex + 1 } : null

  const renderSectionTile = (s: SectionItem) => {
    const IconComp = SECTION_ICONS[s.section]
    const chipText = s.locked ? "暂未开放" : STATUS_TEXT[s.status] || "未填写"
    const tone = s.locked ? "neutral" : STATUS_TONE[s.status] || "neutral"
    const scoreText = s.section === "S" ? sScore.toFixed(2) : s.score.toFixed(2)
    return (
      <Link
        key={s.section}
        href={`/m/zongce/section/${s.section}`}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        <div style={{ background: "var(--surface)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: 14, minHeight: 118, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)" }}>
              <IconComp size={16} />
            </span>
            <MobChip tone={tone}>{chipText}</MobChip>
          </div>
          <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{s.label}</div>
          <div style={{ marginTop: 2, fontSize: 11, color: "var(--fg-3)" }}>{SECTION_REVIEWERS[s.section]} · 负责</div>
          <div style={{ marginTop: "auto", paddingTop: 8, display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--fg)" }}>{scoreText}</span>
            {s.section !== "S" && <span style={{ fontSize: 11, color: "var(--fg-3)" }}>/ {SECTION_MAX[s.section]}</span>}
          </div>
        </div>
      </Link>
    )
  }

  const renderCommitteeTile = () => (
    <Link href="/m/zongce/committee" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div style={{ background: "var(--surface)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: 14, minHeight: 118, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 9, background: "var(--primary-soft)", color: "var(--accent)" }}>
            <Trophy size={16} />
          </span>
          <MobChip tone={committeeDone ? "ok" : "neutral"}>{committeeDone ? "已打分" : "待打分"}</MobChip>
        </div>
        <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>班委民主评议</div>
        <div style={{ marginTop: 2, fontSize: 11, color: "var(--fg-3)" }}>全员匿名 · 互不可见</div>
        <div style={{ marginTop: "auto", paddingTop: 8, fontSize: 12, color: "var(--primary)" }}>{committeeDone ? "查看报单" : "去打分"}</div>
      </div>
    </Link>
  )

  return (
    <div className="mob-page" style={{ paddingBottom: 24 }}>
      <MobTopBar
        title="综测"
        icon={<GraduationCap size={17} />}
        right={
          <button
            type="button"
            onClick={() => setYearSheetOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              padding: "0 10px",
              borderRadius: 999,
              background: "var(--primary-soft)",
              color: "var(--primary)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <CalendarRange size={14} />
            {YEAR}
          </button>
        }
      />

      {/* 正在查看他人提示 */}
      {viewingUserId && viewingUser && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--primary-soft)", borderRadius: 12, padding: "10px 12px" }}>
          <UserRound size={16} style={{ color: "var(--primary)", flex: "none" }} />
          <span style={{ flex: 1, fontSize: 13, color: "var(--primary)", fontWeight: 600 }}>
            正在查看 {viewingUser.name}（{viewingUser.studentId}）
          </span>
          <MobButton size="sm" variant="soft" onClick={handleBackToSelf}>返回自己</MobButton>
        </div>
      )}

          {/* 个人综测报表入口 */}
          <Link href="/m/zongce/report" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <div style={{
              background: "var(--surface)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "18px 16px",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <span style={{
                width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                background: "var(--primary-soft)", color: "var(--primary)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <FileText size={20} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--fg)", letterSpacing: ".01em" }}>个人综测报表</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--fg-3)", marginTop: 3 }}>查看各板块得分与全部详细明细</span>
              </span>
              <ChevronRight size={18} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
            </div>
          </Link>

          {/* 总分 hero */}
          <MobCard padding>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--fg-3)", letterSpacing: "0.08em" }}>综测总分</div>
                <div key={totalScore.toFixed(2)} className="mob-num-pop" style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 700, lineHeight: 1.1, color: "var(--fg)" }}>
                  {totalScore.toFixed(2)}
                </div>
                <div style={{ marginTop: 2, fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>GPA {weightedGPA.toFixed(2)}</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <MobScoreRing value={sScore} max={130} label="S" tone="s" size="sm" />
                <MobScoreRing value={mScore} max={30} label="M" tone="m" size="sm" />
                <MobScoreRing value={totalScore} max={160} label="T" tone="t" size="sm" />
              </div>
            </div>
          </MobCard>

          {/* 体测是否过关（学生自填收集） */}
          <MobCard padding>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", flexShrink: 0 }}>
                <HeartPulse size={16} />
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>体测是否过关？</span>
              {viewingUserId ? (
                <MobChip tone={viewingUser?.physicalTest === true ? "ok" : viewingUser?.physicalTest === false ? "danger" : "neutral"}>
                  {viewingUser?.physicalTest == null ? "未填写" : viewingUser.physicalTest ? "过关" : "未过关"}
                </MobChip>
              ) : (
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    disabled={ptSaving}
                    onClick={() => submitPt(false)}
                    style={{
                      minWidth: 52, height: 34, borderRadius: 999, fontSize: 13, fontWeight: 600,
                      border: `1px solid ${ptValue === false ? "#C4615A" : "var(--border-strong)"}`,
                      background: ptValue === false ? "rgba(196,97,90,.12)" : "var(--surface)",
                      color: ptValue === false ? "var(--danger)" : "var(--fg-2)",
                    }}
                  >
                    否
                  </button>
                  <button
                    type="button"
                    disabled={ptSaving}
                    onClick={() => submitPt(true)}
                    style={{
                      minWidth: 52, height: 34, borderRadius: 999, fontSize: 13, fontWeight: 600,
                      border: `1px solid ${ptValue === true ? "#3E8E63" : "var(--border-strong)"}`,
                      background: ptValue === true ? "rgba(62,142,99,.12)" : "var(--surface)",
                      color: ptValue === true ? "var(--ok)" : "var(--fg-2)",
                    }}
                  >
                    是
                  </button>
                </div>
              )}
            </div>
          </MobCard>

          {/* 七大板块 + 民主评议 2 列网格 */}
          <MobCard title="分项明细" extra={<span style={{ fontSize: 12, color: "var(--fg-3)" }}>{sections.length} 个板块</span>} padding>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {sections.map(renderSectionTile)}
              {renderCommitteeTile()}
            </div>
          </MobCard>

          {/* 当前班级总排名（全班公开） */}
          <MobCard
            title="当前班级总排名"
            extra={rankLoaded && rankRows.length > 0 ? <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{rankRows.length} 人</span> : undefined}
            padding={false}
          >
            {!rankLoaded ? (
              <div style={{ padding: 16 }}><MobLoading rows={4} /></div>
            ) : rankRows.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--fg-3)" }}>暂无排名数据</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px 8px", fontSize: 11, color: "var(--fg-3)" }}>
                  <span style={{ width: 34, flexShrink: 0 }}>名次</span>
                  <span style={{ flex: 1 }}>姓名</span>
                  <span style={{ width: 44, textAlign: "right" }}>学业 S</span>
                  <span style={{ width: 44, textAlign: "right" }}>品行 M</span>
                  <span style={{ width: 52, textAlign: "right" }}>总分</span>
                </div>
                {myRank && <RankLine row={myRank.row} rank={myRank.rank} isMe mExpanded={mExpandedId === myRank.row.id} onToggleM={() => setMExpandedId(mExpandedId === myRank.row.id ? null : myRank.row.id)} />}
                {(rankShowAll ? rankRows : rankRows.slice(0, 10)).map((row, i) => {
                  if (myRank && row.id === myRank.row.id) return null
                  return (
                    <RankLine
                      key={row.id}
                      row={row}
                      rank={i + 1}
                      mExpanded={mExpandedId === row.id}
                      onToggleM={() => setMExpandedId(mExpandedId === row.id ? null : row.id)}
                     
                    />
                  )
                })}
                {rankRows.length > 10 && (
                  <button type="button" onClick={() => setRankShowAll(v => !v)} style={{ width: "100%", padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--primary)", background: "var(--surface-2)", border: "none", borderTop: "1px solid var(--border)" }}>
                    {rankShowAll ? "收起榜单" : `展开全部 ${rankRows.length} 人`}
                  </button>
                )}
              </>
            )}
          </MobCard>

          {/* 民主评议排行榜（全班公开，仅计普通同学投票） */}
          <MobCard
            title="民主评议"
            extra={crLoaded && crRows.length > 0 ? <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{crRows.length} 位班委</span> : undefined}
            padding={false}
          >
            {!crLoaded ? (
              <div style={{ padding: 16 }}><MobLoading rows={3} /></div>
            ) : crRows.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--fg-3)" }}>暂无评议数据</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px 8px", fontSize: 11, color: "var(--fg-3)" }}>
                  <span style={{ width: 30, flexShrink: 0 }}>名次</span>
                  <span style={{ flex: 1 }}>班委</span>
                  <span style={{ width: 52, textAlign: "right" }}>平均分</span>
                  <span style={{ width: 40, textAlign: "right" }}>票数</span>
                </div>
                {crRows.map((m, i) => (
                  <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
                    <span style={{ width: 30, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      {i < 3 ? (
                        <span style={{ width: 22, height: 22, borderRadius: "50%", background: ["#C7924B", "#8A93A0", "#B08A5E"][i], color: "#fff", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-num)" }}>{i + 1}</span>
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>{i + 1}</span>
                      )}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                      <span style={{ display: "block", fontSize: 11, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.role}</span>
                    </span>
                    <span style={{ width: 52, textAlign: "right", fontSize: 14, fontFamily: "var(--font-display)", fontWeight: 700, color: m.avg != null ? "var(--zc-m)" : "var(--fg-3)", flexShrink: 0 }}>
                      {m.avg != null ? m.avg.toFixed(1) : "—"}
                    </span>
                    <span style={{ width: 40, textAlign: "right", fontSize: 12, fontFamily: "var(--font-num)", color: "var(--fg-3)", flexShrink: 0 }}>{m.count}</span>
                  </div>
                ))}
                <div style={{ padding: "8px 16px 12px", fontSize: 11, color: "var(--fg-3)" }}>
                  仅统计普通同学投票 · 班委互评不计入
                </div>
              </>
            )}
          </MobCard>

          {/* 管理员查看同学 */}
          {isAdmin && (
            <MobCard padding={false}>
              <MobListItem
                icon={<UserRound size={20} />}
                title={viewingUser ? "切换查看同学" : "查看任意学生"}
                subtitle="以任意同学视角查看综测"
                chevron
                onClick={openSelector}
              />
            </MobCard>
          )}

          {/* 班委审核任务：有权限即常显，无待办时也可进入审核面板 */}
          {isManager && (
            <MobCard
              title="审核任务"
              extra={<Link href="/m/zongce/review" style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>进入审核</Link>}
              padding={false}
            >
              {reviewTotal === 0 ? (
                <Link href="/m/zongce/review" style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, background: "var(--surface-2)", color: "var(--fg-3)", flex: "none" }}>
                      <Inbox size={18} />
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: "var(--fg-3)" }}>暂无待审核内容</span>
                    <ChevronRight size={16} style={{ color: "var(--fg-3)" }} />
                  </div>
                </Link>
              ) : (
                Array.from(reviewBySection.entries()).map(([section, count]) => (
                  <Link key={section} href="/m/zongce/review" style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, background: "var(--primary-soft)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flex: "none" }}>
                        {section}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{pendingReviews.find(r => r.section === section)?.sectionLabel || section}</span>
                        <span style={{ display: "block", marginTop: 1, fontSize: 12, color: "var(--fg-3)" }}>{SECTION_REVIEWERS[section] || ""} · 待审核 {count} 份</span>
                      </span>
                      <MobChip tone="warn">{count} 待办</MobChip>
                      <ChevronRight size={16} style={{ color: "var(--fg-3)", flex: "none" }} />
                    </div>
                  </Link>
                ))
              )}
            </MobCard>
          )}

          {/* 管理工具入口 */}
          {visibleManage.length > 0 && (
            <MobCard title="管理工具" padding={false}>
              {visibleManage.map(e => (
                <Link key={e.key} href={e.href} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, background: "var(--primary-soft)", color: "var(--primary)", flex: "none" }}>
                      <e.icon size={18} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{e.label}</span>
                      <span style={{ display: "block", marginTop: 1, fontSize: 12, color: "var(--fg-3)" }}>{e.desc}</span>
                    </span>
                    <ChevronRight size={16} style={{ color: "var(--fg-3)", flex: "none" }} />
                  </div>
                </Link>
              ))}
            </MobCard>
          )}

          {/* 参考入口（独立分区） */}
          <MobCard title="参考" padding={false}>
            {referenceEntries.map(e => (
              <Link key={e.key} href={e.href} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, background: "var(--surface-2)", color: "var(--fg-2)", flex: "none" }}>
                    <e.icon size={18} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{e.label}</span>
                    <span style={{ display: "block", marginTop: 1, fontSize: 12, color: "var(--fg-3)" }}>{e.desc}</span>
                  </span>
                  <ChevronRight size={16} style={{ color: "var(--fg-3)", flex: "none" }} />
                </div>
              </Link>
            ))}
          </MobCard>

          

          <div style={{ textAlign: "center", padding: "10px 16px 0", fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.04em" }}>
            各板块由对应负责人维护
          </div>

      {/* 年份选择弹层 */}
      <MobBottomSheet open={yearSheetOpen} title="选择学年" onClose={() => setYearSheetOpen(false)}>
        {YEAR_OPTIONS.map(y => (
          <MobListItem
            key={y.value}
            icon={<CalendarRange size={20} style={{ color: y.open ? "var(--primary)" : "var(--fg-3)" }} />}
            title={y.label}
            subtitle={y.open ? "当前学年" : "尚未开放"}
            right={y.open ? <MobChip tone="ok">进行中</MobChip> : <MobChip tone="neutral">锁定</MobChip>}
            onClick={() => {
              setYearSheetOpen(false)
              if (!y.open) toast.toast(`${y.label}尚未开放，敬请期待`)
            }}
          />
        ))}
      </MobBottomSheet>

      {/* 学生选择器弹层 */}
      <MobBottomSheet open={selectorOpen} title="查看任意学生" onClose={() => setSelectorOpen(false)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 12px", height: 44 }}>
          <Search size={18} style={{ color: "var(--fg-3)", flex: "none" }} />
          <input
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            placeholder="搜索姓名或学号"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "var(--fg)", height: "100%" }}
          />
          {memberSearch && (
            <button type="button" onClick={() => setMemberSearch("")} aria-label="清空" style={{ color: "var(--fg-3)" }}>
              <X size={16} />
            </button>
          )}
        </div>
        <div style={{ marginTop: 8, maxHeight: "50vh", overflowY: "auto" }}>
          {membersLoading ? (
            <MobLoading rows={4} />
          ) : filteredMembers.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: "var(--fg-3)" }}>未找到匹配学生</div>
          ) : (
            filteredMembers.map(m => (
              <MobListItem
                key={m.id}
                icon={<MobAvatar name={m.name} size="sm" />}
                title={m.name}
                subtitle={m.studentId}
                chevron
                onClick={() => {
                  setSelectorOpen(false)
                  setMemberSearch("")
                  handleViewStudent(m.id)
                }}
              />
            ))
          )}
        </div>
      </MobBottomSheet>
    </div>
  )
}
