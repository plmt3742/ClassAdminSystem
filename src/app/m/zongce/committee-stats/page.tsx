"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { ShieldAlert, ChevronDown, UserX, History } from "lucide-react"
import { DEFAULT_YEAR } from "@/lib/committee"
import MobTopBar from "../../_components/MobTopBar"
import MobCard from "../../_components/MobCard"
import MobEmpty from "../../_components/MobEmpty"
import MobLoading from "../../_components/MobLoading"
import MobAvatar from "../../_components/MobAvatar"
import MobSegmented from "../../_components/MobSegmented"
import MobRoleGate from "../../_components/MobRoleGate"
import MobYearBadge from "../../_components/MobYearBadge"

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

type Tab = "detail" | "history" | "missing"

export default function MobileCommitteeStatsPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("detail")
  const [rows, setRows] = useState<Row[]>([])
  const [detail, setDetail] = useState<DetailItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [missing, setMissing] = useState<MissingItem[]>([])
  const [raterCount, setRaterCount] = useState(0)
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalMembers, setTotalMembers] = useState(0)
  const [year, setYear] = useState(DEFAULT_YEAR)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch(`/api/zongce/committee/stats?year=${DEFAULT_YEAR}`)
      .then(async res => {
        if (res.ok) {
          const d = await res.json()
          setRows(d.rows || [])
          setDetail(d.detail || [])
          setHistory(d.history || [])
          setMissing(d.missing || [])
          setRaterCount(d.raterCount || 0)
          setTotalStudents(d.totalStudents || 0)
          setTotalMembers(d.totalMembers || 0)
          setYear(d.year || DEFAULT_YEAR)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  if (status === "loading" || loading) {
    return (
      <div className="mob-page">
        <MobTopBar back title="评议统计" right={<MobYearBadge year={DEFAULT_YEAR} />} />
        <MobLoading rows={8} />
      </div>
    )
  }
  if (!session) return null

  const deny = (
    <div className="mob-page">
      <MobTopBar back title="评议统计" right={<MobYearBadge year={DEFAULT_YEAR} />} />
      <MobEmpty icon={<ShieldAlert size={28} />} title="无权限" desc="班委评议统计面板仅对班长或管理员开放" />
    </div>
  )

  const ratedRows = rows.filter(r => r.avg != null)
  const avgAll = ratedRows.length > 0 ? ratedRows.reduce((s, r) => s + (r.avg || 0), 0) / ratedRows.length : null
  const maxAll = ratedRows.length > 0 ? Math.max(...ratedRows.map(r => r.max ?? 0)) : null
  const minAll = ratedRows.length > 0 ? Math.min(...ratedRows.map(r => r.min ?? 0)) : null

  return (
    <MobRoleGate allowedRoles={["admin"]} allowedTags={["班长"]} fallback={deny}>
      <div className="mob-page" style={{ paddingBottom: 24 }}>
        <MobTopBar back title="评议统计" right={<MobYearBadge year={year} />} />

        {/* 统计总览 2×2 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          <StatTile label="参与人数" value={`${raterCount}`} suffix={`/ ${totalStudents}`} />
          <StatTile label="平均分" value={avgAll != null ? avgAll.toFixed(1) : "—"} green />
          <StatTile label="最高分" value={maxAll != null ? String(maxAll) : "—"} />
          <StatTile label="最低分" value={minAll != null ? String(minAll) : "—"} />
        </div>

        {/* 排名总览 */}
        <MobCard title="班委均分排行" extra={<span style={{ fontSize: 12, color: "var(--fg-3)" }}>{totalMembers} 名班委</span>} padding={false}>
          {rows.map((r, i) => (
            <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: "1px solid var(--border)" }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: i < 3 ? "var(--primary-soft)" : "var(--surface-2)", color: i < 3 ? "var(--primary)" : "var(--fg-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-num)", fontSize: 12, fontWeight: 700, flex: "none" }}>
                {i + 1}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{r.name}</span>
                <span style={{ display: "block", marginTop: 1, fontSize: 11, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.role}</span>
              </span>
              <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-num)", flex: "none" }}>{r.count} 人</span>
              <span style={{ width: 44, textAlign: "right", fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: r.avg != null ? (i < 3 ? "var(--primary)" : "var(--fg)") : "var(--fg-3)", flex: "none" }}>
                {r.avg != null ? r.avg.toFixed(1) : "—"}
              </span>
            </div>
          ))}
        </MobCard>

        {/* 分段切换 */}
        <MobSegmented
          options={[
            { value: "detail", label: "评分明细" },
            { value: "history", label: "版本历史" },
            { value: "missing", label: "未评名单" },
          ]}
          value={tab}
          onChange={v => setTab(v as Tab)}
        />

        {/* 评分明细（矩阵，允许横向滚动） */}
        {tab === "detail" && (
          <MobCard padding={false}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 12, minWidth: "max-content", width: "100%" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)" }}>
                    <th style={{ position: "sticky", left: 0, background: "var(--surface-2)", textAlign: "left", padding: "9px 12px", fontWeight: 700, color: "var(--fg-2)", whiteSpace: "nowrap", fontSize: 11, zIndex: 2 }}>打分人</th>
                    {rows.map(r => (
                      <th key={r.name} style={{ textAlign: "center", padding: "9px 6px", fontWeight: 600, color: "var(--fg-3)", whiteSpace: "nowrap", fontSize: 11 }}>{r.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.length === 0 && (
                    <tr>
                      <td colSpan={rows.length + 1} style={{ padding: 24, textAlign: "center", color: "var(--fg-3)" }}>暂无同学参与评分</td>
                    </tr>
                  )}
                  {detail.map(d => (
                    <tr key={d.raterId} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ position: "sticky", left: 0, background: "var(--surface)", padding: "9px 12px", fontWeight: 600, color: "var(--fg)", whiteSpace: "nowrap", zIndex: 1 }}>
                        {d.name}
                        <span style={{ marginLeft: 4, fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>{d.studentId}</span>
                      </td>
                      {rows.map(r => {
                        const v = d.scores[r.name]
                        return (
                          <td key={r.name} style={{ padding: "9px 6px", textAlign: "center", fontFamily: "var(--font-num)", fontWeight: v != null ? 700 : 400, color: v != null ? "var(--primary)" : "var(--border-strong)" }}>
                            {v != null ? v : "—"}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MobCard>
        )}

        {/* 版本历史 */}
        {tab === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.length === 0 && (
              <MobEmpty icon={<History size={28} />} title="暂无修改记录" desc="尚未有同学提交评分" />
            )}
            {history.map((h, i) => {
              const key = `${h.name}|${h.at}`
              const open = expanded === key
              return (
                <div key={i} style={{ background: "var(--surface)", borderRadius: 16, boxShadow: "var(--shadow-card)", overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : key)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", textAlign: "left" }}
                  >
                    <MobAvatar name={h.name} size="sm" />
                    <span style={{ fontWeight: 700, color: "var(--fg)", fontSize: 14 }}>{h.name}</span>
                    <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>{h.studentId}</span>
                    <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", background: "var(--primary-soft)", padding: "2px 9px", borderRadius: 999, fontFamily: "var(--font-num)" }}>
                        第 {h.version} 次
                      </span>
                      <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>{new Date(h.at).toLocaleString("zh-CN")}</span>
                      <ChevronDown size={16} style={{ color: "var(--fg-3)", transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms var(--mob-ease)" }} />
                    </span>
                  </button>
                  {open && (
                    <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)" }}>
                      <div style={{ paddingTop: 8 }}>
                        {h.scores.map(s => (
                          <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 4px", borderTop: "1px solid var(--border)" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-2)" }}>{s.name}</span>
                            <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--primary)" }}>{s.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 未评名单 */}
        {tab === "missing" && (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", background: missing.length > 0 ? "rgba(196,97,90,0.08)" : "rgba(62,142,99,0.08)", border: `1px solid ${missing.length > 0 ? "rgba(196,97,90,0.3)" : "rgba(62,142,99,0.3)"}`, borderRadius: 12, padding: "12px 14px" }}>
              <UserX size={18} style={{ color: missing.length > 0 ? "var(--danger)" : "var(--ok)", flex: "none" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: missing.length > 0 ? "var(--danger)" : "var(--ok)" }}>
                  {missing.length > 0 ? `${missing.length} 位同学尚未填写评分` : "全班同学均已填写"}
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>
                  已参与 {raterCount} / {totalStudents} 人
                </div>
              </div>
            </div>
            {missing.length > 0 && (
              <MobCard padding={false}>
                {missing.map((m, i) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: "1px solid var(--border)" }}>
                    <span style={{ width: 24, textAlign: "center", fontFamily: "var(--font-num)", fontSize: 12, color: "var(--fg-3)", flex: "none" }}>{i + 1}</span>
                    <MobAvatar name={m.name} size="sm" />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{m.name}</span>
                    <span style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>{m.studentId}</span>
                  </div>
                ))}
              </MobCard>
            )}
          </>
        )}

        <div style={{ textAlign: "center", padding: "6px 16px 0", fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.04em" }}>
          计分以最后一次为准 · 本页仅班长可见 · {year} 学年
        </div>
      </div>
    </MobRoleGate>
  )
}

function StatTile({ label, value, suffix, green = false }: { label: string; value: string; suffix?: string; green?: boolean }) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ marginTop: 6, fontFamily: "var(--font-num)", fontSize: 22, fontWeight: 700, color: green ? "var(--ok)" : "var(--fg)", lineHeight: 1.1 }}>
        {value}
        {suffix ? <span style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 400, marginLeft: 2 }}>{suffix}</span> : null}
      </div>
    </div>
  )
}
