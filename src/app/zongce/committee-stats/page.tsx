"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trophy, Users, ShieldAlert, History, Table2, BarChart3, UserX, ChevronRight } from "lucide-react"
import { DEFAULT_YEAR, RATING_MAX } from "@/lib/committee"

interface Row {
  name: string
  role: string
  count: number
  avg: number | null
  min: number | null
  max: number | null
}
interface DetailItem {
  raterId: string
  name: string
  studentId: string
  scores: Record<string, number>
  ratedCount: number
}
interface HistoryItem {
  name: string
  studentId: string
  at: string
  version: number
  scores: { name: string; score: number }[]
}
interface MissingItem {
  id: string
  name: string
  studentId: string
}

type Tab = "rank" | "detail" | "history" | "missing"

export default function CommitteeStatsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const year = (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("year")) || DEFAULT_YEAR

  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [tab, setTab] = useState<Tab>("rank")
  const [rows, setRows] = useState<Row[]>([])
  const [detail, setDetail] = useState<DetailItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [missing, setMissing] = useState<MissingItem[]>([])
  const [raterCount, setRaterCount] = useState(0)
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalMembers, setTotalMembers] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch(`/api/zongce/committee/stats?year=${year}`)
      .then(async res => {
        if (res.status === 403) { setDenied(true); setLoading(false); return }
        if (res.ok) {
          const d = await res.json()
          setRows(d.rows || [])
          setDetail(d.detail || [])
          setHistory(d.history || [])
          setMissing(d.missing || [])
          setRaterCount(d.raterCount || 0)
          setTotalStudents(d.totalStudents || 0)
          setTotalMembers(d.totalMembers || 0)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [status, year])

  if (status === "loading" || loading) return <p style={{ textAlign: "center", padding: 80, color: "#7A8A94" }}>加载中...</p>
  if (!session) return null
  if (denied) {
    return (
      <>
      <div className="m-page-root">
        <header className="m-topbar">
          <Link className="m-back" href="/zongce" aria-label="返回综测"><ArrowLeft size={18} /></Link>
          <span className="m-title">评议统计<small>STATS</small></span>
          <span className="m-year">{year}</span>
        </header>
        <div style={{ margin: "18px 16px 0", padding: "34px 24px", textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6 }}>
          <ShieldAlert size={28} style={{ color: "var(--color-danger)", marginBottom: 12 }} />
          <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6 }}>仅班长或管理员可查看</div>
          <div style={{ fontSize: 11.5, color: "var(--color-muted)" }}>班委评议统计面板仅对班长开放</div>
        </div>
      </div>
      <div className="commstats-desktop">
      <main className="zs-wrap">
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
        <div className="card" style={{ textAlign: "center", padding: "60px 40px", background: "#fff" }}>
          <ShieldAlert size={30} style={{ color: "#C4615A", marginBottom: 12 }} />
          <h2 style={{ marginBottom: 8, fontSize: "1.05rem" }}>仅班长或管理员可查看</h2>
          <p style={{ color: "#7A8A94", fontSize: ".85rem" }}>班委评议统计面板仅对班长开放</p>
        </div>
      </main>
      </div>
      </>
    )
  }

  const maxAvg = Math.max(...rows.map(r => r.avg ?? 0), 1)
  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: "rank", label: "排名总览", icon: BarChart3 },
    { key: "detail", label: "打分明细", icon: Table2 },
    { key: "history", label: "修改记录", icon: History },
    { key: "missing", label: `未填写名单`, icon: UserX },
  ]

  // ===== 移动版（设计稿 committee-stats.html · 真实 API，≤640px 显示） =====
  const ratedRows = rows.filter(r => r.avg != null)
  const avgAll = ratedRows.length > 0 ? ratedRows.reduce((s, r) => s + (r.avg || 0), 0) / ratedRows.length : null
  const maxAll = ratedRows.length > 0 ? Math.max(...ratedRows.map(r => r.max ?? 0)) : null
  const minAll = ratedRows.length > 0 ? Math.min(...ratedRows.map(r => r.min ?? 0)) : null
  const mobileView = (
    <div className="m-page-root">
      <header className="m-topbar">
        <Link className="m-back" href="/zongce" aria-label="返回综测"><ArrowLeft size={18} /></Link>
        <span className="m-title">评议统计<small>STATS</small></span>
        <span className="chip ok"><span className="lamp" />已结束</span>
      </header>

      {/* 统计总览 2×2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, padding: "14px 16px 0" }}>
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "12px 12px 10px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".12em", color: "var(--color-muted)", textTransform: "uppercase" }}>参与人数</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "var(--color-accent-hover)", marginTop: 4, lineHeight: 1.1 }}>
            {raterCount}<small style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 400 }}> / {totalStudents}</small>
          </div>
        </div>
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "12px 12px 10px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".12em", color: "var(--color-muted)", textTransform: "uppercase" }}>平均分</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "#5A8C6F", marginTop: 4, lineHeight: 1.1 }}>
            {avgAll != null ? avgAll.toFixed(1) : "—"}
          </div>
        </div>
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "12px 12px 10px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".12em", color: "var(--color-muted)", textTransform: "uppercase" }}>最高分</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "var(--color-fg)", marginTop: 4, lineHeight: 1.1 }}>
            {maxAll ?? "—"}
          </div>
        </div>
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "12px 12px 10px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".12em", color: "var(--color-muted)", textTransform: "uppercase" }}>最低分</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "var(--color-fg)", marginTop: 4, lineHeight: 1.1 }}>
            {minAll ?? "—"}
          </div>
        </div>
      </div>

      {/* 班委均分排行 */}
      <section style={{ padding: "18px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{
            display: "flex", alignItems: "center", gap: 9,
            fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700,
            letterSpacing: ".18em", textTransform: "uppercase", color: "var(--color-muted)",
          }}>班委均分排行</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)" }}>前 {Math.min(rows.length, 8)} 名</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 0 }}>
          {rows.slice(0, 8).map((r, i) => (
            <div key={r.name} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 6, padding: "11px 13px",
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 6, flex: "none",
                background: "var(--color-accent-subtle)", color: "var(--color-accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
              }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-fg)" }}>{r.name}</span>
                <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 8.5, color: "var(--color-muted)", marginTop: 1 }}>{r.role}</span>
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: i < 3 ? "var(--color-accent-hover)" : "var(--color-fg)", flex: "none" }}>
                {r.avg != null ? r.avg.toFixed(1) : "—"}
              </span>
              <span style={{ color: "var(--color-muted-light)", flex: "none" }}><ChevronRight size={14} /></span>
            </div>
          ))}
        </div>
      </section>

      <div style={{ fontSize: 10.5, color: "var(--color-muted)", padding: "12px 16px 0" }}>
        共 {totalMembers} 名班委参与评议 · 此处仅显示前 8 名 · 结果已锁定不可修改
      </div>

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        本页仅班长可见 · 结果用于年度班委考核<br /><b style={{ color: "var(--color-muted)", fontWeight: 600 }}>评议统计</b> · {year} 学年
      </div>
    </div>
  )

  return (
    <>
    {mobileView}
    <div className="commstats-desktop">
    <main className="zs-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
        <span className="zs-id-badge">{year} 学年</span>
      </div>

      <div className="zs-id">
        <div className="zs-id-avatar"><Trophy size={18} /></div>
        <div className="zs-id-info">
          <div className="zs-id-name">班委民主评议统计</div>
          <div className="zs-id-meta">
            <span><Users size={11} /> {raterCount} 名同学参与</span>
            <span><span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{rows.filter(r => r.count > 0).length}/{totalMembers}</span> 班委有评分</span>
          </div>
        </div>
        <span className="zs-id-badge">计分以最后一次为准</span>
      </div>

      {/* Tab 切换 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: 8, cursor: "pointer",
              border: `1.5px solid ${tab === t.key ? "#4A7C96" : "#E3E7EB"}`,
              background: tab === t.key ? "#EDF2F6" : "#fff",
              color: tab === t.key ? "#3D5A6E" : "#7A8A94",
              fontSize: ".8rem", fontWeight: 600, transition: "all .15s",
            }}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* ===== Tab 1 · 排名总览（末次计分） ===== */}
      {tab === "rank" && (
        <div className="card" style={{ padding: 0, overflow: "hidden", overflowX: "auto", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".84rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E8E3D9", background: "#F9F8F5" }}>
                {["排名", "姓名", "职务", "打分人数", "平均分", "最高", "最低"].map(h => (
                  <th key={h} style={{ textAlign: h === "姓名" || h === "职务" ? "left" : "center", padding: "11px 12px", fontWeight: 600, color: "#7A8A94", fontSize: ".68rem", letterSpacing: ".06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const medal = i === 0 ? "#C7924B" : i === 1 ? "#A8B4BD" : i === 2 ? "#C4615A" : "#7A8A94"
                return (
                  <tr key={r.name} style={{ borderBottom: "1px solid #F0EEE9" }}>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: medal, fontSize: ".85rem" }}>{i + 1}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#26323C" }}>{r.name}</td>
                    <td style={{ padding: "10px 12px", color: "#7A8A94", fontSize: ".78rem" }}>{r.role}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", color: "#7A8A94", fontSize: ".8rem" }}>{r.count} 人</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: ".95rem", color: r.avg != null ? "#3D5A6E" : "#B9C2CA" }}>
                          {r.avg != null ? r.avg.toFixed(1) : "—"}
                        </span>
                        <span style={{ width: 60, height: 4, background: "#EEF0F3", borderRadius: 99, overflow: "hidden", display: "inline-block" }}>
                          <span style={{ display: "block", height: "100%", background: "#4A7C96", borderRadius: 99, width: `${r.avg != null ? (r.avg / maxAvg) * 100 : 0}%` }} />
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", color: r.max != null ? "#5A8C6F" : "#B9C2CA", fontSize: ".8rem" }}>{r.max ?? "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", color: r.min != null ? "#C4615A" : "#B9C2CA", fontSize: ".8rem" }}>{r.min ?? "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Tab 2 · 打分明细（每人给每个班委的最新分） ===== */}
      {tab === "detail" && (
        <div className="card" style={{ padding: 0, overflow: "hidden", overflowX: "auto", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".78rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E8E3D9", background: "#F9F8F5" }}>
                <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600, color: "#7A8A94", fontSize: ".66rem", letterSpacing: ".06em", position: "sticky", left: 0, background: "#F9F8F5" }}>打分人</th>
                {rows.map(r => (
                  <th key={r.name} style={{ textAlign: "center", padding: "10px 6px", fontWeight: 600, color: "#7A8A94", fontSize: ".62rem", letterSpacing: ".02em", whiteSpace: "nowrap" }}>{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.length === 0 && (
                <tr><td colSpan={rows.length + 1} style={{ padding: 30, textAlign: "center", color: "#A8B4BD" }}>暂无同学参与评分</td></tr>
              )}
              {detail.map(d => (
                <tr key={d.raterId} style={{ borderBottom: "1px solid #F0EEE9" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: "#26323C", whiteSpace: "nowrap", position: "sticky", left: 0, background: "#fff" }}>
                    {d.name}
                    <span style={{ marginLeft: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: ".62rem", color: "#A8B4BD" }}>{d.studentId}</span>
                  </td>
                  {rows.map(r => {
                    const v = d.scores[r.name]
                    return (
                      <td key={r.name} style={{ padding: "8px 6px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: ".8rem", fontWeight: v != null ? 700 : 400, color: v != null ? "#3D5A6E" : "#D8DEE3" }}>
                        {v != null ? v : "—"}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Tab 3 · 修改记录（每次提交的完整分数） ===== */}
      {tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {history.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: 40, color: "#A8B4BD", background: "#fff" }}>暂无修改记录</div>
          )}
          {history.map((h, i) => {
            const isOpen = expanded === `${h.name}|${h.at}`
            return (
              <div key={i} className="card" style={{ background: "#fff", padding: 0, overflow: "hidden" }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : `${h.name}|${h.at}`)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
                    textAlign: "left", fontFamily: "inherit",
                  }}
                >
                  <span style={{
                    width: 30, height: 30, borderRadius: "50%", flex: "none",
                    background: "#EBEFF5", border: "1.5px solid #4A7C96", color: "#3D5A6E",
                    fontFamily: "Georgia,'Songti SC',serif", fontWeight: 700, fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{h.name[0]}</span>
                  <span style={{ fontWeight: 700, color: "#26323C", fontSize: ".88rem" }}>{h.name}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: ".66rem", color: "#A8B4BD" }}>{h.studentId}</span>
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono',monospace", fontSize: ".7rem", fontWeight: 700,
                      color: "#3D5A6E", background: "#EDF2F6", padding: "2px 9px", borderRadius: 99,
                    }}>第 {h.version} 次提交</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: ".68rem", color: "#7A8A94" }}>
                      {new Date(h.at).toLocaleString("zh-CN")}
                    </span>
                    <span style={{ color: "#A8B4BD", fontSize: ".75rem", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>›</span>
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 16px 14px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".78rem" }}>
                      <tbody>
                        {h.scores.map(s => (
                          <tr key={s.name} style={{ borderTop: "1px solid #F2F3F5" }}>
                            <td style={{ padding: "7px 8px", color: "#4A5463", fontWeight: 600, whiteSpace: "nowrap" }}>{s.name}</td>
                            <td style={{ padding: "7px 8px", textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#3D5A6E", fontSize: ".85rem" }}>{s.score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ===== Tab 4 · 未填写名单 ===== */}
      {tab === "missing" && (
        <>
          <div className="card" style={{
            background: missing.length > 0 ? "#FDF3F2" : "#F0F7F3",
            borderColor: missing.length > 0 ? "rgba(196,97,90,.35)" : "rgba(62,142,99,.3)",
            padding: "14px 18px", marginBottom: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <UserX size={18} style={{ color: missing.length > 0 ? "#C4615A" : "#5A8C6F" }} />
              <div>
                <div style={{ fontSize: ".9rem", fontWeight: 700, color: missing.length > 0 ? "#C4615A" : "#3E8E63" }}>
                  {missing.length > 0 ? `${missing.length} 位同学尚未填写评分` : "全班同学均已填写"}
                </div>
                <div style={{ fontSize: ".72rem", color: "#7A8A94", marginTop: 2 }}>
                  已参与 {raterCount} / {totalStudents} 人 · 请提醒以下同学尽快完成
                </div>
              </div>
            </div>
          </div>

          {missing.length > 0 ? (
            <div className="card" style={{ padding: 0, overflow: "hidden", background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #E8E3D9", background: "#F9F8F5" }}>
                    {["序号", "姓名", "学号"].map(h => (
                      <th key={h} style={{ textAlign: h === "姓名" ? "left" : "center", padding: "10px 12px", fontWeight: 600, color: "#7A8A94", fontSize: ".66rem", letterSpacing: ".06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {missing.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: "1px solid #F0EEE9" }}>
                      <td style={{ padding: "9px 12px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", color: "#A8B4BD", fontSize: ".75rem" }}>{i + 1}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 600, color: "#26323C" }}>{m.name}</td>
                      <td style={{ padding: "9px 12px", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", color: "#7A8A94", fontSize: ".78rem" }}>{m.studentId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center", padding: 40, color: "#5A8C6F", background: "#fff" }}>
              <svg viewBox="0 0 24 24" style={{ width: 26, height: 26, stroke: "#5A8C6F", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", margin: "0 auto 8px", display: "block" }}>
                <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
              </svg>
              全部 {totalStudents} 位同学均已参与评分
            </div>
          )}
        </>
      )}

      <p style={{ marginTop: 14, fontSize: ".72rem", color: "#A8B4BD", textAlign: "center" }}>
        评分满分 {RATING_MAX} 分 · 每人评分互不可见 · 计分以最后一次提交为准
      </p>
    </main>
    </div>
    </>
  )
}
