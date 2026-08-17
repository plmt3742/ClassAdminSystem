"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { toPng } from "html-to-image"
import { Download, ListChecks, ShieldAlert } from "lucide-react"
import MobTopBar from "../../_components/MobTopBar"
import MobCard from "../../_components/MobCard"
import MobChip from "../../_components/MobChip"
import MobSegmented, { type MobSegmentedOption } from "../../_components/MobSegmented"
import MobButton from "../../_components/MobButton"
import MobEmpty from "../../_components/MobEmpty"
import MobLoading from "../../_components/MobLoading"
import MobRoleGate from "../../_components/MobRoleGate"
import { useToast } from "../../_components/MobToast"

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

type CategoryKey = "approved" | "unfilled" | "submitted" | "returned"

const SEG_OPTIONS: MobSegmentedOption[] = [
  { value: "approved", label: "已通过" },
  { value: "unfilled", label: "未填写" },
  { value: "submitted", label: "已提交" },
  { value: "returned", label: "已退回" },
]

const CATEGORIES: { key: CategoryKey; label: string; color: string }[] = [
  { key: "approved", label: "已通过", color: "#3E8E63" },
  { key: "unfilled", label: "未填写", color: "#C4615A" },
  { key: "submitted", label: "已提交", color: "#D9A03D" },
  { key: "returned", label: "已退回", color: "#C4615A" },
]

const listOf = (g: SectionGroup, key: CategoryKey): Person[] => {
  switch (key) {
    case "approved": return g.approved
    case "unfilled": return g.unfilled
    case "submitted": return g.submitted
    case "returned": return g.returned
  }
}

/** 姓名（学号）胶囊网格。 */
function ChipGrid({ list }: { list: Person[] }) {
  if (list.length === 0) return <span style={{ fontSize: 12, color: "var(--fg-3)" }}>无</span>
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {list.map(p => (
        <span
          key={p.studentId}
          style={{
            fontSize: 12, padding: "3px 10px", borderRadius: 999,
            background: "var(--surface-2)", border: "1px solid var(--border)",
            color: "var(--fg-2)", whiteSpace: "nowrap",
          }}
        >
          {p.name}
          <span style={{ color: "var(--fg-3)", fontFamily: "var(--font-num)", marginLeft: 5, fontSize: 11 }}>{p.studentId}</span>
        </span>
      ))}
    </div>
  )
}

/** 未填写名单：管理员专属；板块卡片（分段切换名单）+ 汇总卡 PNG 导出。 */
export default function MobileUnfilledPage() {
  const { data: session, status } = useSession()
  const toast = useToast()

  const [sections, setSections] = useState<SectionGroup[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [tab, setTab] = useState<Record<string, string>>({})
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/unfilled")
      .then(async res => {
        if (res.status === 403) { setDenied(true); setLoading(false); return }
        if (res.ok) {
          const d = await res.json()
          setSections((d.sections || []) as SectionGroup[])
          setTotalStudents((d.totalStudents as number) || 0)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [status])

  const handleExport = async () => {
    const node = exportRef.current
    if (!node || exporting) return
    setExporting(true)
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#F4F6F9",
        cacheBust: true,
      })
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `未填写清单-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
    } catch (e) {
      toast.error("导出失败，请重试")
      console.error("[unfilled export]", e)
    } finally {
      setExporting(false)
    }
  }

  const activeTab = (g: SectionGroup): CategoryKey => (tab[g.section] as CategoryKey) || "unfilled"
  const onTab = (g: SectionGroup) => (v: string) => setTab(prev => ({ ...prev, [g.section]: v }))

  return (
    <div className="mob-page">
      <MobTopBar
        title="未填写名单"
        back
        right={
          <MobButton size="sm" variant="soft" loading={exporting} onClick={handleExport}>
            <Download size={14} /> 导出
          </MobButton>
        }
      />

      <MobRoleGate
        allowedRoles={["admin"]}
        fallback={<MobEmpty icon={<ShieldAlert size={28} />} title="仅管理员可见" desc="未填写清单仅对管理员开放" />}
      >
        {denied ? (
          <MobEmpty icon={<ShieldAlert size={28} />} title="仅管理员可见" desc="未填写清单仅对管理员开放" />
        ) : loading ? (
          <MobLoading rows={6} />
        ) : (
          <>
            {/* 汇总卡（导出目标）：浅色底，保证 PNG 导出观感稳定 */}
            <div
              ref={exportRef}
              style={{
                padding: 16,
                background: "#FFFFFF",
                borderRadius: 16,
                boxShadow: "var(--shadow-card)",
                color: "#17202B",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ListChecks size={18} style={{ color: "#3B6B8A", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#17202B" }}>未填写清单</div>
                  <div style={{ fontSize: 12, color: "#93A0B0" }}>共 {totalStudents} 名同学 · {sections.length} 个板块</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#C4615A", border: "1px solid rgba(196,97,90,0.3)", borderRadius: 6, padding: "2px 8px" }}>
                  仅管理员可见
                </span>
              </div>

              {sections.map(g => (
                <div key={g.section} style={{ marginTop: 18 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#17202B" }}>{g.section} {g.label}</span>
                    <span style={{ fontSize: 12, color: "#93A0B0" }}>{g.reviewer}负责</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "#93A0B0", fontFamily: "var(--font-num)" }}>
                      已通过 {g.approvedCount}/{g.total}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                    {CATEGORIES.map(c => (
                      <div key={c.key}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: c.color, marginBottom: 4 }}>
                          {c.label}（{listOf(g, c.key).length}）
                        </div>
                        <ChipGrid list={listOf(g, c.key)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 板块卡片：计数 + 分段切换名单 */}
            {sections.map(g => (
              <MobCard key={g.section}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>{g.section} {g.label}</span>
                  <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{g.reviewer}负责</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  <MobChip tone="ok">已通过 {g.approvedCount}/{g.total}</MobChip>
                  <MobChip tone="danger">未填写 {g.unfilled.length}</MobChip>
                  <MobChip tone="warn">已提交 {g.submitted.length}</MobChip>
                  <MobChip tone="danger">已退回 {g.returned.length}</MobChip>
                </div>
                <div style={{ marginTop: 12 }}>
                  <MobSegmented options={SEG_OPTIONS} value={activeTab(g)} onChange={onTab(g)} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <ChipGrid list={listOf(g, activeTab(g))} />
                </div>
              </MobCard>
            ))}
          </>
        )}
      </MobRoleGate>
    </div>
  )
}
