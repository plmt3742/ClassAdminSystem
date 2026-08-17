"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { HeartPulse, ShieldAlert, Download } from "lucide-react"
import { toPng } from "html-to-image"
import MobTopBar from "../../_components/MobTopBar"
import MobCard from "../../_components/MobCard"
import MobChip from "../../_components/MobChip"
import MobEmpty from "../../_components/MobEmpty"
import MobLoading from "../../_components/MobLoading"
import MobSegmented from "../../_components/MobSegmented"
import MobRoleGate from "../../_components/MobRoleGate"
import MobAvatar from "../../_components/MobAvatar"
import { useToast } from "../../_components/MobToast"

const COMMITTEE_TAGS = ["班长", "副班长", "团支书", "副团支书", "心理委员", "学习委员", "生活委员", "文体委员", "志愿队长", "组织委员", "宣传委员"]

interface PtRow { id: string; name: string; studentId: string; physicalTest: boolean | null }
interface PtStats { total: number; filled: number; passed: number; failed: number; unfilled: number }

type TabKey = "passed" | "failed" | "unfilled"

const TAB_LABEL: Record<TabKey, string> = { passed: "过关", failed: "未过关", unfilled: "未填写" }

/** 体测结果面板：全班体测填报汇总（管理员/班委）。 */
export default function MobilePhysicalTestOverviewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()
  const exportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const [rows, setRows] = useState<PtRow[]>([])
  const [stats, setStats] = useState<PtStats | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [denied, setDenied] = useState(false)
  const [tab, setTab] = useState<TabKey>("passed")

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/physical-test/overview")
      .then(async res => {
        if (res.status === 403) { setDenied(true); setLoaded(true); return }
        if (!res.ok) { setLoaded(true); return }
        const d = await res.json()
        setRows((d.rows || []) as PtRow[])
        setStats((d.stats || null) as PtStats | null)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [status])

  const handleExport = async () => {
    if (!exportRef.current) return
    setExporting(true)
    try {
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 2, backgroundColor: "#FFFFFF", skipFonts: true })
      const a = document.createElement("a")
      a.download = `体测结果-${TAB_LABEL[tab]}.png`
      a.href = dataUrl
      a.click()
      toast.success("已导出图片")
    } catch {
      toast.error("导出失败")
    } finally {
      setExporting(false)
    }
  }

  if (status === "loading" || !loaded) {
    return (
      <div className="mob-page">
        <MobTopBar title="体测结果" back icon={<HeartPulse size={17} />} />
        <MobLoading rows={6} />
      </div>
    )
  }
  if (!session) return null

  const filtered = rows.filter(r =>
    tab === "passed" ? r.physicalTest === true
      : tab === "failed" ? r.physicalTest === false
        : r.physicalTest === null,
  )

  const statCells = [
    { label: "已填写", n: stats?.filled ?? 0, color: "var(--primary)" },
    { label: "过关", n: stats?.passed ?? 0, color: "var(--ok)" },
    { label: "未过关", n: stats?.failed ?? 0, color: "var(--danger)" },
    { label: "未填写", n: stats?.unfilled ?? 0, color: "var(--fg-3)" },
  ]

  return (
    <div className="mob-page">
      <MobTopBar
        title="体测结果"
        back
        icon={<HeartPulse size={17} />}
        right={
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || denied}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 30, padding: "0 10px", borderRadius: 999, background: "var(--primary-soft)", color: "var(--primary)", fontSize: 12, fontWeight: 600, opacity: exporting ? 0.6 : 1 }}
          >
            <Download size={13} /> {exporting ? "导出中" : "导出图片"}
          </button>
        }
      />

      <MobRoleGate
        allowedRoles={["admin"]}
        allowedTags={COMMITTEE_TAGS}
        fallback={<MobEmpty icon={<ShieldAlert size={28} />} title="无权限" desc="仅管理员或班委可查看体测结果汇总" />}
      >
        {denied ? (
          <MobEmpty icon={<ShieldAlert size={28} />} title="无权限" desc="仅管理员或班委可查看体测结果汇总" />
        ) : (
          <div ref={exportRef} style={{ background: "var(--surface)", borderRadius: 16, padding: "2px 0 4px" }}>
            {/* 导出区标题（图片内可见） */}
            <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>体测结果汇总 · {TAB_LABEL[tab]}分表</span>
              <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>2025-2026 学年</span>
            </div>

            {/* 统计条 */}
            <MobCard padding={false}>
              <div style={{ display: "flex", alignItems: "stretch", padding: "14px 8px" }}>
                {statCells.map(s => (
                  <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-num)", fontSize: 20, fontWeight: 700, color: s.color }}>{s.n}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </MobCard>

            <MobSegmented
              equal
              options={[
                { value: "passed", label: `过关 ${stats?.passed ?? 0}` },
                { value: "failed", label: `未过关 ${stats?.failed ?? 0}` },
                { value: "unfilled", label: `未填写 ${stats?.unfilled ?? 0}` },
              ]}
              value={tab}
              onChange={v => setTab(v as TabKey)}
            />

            <MobCard padding={false}>
              {filtered.length === 0 ? (
                <div style={{ padding: "28px 16px", textAlign: "center", fontSize: 13, color: "var(--fg-3)" }}>
                  {tab === "passed" ? "暂无过关记录" : tab === "failed" ? "暂无未过关记录" : "全员已填写完毕"}
                </div>
              ) : (
                filtered.map(r => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: "1px solid var(--border)" }}>
                    <MobAvatar name={r.name} size="sm" tone={r.physicalTest === true ? "mid" : r.physicalTest === false ? "deep" : "light"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                      <div style={{ fontFamily: "var(--font-num)", fontSize: 11, color: "var(--fg-3)" }}>{r.studentId}</div>
                    </div>
                    {r.physicalTest === true ? <MobChip tone="ok">过关</MobChip>
                      : r.physicalTest === false ? <MobChip tone="danger">未过关</MobChip>
                        : <MobChip tone="neutral">未填写</MobChip>}
                  </div>
                ))
              )}
            </MobCard>
          </div>
        )}
      </MobRoleGate>
    </div>
  )
}
