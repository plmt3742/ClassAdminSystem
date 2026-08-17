"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Trophy, Users, AlertTriangle, ShieldAlert } from "lucide-react"
import MobTopBar from "../../_components/MobTopBar"
import MobCard from "../../_components/MobCard"
import MobChip from "../../_components/MobChip"
import MobBottomSheet from "../../_components/MobBottomSheet"
import MobEmpty from "../../_components/MobEmpty"
import MobLoading from "../../_components/MobLoading"
import MobAvatar from "../../_components/MobAvatar"
import MobRoleGate from "../../_components/MobRoleGate"
import MobYearBadge from "../../_components/MobYearBadge"

interface SectionScore { section: string; status: string; score: number }
interface CourseDetail {
  name: string; credits: number; semester: number; score: number | null
  grade: string | null; gpa: number | null; repeat: boolean; failed: boolean
}
interface Row {
  id: string; name: string; studentId: string
  gpa: number; sScore: number; mScore: number; totalScore: number
  failedCount: number; failedPolicyCount: number; repeatCount: number
  approvedCount: number; totalSections: number
  sectionScores: SectionScore[]
  coursesDetail: CourseDetail[]
  filledCount: number; courseTotal: number
}

const SECTION_LABELS: Record<string, string> = {
  S: "学习成绩", A: "学风考勤", B: "集会政治学习", C: "星级宿舍", D: "文体活动", E: "社会实践", F: "奖惩附加",
}
const STATUS_LABEL: Record<string, string> = {
  not_started: "未填写", draft: "草稿", submitted: "待审核", approved: "已通过", returned: "已退回",
}
const STATUS_TONE: Record<string, "neutral" | "info" | "warn" | "ok" | "danger"> = {
  approved: "ok", submitted: "warn", returned: "danger", draft: "info", not_started: "neutral",
}
const YEAR = "2025-2026"

function rankColor(i: number): string {
  if (i === 0) return "#3B6B8A"
  if (i === 1) return "#4A7C96"
  if (i === 2) return "#5B8E9E"
  return "#8A93A0"
}

export default function MobileRankingPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [stats, setStats] = useState({ totalStudents: 0, avgTotal: 0, maxTotal: 0, totalFailed: 0 })
  const [detail, setDetail] = useState<Row | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/ranking")
      .then(async res => {
        if (res.ok) {
          const d = await res.json()
          setRows(d.rows || [])
          setStats({
            totalStudents: d.totalStudents || 0,
            avgTotal: d.avgTotal || 0,
            maxTotal: d.maxTotal || 0,
            totalFailed: d.totalFailed || 0,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  if (status === "loading" || loading) {
    return (
      <div className="mob-page">
        <MobTopBar back title="班级排名" right={<MobYearBadge year={YEAR} />} />
        <MobLoading rows={8} />
      </div>
    )
  }
  if (!session) return null

  const deny = (
    <div className="mob-page">
      <MobTopBar back title="班级排名" right={<MobYearBadge year={YEAR} />} />
      <MobEmpty icon={<ShieldAlert size={28} />} title="无权限" desc="班级排名总面板仅管理员、班长、团支书、学习委员可见" />
    </div>
  )

  return (
    <MobRoleGate allowedRoles={["admin"]} allowedTags={["班长", "团支书", "学习委员"]} fallback={deny}>
      <div className="mob-page" style={{ paddingBottom: 24 }}>
        <MobTopBar back title="班级排名" right={<MobYearBadge year={YEAR} />} />

        {/* 统计头部 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          <StatTile label="参与学生" value={String(stats.totalStudents)} suffix="名" icon={<Users size={14} />} />
          <StatTile label="最高总分" value={stats.maxTotal.toFixed(2)} suffix="" icon={<Trophy size={14} />} />
          <StatTile label="平均总分" value={stats.avgTotal.toFixed(2)} suffix="" icon={<Trophy size={14} />} />
          <StatTile label="挂科门数" value={String(stats.totalFailed)} suffix="门" danger={stats.totalFailed > 0} icon={<AlertTriangle size={14} />} />
        </div>

        {/* 排名列表 */}
        <MobCard padding={false}>
          {/* 吸顶列头 */}
          <div style={{ position: "sticky", top: 52, zIndex: 5, display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "var(--surface-2)", borderBottom: "1px solid var(--border-strong)" }}>
            <span style={{ width: 32, flex: "none", fontSize: 11, fontWeight: 700, color: "var(--fg-3)" }}>排名</span>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "var(--fg-3)" }}>姓名 / 学号</span>
            <span style={{ width: 40, textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--zc-s)", flex: "none" }}>S</span>
            <span style={{ width: 40, textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--zc-m)", flex: "none" }}>M</span>
            <span style={{ width: 48, textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--zc-t)", flex: "none" }}>总分</span>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--fg-3)" }}>暂无排名数据</div>
          ) : (
            rows.map((r, i) => (
              <div
                key={r.id}
                onClick={() => setDetail(r)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderTop: "1px solid var(--border)", cursor: "pointer" }}
              >
                <span style={{ width: 32, flex: "none", fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: rankColor(i) }}>{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                  <span style={{ display: "block", marginTop: 1, fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>{r.studentId}</span>
                </span>
                <span style={{ width: 40, textAlign: "center", fontSize: 12, fontFamily: "var(--font-num)", color: r.sScore > 0 ? "var(--fg-2)" : "var(--fg-3)", flex: "none" }}>{r.sScore > 0 ? r.sScore.toFixed(1) : "—"}</span>
                <span style={{ width: 40, textAlign: "center", fontSize: 12, fontFamily: "var(--font-num)", color: r.mScore > 0 ? "var(--fg-2)" : "var(--fg-3)", flex: "none" }}>{r.mScore > 0 ? r.mScore.toFixed(1) : "—"}</span>
                <span style={{ width: 48, textAlign: "right", fontSize: 15, fontWeight: 700, fontFamily: "var(--font-display)", color: r.totalScore > 0 ? "var(--fg)" : "var(--fg-3)", flex: "none" }}>{r.totalScore > 0 ? r.totalScore.toFixed(1) : "—"}</span>
              </div>
            ))
          )}
        </MobCard>

        <div style={{ textAlign: "center", padding: "6px 16px 0", fontSize: 11, color: "var(--fg-3)" }}>
          点击学生行查看详细成绩明细
        </div>
      </div>

      {/* 详情弹层 */}
      <MobBottomSheet open={detail !== null} title="学生详情" onClose={() => setDetail(null)}>
        {detail && <DetailContent row={detail} />}
      </MobBottomSheet>
    </MobRoleGate>
  )
}

function StatTile({ label, value, suffix, icon, danger = false }: { label: string; value: string; suffix: string; icon: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-3)" }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ marginTop: 6, fontFamily: "var(--font-num)", fontSize: 20, fontWeight: 700, color: danger ? "var(--danger)" : "var(--fg)", lineHeight: 1.1 }}>
        {value}
        {suffix ? <span style={{ fontSize: 12, color: "var(--fg-3)", fontWeight: 400, marginLeft: 2 }}>{suffix}</span> : null}
      </div>
    </div>
  )
}

function DetailContent({ row }: { row: Row }) {
  const failedTotal = row.failedCount + row.failedPolicyCount
  return (
    <div>
      {/* 头部 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <MobAvatar name={row.name} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>{row.name}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>{row.studentId}</div>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--zc-t)" }}>{row.totalScore.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: "var(--fg-3)" }}>/130</div>
        </div>
      </div>

      {/* 统计条 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
        <MiniStat k="GPA" v={row.gpa > 0 ? row.gpa.toFixed(2) : "—"} />
        <MiniStat k="S 得分" v={row.sScore > 0 ? row.sScore.toFixed(2) : "—"} />
        <MiniStat k="M 得分" v={row.mScore > 0 ? row.mScore.toFixed(2) : "—"} />
        <MiniStat k="挂科" v={String(failedTotal)} danger={failedTotal > 0} />
        <MiniStat k="重修" v={String(row.repeatCount)} accent={row.repeatCount > 0} />
        <MiniStat k="成绩已填" v={`${row.filledCount}/${row.courseTotal}`} />
      </div>

      {/* 板块得分 */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-2)", marginBottom: 8 }}>
          综测板块（{row.approvedCount}/{row.totalSections} 已通过）
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {row.sectionScores.map(s => (
            <div key={s.section} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", flex: "none" }}>{s.section}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{SECTION_LABELS[s.section]}</span>
              <span style={{ fontSize: 12, fontFamily: "var(--font-num)", fontWeight: 700, color: s.score > 0 ? "var(--fg)" : "var(--fg-3)", flex: "none" }}>
                {s.section === "S" ? (row.sScore > 0 ? row.sScore.toFixed(1) : "—") : s.score.toFixed(1)}
              </span>
              <MobChip tone={STATUS_TONE[s.status] || "neutral"}>{STATUS_LABEL[s.status] || "未填写"}</MobChip>
            </div>
          ))}
        </div>
      </div>

      {/* 课程成绩 */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-2)", marginBottom: 8 }}>
          课程成绩明细（{row.filledCount}/{row.courseTotal} 已填）
        </div>
        {[1, 2].map(sem => {
          const list = row.coursesDetail.filter(c => c.semester === sem)
          if (list.length === 0) return null
          return (
            <div key={sem} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", marginBottom: 6 }}>第{sem === 1 ? "一" : "二"}学期（{list.length} 门）</div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                {list.map((c, ci) => (
                  <div key={ci} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderTop: ci === 0 ? "none" : "1px solid var(--border)", background: c.failed ? "rgba(196,97,90,0.06)" : "transparent" }}>
                    <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                      {c.repeat && <MobChip tone="warn">重修</MobChip>}
                      {c.failed && <MobChip tone="danger">挂科</MobChip>}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-num)", flex: "none" }}>{c.credits}学分</span>
                    <span style={{ width: 44, textAlign: "right", fontSize: 13, fontFamily: "var(--font-num)", fontWeight: 600, color: c.failed ? "var(--danger)" : "var(--fg)", flex: "none" }}>
                      {c.score != null ? c.score : (c.grade || "—")}
                    </span>
                    <span style={{ width: 36, textAlign: "right", fontSize: 12, fontFamily: "var(--font-num)", color: c.gpa != null ? "var(--primary)" : "var(--fg-3)", flex: "none" }}>
                      {c.gpa != null ? c.gpa.toFixed(1) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MiniStat({ k, v, danger = false, accent = false }: { k: string; v: string; danger?: boolean; accent?: boolean }) {
  const color = danger ? "var(--danger)" : accent ? "var(--accent)" : "var(--primary)"
  return (
    <div style={{ textAlign: "center", background: "var(--surface-2)", borderRadius: 10, padding: "9px 4px" }}>
      <div style={{ fontFamily: "var(--font-num)", fontSize: 15, fontWeight: 700, color }}>{v}</div>
      <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2, letterSpacing: "0.04em" }}>{k}</div>
    </div>
  )
}
