"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Images, ShieldAlert } from "lucide-react"
import MobTopBar from "../../_components/MobTopBar"
import MobCard from "../../_components/MobCard"
import MobChip from "../../_components/MobChip"
import MobProgress from "../../_components/MobProgress"
import MobField from "../../_components/MobField"
import MobEmpty from "../../_components/MobEmpty"
import MobLoading from "../../_components/MobLoading"
import MobRoleGate from "../../_components/MobRoleGate"
import MobImageViewer, { type MobViewerImage } from "../../_components/MobImageViewer"

const COMMITTEE_TAGS = ["班长", "副班长", "团支书", "副团支书", "心理委员", "学习委员", "生活委员", "文体委员", "志愿队长", "组织委员", "宣传委员"]

const SECTION_FILTERS = [
  { value: "all", label: "全部板块" },
  { value: "S", label: "S 学习成绩" },
  { value: "A", label: "A 学风考勤" },
  { value: "B", label: "B 集会政治学习" },
  { value: "C", label: "C 星级宿舍" },
  { value: "D", label: "D 文体活动" },
  { value: "E", label: "E 社会实践" },
  { value: "F", label: "F 奖惩附加" },
]

interface Photo {
  id: string; userId: string; name: string; studentId: string
  section: string; sectionLabel: string; status: string
  url: string; updatedAt: string
}

interface ResourceGauge { total: number; free: number; used: number; percent: number }
interface StudentEntry { id: string; name: string; studentId: string }

const fmtGB = (bytes: number) => (bytes / 1024 / 1024 / 1024).toFixed(2)

const fileName = (url: string) => url.split("/").pop() || "photo.jpg"

const gaugeTone = (percent: number): "danger" | "warn" | "ok" =>
  percent > 85 ? "danger" : percent > 60 ? "warn" : "ok"

/** 照片中心：班委/管理员可查看佐证照片 + 服务器资源；板块/学生筛选 + 2 列缩略图。 */
export default function MobilePhotosPage() {
  const { data: session, status } = useSession()

  const [photos, setPhotos] = useState<Photo[]>([])
  const [memory, setMemory] = useState<ResourceGauge | null>(null)
  const [disk, setDisk] = useState<ResourceGauge | null>(null)
  const [studentCount, setStudentCount] = useState(0)
  const [students, setStudents] = useState<StudentEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [denied, setDenied] = useState(false)
  const [filterSection, setFilterSection] = useState("all")
  const [filterStudent, setFilterStudent] = useState("")

  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImages, setViewerImages] = useState<MobViewerImage[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)

  const isManager = session?.user?.role === "admin" || (session?.user?.tags ?? []).some(t => COMMITTEE_TAGS.includes(t))

  useEffect(() => {
    if (status !== "authenticated" || !isManager) return
    fetch("/api/zongce/photos")
      .then(async res => {
        if (res.status === 403) { setDenied(true); setLoaded(true); return }
        if (!res.ok) { setLoaded(true); return }
        const d = await res.json()
        setPhotos((d.photos || []) as Photo[])
        setMemory((d.memory || null) as ResourceGauge | null)
        setDisk((d.disk || null) as ResourceGauge | null)
        setStudentCount((d.studentCount as number) || 0)
        const map = new Map<string, StudentEntry>()
        for (const p of (d.photos || []) as Photo[]) {
          map.set(p.userId, { id: p.userId, name: p.name, studentId: p.studentId })
        }
        setStudents(Array.from(map.values()))
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [status, isManager])

  const visible = useMemo(() => {
    let list = photos
    if (filterSection !== "all") list = list.filter(p => p.section === filterSection)
    if (filterStudent) list = list.filter(p => p.userId === filterStudent)
    return list
  }, [photos, filterSection, filterStudent])

  const openViewer = (idx: number) => {
    setViewerImages(visible.map(p => ({ url: p.url, label: `${p.name} · ${p.sectionLabel}` })))
    setViewerIndex(idx)
    setViewerOpen(true)
  }

  if (status === "loading") return null

  const studentOptions = [
    { value: "", label: "全部学生" },
    ...students.map(s => ({ value: s.id, label: `${s.name} ${s.studentId}` })),
  ]

  return (
    <div className="mob-page">
      <MobTopBar title="照片中心" back />

      <MobRoleGate
        allowedRoles={["admin"]}
        allowedTags={COMMITTEE_TAGS}
        fallback={<MobEmpty icon={<ShieldAlert size={28} />} title="无权限" desc="仅负责综测板块的班委或管理员可查看照片中心" />}
      >
        {denied ? (
          <MobEmpty icon={<ShieldAlert size={28} />} title="无权限" desc="仅负责综测板块的班委或管理员可查看照片中心" />
        ) : (
          <>
            {(disk || memory) && (
              <MobCard title="服务器资源" extra={<span style={{ fontSize: 12, color: "var(--fg-3)" }}>实时</span>}>
                {disk && (
                  <>
                    <MobProgress value={disk.percent} label="磁盘存储" tone={gaugeTone(disk.percent)} />
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--fg-3)" }}>
                      已用 {fmtGB(disk.used)} GB / 共 {fmtGB(disk.total)} GB
                    </div>
                  </>
                )}
                {memory && (
                  <>
                    <div style={{ marginTop: disk ? 14 : 0 }}>
                      <MobProgress value={memory.percent} label="运行内存" tone={gaugeTone(memory.percent)} />
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--fg-3)" }}>
                      已用 {fmtGB(memory.used)} GB / 共 {fmtGB(memory.total)} GB
                    </div>
                  </>
                )}
                <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--fg-3)" }}>照片总数</div>
                    <div style={{ fontFamily: "var(--font-num)", fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>{photos.length} 张</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--fg-3)" }}>学生人数</div>
                    <div style={{ fontFamily: "var(--font-num)", fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>{studentCount} 名</div>
                  </div>
                </div>
              </MobCard>
            )}

            <MobCard>
              <MobField label="板块" type="select" value={filterSection} onChange={setFilterSection} options={SECTION_FILTERS} />
              <div style={{ marginTop: 14 }}>
                <MobField label="学生" type="select" value={filterStudent} onChange={setFilterStudent} options={studentOptions} />
              </div>
            </MobCard>

            {!loaded ? (
              <MobLoading rows={6} />
            ) : visible.length === 0 ? (
              <MobEmpty icon={<Images size={28} />} title="暂无佐证照片" desc="学生上传的综测佐证照片将汇总显示在这里" />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {visible.map((p, i) => (
                  <button
                    key={p.id + i}
                    type="button"
                    onClick={() => openViewer(i)}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-card)",
                      padding: "6px 6px 9px",
                      display: "block",
                      color: "inherit",
                      textAlign: "left",
                      overflow: "hidden",
                      transition: "transform 160ms var(--mob-ease), border-color 160ms var(--mob-ease)",
                    }}
                  >
                    <div style={{ aspectRatio: "4 / 3", borderRadius: 12, overflow: "hidden", background: "var(--surface-2)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={`${p.name} 佐证`} loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                    <div style={{ padding: "7px 4px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.name}
                        </span>
                        <MobChip tone="s">{p.section}</MobChip>
                      </div>
                      <div style={{ fontFamily: "var(--font-num)", fontSize: 11, color: "var(--fg-3)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {fileName(p.url)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </MobRoleGate>

      {viewerOpen && (
        <MobImageViewer
          images={viewerImages}
          index={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onIndexChange={setViewerIndex}
        />
      )}
    </div>
  )
}
