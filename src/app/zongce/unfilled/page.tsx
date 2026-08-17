"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toPng } from "html-to-image"
import {
  ArrowLeft, ShieldAlert, Download, BookOpen, ClipboardCheck, Users, Home, Music, Heart, Award, ListChecks, ChevronRight, AlertTriangle,
} from "lucide-react"

const SECTION_ICONS: Record<string, any> = {
  S: BookOpen, A: ClipboardCheck, B: Users, C: Home, D: Music, E: Heart, F: Award,
}

interface Person { name: string; studentId: string }
interface SectionGroup {
  section: string
  label: string
  reviewer: string
  total: number
  approvedCount: number
  approved: Person[]
  unfilled: Person[]
  notStartedCount: number
  draftCount: number
  submitted: Person[]
  returned: Person[]
}

type Filter = "all" | "approved" | "unfilled" | "submitted" | "returned" | "other"

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "approved", label: "已通过" },
  { key: "unfilled", label: "未填写" },
  { key: "submitted", label: "待审核" },
  { key: "returned", label: "已退回" },
  { key: "other", label: "其他" },
]

export default function UnfilledPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [sections, setSections] = useState<SectionGroup[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [filter, setFilter] = useState<Filter>("all")
  const [exporting, setExporting] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/unfilled")
      .then(async res => {
        if (res.status === 403) { setDenied(true); setLoading(false); return }
        if (res.ok) {
          const d = await res.json()
          setSections(d.sections || [])
          setTotalStudents(d.totalStudents || 0)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [status])

  // 导出为图片（html-to-image，2x 高清；容器自带边距避免四周被裁）
  const handleExport = async () => {
    const node = wrapRef.current
    if (!node || exporting) return
    setExporting(true)
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#F3F1EC",
        cacheBust: true,
      })
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `未填写清单-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
    } catch (e) {
      alert("导出失败，请重试")
      console.error("[unfilled export]", e)
    } finally {
      setExporting(false)
    }
  }

  if (status === "loading" || loading) return <p style={{ textAlign: "center", padding: 80, color: "#7A8A94" }}>加载中...</p>
  if (!session) return null

  if (denied) {
    return (
      <>
      <div className="m-page-root">
        <header className="m-topbar">
          <Link className="m-back" href="/zongce" aria-label="返回综测"><ArrowLeft size={18} /></Link>
          <span className="m-title">未填写清单<small>REPORT</small></span>
          <span className="m-year">2025-2026</span>
        </header>
        <div style={{ margin: "18px 16px 0", padding: "34px 24px", textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6 }}>
          <ShieldAlert size={28} style={{ color: "var(--color-danger)", marginBottom: 12 }} />
          <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6 }}>仅超级管理员可查看</div>
          <div style={{ fontSize: 11.5, color: "var(--color-muted)" }}>未填写清单仅对管理员开放</div>
        </div>
      </div>
      <div className="unfilled-desktop">
      <main className="zs-wrap">
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
        <div className="card" style={{ textAlign: "center", padding: "60px 40px", background: "#fff" }}>
          <ShieldAlert size={30} style={{ color: "#C4615A", marginBottom: 12 }} />
          <h2 style={{ marginBottom: 8, fontSize: "1.05rem" }}>仅超级管理员可查看</h2>
          <p style={{ color: "#7A8A94", fontSize: ".85rem" }}>未填写清单仅对管理员开放</p>
        </div>
      </main>
      </div>
      </>
    )
  }

  const totalPending = sections.reduce((s, x) => s + x.unfilled.length + x.submitted.length + x.returned.length, 0)

  // ===== 移动版（设计稿 unfilled.html · 真实 API，≤640px 显示） =====
  const SHORT_LABELS: Record<string, string> = {
    S: "S 成绩", A: "A 考勤", B: "B 集会", C: "C 宿舍", D: "D 文体", E: "E 实践", F: "F 奖惩",
  }
  const totalUnfilled = sections.reduce((s, g) => s + g.unfilled.length, 0)
  const mobileView = (
    <div className="m-page-root">
      <header className="m-topbar">
        <Link className="m-back" href="/zongce" aria-label="返回综测"><ArrowLeft size={18} /></Link>
        <span className="m-title">未填写清单<small>REPORT</small></span>
        <span className="m-year">2025-2026</span>
      </header>

      {/* 各板块未填人数统计（4 列网格） */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: "14px 16px 0" }}>
        {sections.map(g => (
          <div key={g.section} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "10px 4px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".14em", color: "var(--color-muted)" }}>{SHORT_LABELS[g.section] || g.section}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--color-danger)", marginTop: 2, lineHeight: 1.15 }}>{g.unfilled.length}</div>
          </div>
        ))}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "10px 4px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".14em", color: "var(--color-muted)" }}>合计</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--color-accent-hover)", marginTop: 2, lineHeight: 1.15 }}>{totalUnfilled}</div>
        </div>
      </div>

      {/* 注：仅管理员可见 */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10.5, color: "var(--color-muted)", padding: "12px 16px 0" }}>
        <AlertTriangle size={12} style={{ color: "var(--color-warning)", flex: "none" }} />
        <span>注：<b style={{ color: "var(--color-fg-secondary)", fontWeight: 600 }}>仅管理员可见</b> · 数据为实时查询 · 名单用于催填跟进</span>
      </div>

      {/* 分组明细（按板块 · 各展示前 3 条） */}
      {sections.map(g => (
        g.unfilled.length === 0 ? null : (
          <section key={g.section} style={{ padding: "18px 16px 0" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 9,
              fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700,
              letterSpacing: ".18em", textTransform: "uppercase", color: "var(--color-muted)",
            }}>
              {SHORT_LABELS[g.section] || g.section}<span style={{ color: "var(--color-muted-light)", letterSpacing: "0" }}>{g.label}</span>
              <span style={{ marginLeft: "auto", color: "var(--color-muted)", letterSpacing: "0" }}>{g.unfilled.length} 人</span>
            </div>
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "4px 16px 8px", marginTop: 8 }}>
              {g.unfilled.slice(0, 3).map(p => (
                <div key={p.studentId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 2px", borderBottom: "1px solid var(--color-border)" }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--color-fg)" }}>{p.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)", flex: "none" }}>{p.studentId}</span>
                  <span style={{ color: "var(--color-muted-light)", flex: "none", display: "flex" }}><ChevronRight size={11} /></span>
                </div>
              ))}
            </div>
          </section>
        )
      ))}

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        清单数据实时更新 · 催填通知通过班群发送<br /><b style={{ color: "var(--color-muted)", fontWeight: 600 }}>未填写清单</b> · 2025-2026 学年
      </div>
    </div>
  )

  // 名单渲染：姓名（学号）小标签
  const renderList = (list: Person[], empty: string) => (
    list.length === 0
      ? <span style={{ fontSize: ".7rem", color: "#B9C2CA" }}>{empty}</span>
      : <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {list.map(p => (
            <span key={p.studentId} style={{
              fontSize: ".68rem", padding: "2px 8px", border: "1px solid #E0E5EC", background: "#FAF9F6",
              color: "#4A5463", borderRadius: 4, whiteSpace: "nowrap",
            }}>
              {p.name}<span style={{ color: "#A8B4BD", fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".6rem", marginLeft: 4 }}>{p.studentId}</span>
            </span>
          ))}
        </div>
  )

  const showGroup = (g: SectionGroup, key: Exclude<Filter, "all" | "other">) =>
    filter === "all" || filter === key

  return (
    <>
    {mobileView}
    <div className="unfilled-desktop">
    <main className="zs-wrap" style={{ maxWidth: 920 }}>
      {/* 顶部：返回 + 导出 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <button className="zs-back" onClick={() => router.push("/zongce")} style={{ marginBottom: 0 }}><ArrowLeft size={15} /> 返回综测看板</button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="zs-btn zs-btn-pri"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px" }}
        >
          <Download size={14} /> {exporting ? "导出中..." : "导出为图片"}
        </button>
      </div>

      {/* 筛选栏 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: ".75rem", fontWeight: 600,
              border: `1.5px solid ${filter === f.key ? "#4A7C96" : "#E3E7EB"}`,
              background: filter === f.key ? "#EDF2F6" : "#fff",
              color: filter === f.key ? "#3D5A6E" : "#7A8A94",
              transition: "all .15s",
            }}
          >
            {f.label}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: ".7rem", color: "#7A8A94" }}>
          共 {totalStudents} 名同学 · {totalPending} 项待跟进
        </span>
      </div>

      <div ref={wrapRef} style={{ padding: 20, background: "#F3F1EC" }}>
        {/* 标题 */}
        <div className="zs-id" style={{ marginBottom: 16 }}>
          <div className="zs-id-avatar"><ListChecks size={17} /></div>
          <div className="zs-id-info">
            <div className="zs-id-name">未填写清单</div>
            <div className="zs-id-meta">
              <span>共 {totalStudents} 名同学 · {sections.length} 个板块</span>
              <span>{totalPending} 项待跟进</span>
            </div>
          </div>
          <span className="zs-id-badge">仅管理员可见</span>
        </div>

        {/* 各板块卡片 */}
        {sections.map(g => {
          const IconComp = SECTION_ICONS[g.section]
          const hasIssue = g.unfilled.length > 0 || g.returned.length > 0
          return (
            <div key={g.section} className="card" style={{ background: "#fff", padding: "16px 20px", marginBottom: 14 }}>
              {/* 板块头 */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <span style={{ width: 30, height: 30, borderRadius: 6, background: "#EBEFF5", color: "#2F5A75", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconComp size={15} />
                </span>
                <span style={{ fontWeight: 700, fontSize: ".92rem", color: "#26323C" }}>{g.section} {g.label}</span>
                <span style={{ fontSize: ".68rem", color: "#7A8A94" }}>{g.reviewer}负责</span>
                <span style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: ".66rem", padding: "2px 8px", borderRadius: 4, background: "#ECF7F1", color: "#3E8E63", border: "1px solid rgba(62,142,99,.25)" }}>已通过 {g.approvedCount}/{g.total}</span>
                  {hasIssue && <span style={{ fontSize: ".66rem", padding: "2px 8px", borderRadius: 4, background: "#FEF2F2", color: "#C4615A", border: "1px solid rgba(196,97,90,.25)" }}>需跟进 {g.unfilled.length + g.returned.length}</span>}
                </span>
              </div>

              {/* 分组名单（按筛选显示） */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {showGroup(g, "approved") && (
                  <div>
                    <div style={{ fontSize: ".68rem", fontWeight: 700, color: "#3E8E63", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3E8E63" }} /> 已通过（{g.approved.length}）
                    </div>
                    {renderList(g.approved, "无")}
                  </div>
                )}
                {showGroup(g, "unfilled") && (
                  <div>
                    <div style={{ fontSize: ".68rem", fontWeight: 700, color: "#C4615A", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C4615A" }} /> 未填写（{g.unfilled.length}）
                      {g.draftCount > 0 && <span style={{ fontSize: ".58rem", fontWeight: 400, color: "#A8B4BD" }}>含草稿 {g.draftCount}</span>}
                    </div>
                    {renderList(g.unfilled, "全部已填写")}
                  </div>
                )}
                {showGroup(g, "submitted") && (
                  <div>
                    <div style={{ fontSize: ".68rem", fontWeight: 700, color: "#C7924B", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C7924B" }} /> 待审核（{g.submitted.length}）
                    </div>
                    {renderList(g.submitted, "无待审核")}
                  </div>
                )}
                {showGroup(g, "returned") && (
                  <div>
                    <div style={{ fontSize: ".68rem", fontWeight: 700, color: "#C4615A", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C4615A" }} /> 已退回（{g.returned.length}）
                    </div>
                    {renderList(g.returned, "无退回")}
                  </div>
                )}
                {filter === "other" && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span style={{ fontSize: ".72rem", color: "#A8B4BD" }}>无其他状态（已通过 / 未填写 / 待审核 / 已退回 之外的记录）</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ marginTop: 8, fontSize: ".7rem", color: "#A8B4BD", textAlign: "center" }}>
        未填写 = 尚未开始或草稿未提交 · 待审核 = 已提交待班委审核 · 已退回 = 需修改后重新提交
      </p>
    </main>
    </div>
    </>
  )
}
