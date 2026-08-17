"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { HeartPulse, ArrowLeft, ShieldAlert, Download } from "lucide-react"
import { toPng } from "html-to-image"

interface PtRow { id: string; name: string; studentId: string; physicalTest: boolean | null }
interface PtStats { total: number; filled: number; passed: number; failed: number; unfilled: number }

const COMMITTEE_TAGS = ["班长", "副班长", "团支书", "副团支书", "心理委员", "学习委员", "生活委员", "文体委员", "志愿队长", "组织委员", "宣传委员"]

const FILTER_LABEL: Record<string, string> = { all: "全部", passed: "过关", failed: "未过关", unfilled: "未填写" }

/** 桌面端 · 体测结果面板：全班体测填报汇总（管理员/班委）。 */
export default function PhysicalTestOverviewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const exportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [rows, setRows] = useState<PtRow[]>([])
  const [stats, setStats] = useState<PtStats | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [denied, setDenied] = useState(false)
  const [filter, setFilter] = useState<"all" | "passed" | "failed" | "unfilled">("all")

  const isManager = session?.user?.role === "admin" || ((session?.user?.tags ?? []).some(t => COMMITTEE_TAGS.includes(t)))

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
      a.download = `体测结果-${FILTER_LABEL[filter]}.png`
      a.href = dataUrl
      a.click()
    } catch {
      /* ignore */
    } finally {
      setExporting(false)
    }
  }

  if (status === "loading") return <p className="empty-state">加载中...</p>
  if (!session) return null

  if (denied || !isManager) {
    return (
      <main className="zs-wrap" style={{ paddingTop: 32 }}>
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
        <div className="card" style={{ textAlign: "center", padding: "60px 40px", background: "#fff" }}>
          <ShieldAlert size={32} style={{ color: "#A8B4BD", marginBottom: 12 }} />
          <h2 style={{ marginBottom: 8 }}>无权限</h2>
          <p style={{ color: "#7A8A94", fontSize: ".88rem" }}>仅管理员或班委可查看体测结果汇总</p>
        </div>
      </main>
    )
  }

  const filtered = rows.filter(r =>
    filter === "all" ? true
      : filter === "passed" ? r.physicalTest === true
        : filter === "failed" ? r.physicalTest === false
          : r.physicalTest === null,
  )

  const chipFor = (v: boolean | null) =>
    v === true ? <span style={{ padding: "3px 12px", borderRadius: 999, background: "rgba(62,142,99,.12)", color: "#3E8E63", fontSize: ".78rem", fontWeight: 600 }}>过关</span>
      : v === false ? <span style={{ padding: "3px 12px", borderRadius: 999, background: "rgba(196,97,90,.12)", color: "#C4615A", fontSize: ".78rem", fontWeight: 600 }}>未过关</span>
        : <span style={{ padding: "3px 12px", borderRadius: 999, background: "#F8FAFC", color: "#A0A8B2", fontSize: ".78rem", fontWeight: 600, border: "1px solid #E0E5EC" }}>未填写</span>

  return (
    <main className="zs-wrap" style={{ paddingTop: 32 }}>
      <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>

      <div style={{ marginBottom: 8, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div className="eyebrow">综合素质测评</div>
          <h1 className="display" style={{ display: "block" }}>体测结果</h1>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || denied || !loaded}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 999, cursor: "pointer",
            border: "1px solid #3B6B8A", background: "#3B6B8A", color: "#fff",
            fontSize: ".84rem", fontWeight: 600,
            opacity: exporting || denied || !loaded ? 0.6 : 1,
            marginBottom: 4,
          }}
        >
          <Download size={15} /> {exporting ? "导出中…" : "导出图片"}
        </button>
      </div>

      <div ref={exportRef} style={{ background: "#fff", borderRadius: 6, padding: 0 }}>
      {/* 统计头 */}
      <div className="card" style={{ padding: 0, overflow: "hidden", background: "#fff", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", textAlign: "center" }}>
          {[
            { label: "总人数", n: stats?.total ?? 0, color: "#3D5A6E" },
            { label: "已填写", n: stats?.filled ?? 0, color: "#3B6B8A" },
            { label: "过关", n: stats?.passed ?? 0, color: "#3E8E63" },
            { label: "未过关", n: stats?.failed ?? 0, color: "#C4615A" },
            { label: "未填写", n: stats?.unfilled ?? 0, color: "#A0A8B2" },
          ].map(s => (
            <div key={s.label} style={{ padding: "18px 10px", borderRight: "1px solid #EEF1F5" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.5rem", fontWeight: 700, color: s.color }}>{s.n}</div>
              <div style={{ fontSize: ".7rem", color: "#8A93A0", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 筛选 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {([
          { v: "all", label: `全部 ${stats?.total ?? 0}` },
          { v: "passed", label: `过关 ${stats?.passed ?? 0}` },
          { v: "failed", label: `未过关 ${stats?.failed ?? 0}` },
          { v: "unfilled", label: `未填写 ${stats?.unfilled ?? 0}` },
        ] as const).map(o => (
          <button key={o.v} type="button" onClick={() => setFilter(o.v)}
            style={{
              padding: "7px 16px", borderRadius: 999, cursor: "pointer", fontSize: ".82rem", fontWeight: 600,
              border: `1px solid ${filter === o.v ? "#3B6B8A" : "#E0E5EC"}`,
              background: filter === o.v ? "#3B6B8A" : "#FFFFFF",
              color: filter === o.v ? "#fff" : "#5B6675",
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* 名单 */}
      <div className="card" style={{ padding: 0, overflow: "hidden", background: "#fff" }}>
        {!loaded ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "#8A93A0", fontSize: 13 }}>加载中…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "#8A93A0", fontSize: 13 }}>暂无记录</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".84rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E8E3D9", background: "#F9F8F5" }}>
                {["学号", "姓名", "体测状态"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, color: "#7A8A94", fontSize: ".68rem" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #E8E3D9" }}>
                  <td style={{ padding: "9px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: ".72rem", color: "#7A8A94" }}>{r.studentId}</td>
                  <td style={{ padding: "9px 14px", fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: "9px 14px" }}>{chipFor(r.physicalTest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>

      <footer style={{ textAlign: "center", padding: "22px 16px 8px", fontSize: 9, color: "#A8B4BD", letterSpacing: ".08em" }}>
        <HeartPulse size={11} style={{ verticalAlign: "-1px" }} /> 体测结果由同学在综测页自填收集 · 管理员与班委可见
      </footer>
    </main>
  )
}
