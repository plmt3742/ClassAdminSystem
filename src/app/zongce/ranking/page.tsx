"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ShieldAlert, Trophy, X, BookOpen, Users, AlertTriangle } from "lucide-react"

interface SectionScore { section: string; status: string; score: number }
interface CourseDetail { name: string; credits: number; semester: number; score: number | null; grade: string | null; gpa: number | null; repeat: boolean; failed: boolean }
interface Row {
  id: string; name: string; studentId: string
  gpa: number; sScore: number; mScore: number; totalScore: number
  failedCount: number; failedPolicyCount: number; repeatCount: number
  approvedCount: number; totalSections: number
  sectionScores: SectionScore[]
  coursesDetail: CourseDetail[]
  filledCount: number; courseTotal: number
}

const SECTION_LABELS: Record<string, string> = { S: "学习成绩", A: "学风考勤", B: "集会政治学习", C: "星级宿舍", D: "文体活动", E: "社会实践", F: "奖惩附加" }
const STATUS_LABEL: Record<string, string> = { not_started: "未填写", draft: "草稿", submitted: "待审核", approved: "已通过", returned: "已退回" }
const STATUS_COLOR: Record<string, string> = { approved: "#5A8C6F", submitted: "#C7924B", returned: "#C4615A", draft: "#8A93A0", not_started: "#B6BDC8" }

export default function RankingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [stats, setStats] = useState({ totalStudents: 0, avgTotal: 0, maxTotal: 0, totalFailed: 0 })
  const [detail, setDetail] = useState<Row | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/ranking")
      .then(async res => {
        if (res.status === 403) { setDenied(true); setLoading(false); return }
        if (res.ok) {
          const d = await res.json()
          setRows(d.rows || [])
          setStats({ totalStudents: d.totalStudents || 0, avgTotal: d.avgTotal || 0, maxTotal: d.maxTotal || 0, totalFailed: d.totalFailed || 0 })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [status])

  if (status === "loading" || loading) return <p style={{ textAlign: "center", padding: 80, color: "#8A93A0" }}>加载中...</p>
  if (!session) return null

  if (denied) {
    return (
      <main className="zs-wrap">
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
        <div className="card" style={{ textAlign: "center", padding: "60px 40px", background: "#fff" }}>
          <ShieldAlert size={30} style={{ color: "#C4615A", marginBottom: 12 }} />
          <h2 style={{ marginBottom: 8, fontSize: "1.05rem" }}>无权查看</h2>
          <p style={{ color: "#8A93A0", fontSize: ".85rem" }}>班级排名总面板仅管理员、班长、团支书、学习委员可见</p>
        </div>
      </main>
    )
  }

  // 排名颜色：前 3 名主色，其余灰
  const rankColor = (i: number) => (i === 0 ? "#3B6B8A" : i === 1 ? "#4A7C96" : i === 2 ? "#5B8E9E" : "#8A93A0")

  const renderCourseTable = (d: Row) => (
    <div>
      {[1, 2].map(sem => {
        const list = d.coursesDetail.filter(c => c.semester === sem)
        if (list.length === 0) return null
        return (
          <div key={sem} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#3B6B8A", marginBottom: 6 }}>第{sem === 1 ? "一" : "二"}学期（{list.length} 门）</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".76rem" }}>
              <thead>
                <tr style={{ background: "#F7F9FB" }}>
                  {["课程", "学分", "成绩", "绩点"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600, color: "#8A93A0", fontSize: ".62rem" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((c, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #F0F2F5", background: c.failed ? "#FDF6F5" : undefined }}>
                    <td style={{ padding: "6px 10px", fontWeight: 500 }}>
                      {c.name}
                      {c.repeat && <span style={{ marginLeft: 6, fontSize: ".58rem", fontWeight: 700, color: "#C7924B", background: "#FDF5EA", border: "1px solid rgba(199,146,75,.35)", padding: "1px 6px", borderRadius: 4 }}>重修</span>}
                      {c.failed && <span style={{ marginLeft: 6, fontSize: ".58rem", fontWeight: 700, color: "#C4615A", background: "#FEF2F2", border: "1px solid rgba(196,97,90,.3)", padding: "1px 6px", borderRadius: 4 }}>挂科</span>}
                    </td>
                    <td style={{ padding: "6px 10px", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".7rem", color: "#8A93A0" }}>{c.credits}</td>
                    <td style={{ padding: "6px 10px", fontFamily: "'JetBrains Mono',Consolas,monospace", fontWeight: 600, color: c.failed ? "#C4615A" : "#1A1D22" }}>{c.score != null ? c.score : (c.grade || "—")}</td>
                    <td style={{ padding: "6px 10px", fontFamily: "'JetBrains Mono',Consolas,monospace", color: c.gpa != null ? "#3B6B8A" : "#B6BDC8" }}>{c.gpa != null ? c.gpa.toFixed(2) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )

  return (
    <main className="zs-wrap" style={{ maxWidth: 980 }}>
      <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>

      {/* 标题 */}
      <div className="zs-id" style={{ marginBottom: 16 }}>
        <div className="zs-id-avatar"><Trophy size={18} /></div>
        <div className="zs-id-info">
          <div className="zs-id-name">班级排名总面板</div>
          <div className="zs-id-meta">
            <span><Users size={11} /> {stats.totalStudents} 名学生</span>
            <span>最高 {stats.maxTotal.toFixed(2)} · 平均 {stats.avgTotal.toFixed(2)}</span>
            <span><AlertTriangle size={11} /> 挂科 {stats.totalFailed} 门</span>
          </div>
        </div>
        <span className="zs-id-badge">管理·班长·团支书·学委</span>
      </div>

      {/* 排名列表 */}
      <div className="card" style={{ padding: 0, overflow: "hidden", overflowX: "auto", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".8rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #E0E5EC", background: "#F7F9FB" }}>
              {["排名", "姓名", "学号", "GPA", "S 得分", "M 得分", "总分", "已通过", "挂科", "重修"].map(h => (
                <th key={h} style={{ textAlign: h === "姓名" || h === "学号" ? "left" : "center", padding: "10px 10px", fontWeight: 600, color: "#8A93A0", fontSize: ".62rem", letterSpacing: ".06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} onClick={() => setDetail(r)} style={{ borderBottom: "1px solid #F0F2F5", cursor: "pointer", transition: "background .1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F7F9FB"}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ padding: "9px 10px", textAlign: "center", fontFamily: "'JetBrains Mono',Consolas,monospace", fontWeight: 700, color: rankColor(i), fontSize: ".85rem" }}>{i + 1}</td>
                <td style={{ padding: "9px 10px", fontWeight: 600, color: "#1A1D22" }}>{r.name}</td>
                <td style={{ padding: "9px 10px", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".72rem", color: "#8A93A0" }}>{r.studentId}</td>
                <td style={{ padding: "9px 10px", textAlign: "center", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".76rem", color: r.gpa > 0 ? "#3B6B8A" : "#B6BDC8" }}>{r.gpa > 0 ? r.gpa.toFixed(2) : "—"}</td>
                <td style={{ padding: "9px 10px", textAlign: "center", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".76rem", color: r.sScore > 0 ? "#1A1D22" : "#B6BDC8" }}>{r.sScore > 0 ? r.sScore.toFixed(2) : "—"}</td>
                <td style={{ padding: "9px 10px", textAlign: "center", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".76rem", color: r.mScore > 0 ? "#1A1D22" : "#B6BDC8" }}>{r.mScore > 0 ? r.mScore.toFixed(2) : "—"}</td>
                <td style={{ padding: "9px 10px", textAlign: "center", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".85rem", fontWeight: 700, color: r.totalScore > 0 ? "#3B6B8A" : "#B6BDC8" }}>{r.totalScore > 0 ? r.totalScore.toFixed(2) : "—"}</td>
                <td style={{ padding: "9px 10px", textAlign: "center", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".72rem", color: "#8A93A0" }}>{r.approvedCount}/{r.totalSections}</td>
                <td style={{ padding: "9px 10px", textAlign: "center" }}>
                  {r.failedCount + r.failedPolicyCount > 0
                    ? <span style={{ fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".7rem", fontWeight: 700, color: "#C4615A", background: "#FEF2F2", border: "1px solid rgba(196,97,90,.3)", padding: "1px 7px", borderRadius: 4 }}>{r.failedCount + r.failedPolicyCount}</span>
                    : <span style={{ color: "#B6BDC8" }}>—</span>}
                </td>
                <td style={{ padding: "9px 10px", textAlign: "center" }}>
                  {r.repeatCount > 0
                    ? <span style={{ fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".7rem", fontWeight: 700, color: "#3B6B8A", background: "#EBEFF5", border: "1px solid rgba(59,107,138,.3)", padding: "1px 7px", borderRadius: 4 }}>{r.repeatCount}</span>
                    : <span style={{ color: "#B6BDC8" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 10, fontSize: ".7rem", color: "#B6BDC8", textAlign: "center" }}>点击任意学生行查看全部详细情况（含各板块得分与课程成绩明细）</p>

      {/* 详情弹层 */}
      {detail && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(20,25,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setDetail(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "min(760px, 100%)", maxHeight: "88vh", overflowY: "auto", background: "#fff",
            borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,.25)", padding: "22px 26px",
          }}>
            {/* 头部 */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#EBEFF5", border: "2px solid #3B6B8A", color: "#3B6B8A", fontFamily: "Georgia,'Songti SC',serif", fontWeight: 700, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{detail.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>{detail.name}</div>
                <div style={{ fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".72rem", color: "#8A93A0", marginTop: 3 }}>{detail.studentId}</div>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: "1.3rem", fontWeight: 700, color: "#3B6B8A" }}>{detail.totalScore > 0 ? detail.totalScore.toFixed(2) : "—"}<small style={{ fontSize: ".7rem", color: "#B6BDC8" }}>/130</small></span>
              <button onClick={() => setDetail(null)} style={{ width: 34, height: 34, borderRadius: 6, border: "1px solid #E0E5EC", background: "#fff", color: "#4A5463", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><X size={16} /></button>
            </div>

            {/* 统计条 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {[
                { k: "GPA", v: detail.gpa > 0 ? detail.gpa.toFixed(2) : "—" },
                { k: "S 得分", v: detail.sScore > 0 ? detail.sScore.toFixed(2) : "—" },
                { k: "M 得分", v: detail.mScore > 0 ? detail.mScore.toFixed(2) : "—" },
                { k: "挂科", v: String(detail.failedCount + detail.failedPolicyCount), danger: detail.failedCount + detail.failedPolicyCount > 0 },
                { k: "重修", v: String(detail.repeatCount), info: detail.repeatCount > 0 },
                { k: "成绩已填", v: `${detail.filledCount}/${detail.courseTotal}` },
              ].map(s => (
                <div key={s.k} style={{ flex: 1, minWidth: 90, textAlign: "center", background: "#F7F9FB", border: "1px solid #E0E5EC", borderRadius: 6, padding: "9px 4px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: "1rem", fontWeight: 700, color: s.danger ? "#C4615A" : s.info ? "#C7924B" : "#3B6B8A" }}>{s.v}</div>
                  <div style={{ fontSize: ".62rem", color: "#8A93A0", marginTop: 2, letterSpacing: ".06em" }}>{s.k}</div>
                </div>
              ))}
            </div>

            {/* 板块得分 */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#3B6B8A", marginBottom: 6 }}>综测板块（{detail.approvedCount}/{detail.totalSections} 已通过）</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6 }}>
                {detail.sectionScores.map(s => (
                  <div key={s.section} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#F7F9FB", border: "1px solid #E0E5EC", borderRadius: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[s.status] || "#B6BDC8", flex: "none" }} />
                    <span style={{ fontSize: ".72rem", fontWeight: 600, flex: 1 }}>{s.section} {SECTION_LABELS[s.section]}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".72rem", fontWeight: 700, color: s.score > 0 ? "#1A1D22" : "#B6BDC8" }}>{s.section === "S" ? (detail.sScore > 0 ? detail.sScore.toFixed(2) : "—") : s.score.toFixed(2)}</span>
                    <span style={{ fontSize: ".58rem", color: STATUS_COLOR[s.status] || "#B6BDC8" }}>{STATUS_LABEL[s.status] || "未填写"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 课程成绩 */}
            <div>
              <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#3B6B8A", marginBottom: 6 }}>课程成绩明细（{detail.filledCount}/{detail.courseTotal} 已填）</div>
              {renderCourseTable(detail)}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
