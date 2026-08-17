"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Images, Search, ShieldAlert, HardDrive, ExternalLink, Calendar, ImageIcon } from "lucide-react"
import ImageViewer, { type ViewerImage } from "@/components/ImageViewer"

interface Photo {
  id: string; userId: string; name: string; studentId: string
  section: string; sectionLabel: string; status: string
  url: string; updatedAt: string
}

const SECTION_FILTERS = [
  { key: "all", label: "全部板块" },
  { key: "S", label: "S 学习成绩" },
  { key: "A", label: "A 学风考勤" },
  { key: "B", label: "B 集会政治学习" },
  { key: "C", label: "C 星级宿舍" },
  { key: "D", label: "D 文体活动" },
  { key: "E", label: "E 社会实践" },
  { key: "F", label: "F 奖惩附加" },
]

const STATUS_TEXT: Record<string, string> = {
  not_started: "未填写", draft: "草稿", submitted: "待审核", approved: "已通过", returned: "退回修改",
}
const STATUS_COLOR: Record<string, string> = {
  not_started: "#A8B4BD", draft: "#C7924B", submitted: "#C7924B", approved: "#5A8C6F", returned: "#C4615A",
}

const fmtGB = (bytes: number) => (bytes / 1024 / 1024 / 1024).toFixed(2)

export default function ZongcePhotosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [memory, setMemory] = useState<{ total: number; free: number; used: number; percent: number } | null>(null)
  const [disk, setDisk] = useState<{ total: number; free: number; used: number; percent: number } | null>(null)
  const [students, setStudents] = useState<{ id: string; name: string; studentId: string }[]>([])
  const [loaded, setLoaded] = useState(false)
  const [denied, setDenied] = useState(false)
  const [filterSection, setFilterSection] = useState("all")
  const [filterStudent, setFilterStudent] = useState("")
  const [query, setQuery] = useState("")
  const [toast, setToast] = useState("")
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 图片查看器
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImages, setViewerImages] = useState<ViewerImage[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)

  const openViewer = (urls: string[], idx = 0) => {
    setViewerImages(urls.map(u => ({ url: u, label: u.split("/").pop() || "佐证图片" })))
    setViewerIndex(idx)
    setViewerOpen(true)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(""), 1800)
  }

  const isManager = session?.user?.role === "admin" || (session?.user?.tags ?? []).length > 0

  const load = useCallback(async (userId?: string) => {
    const url = userId ? `/api/zongce/photos?userId=${userId}` : "/api/zongce/photos"
    const res = await fetch(url)
    if (res.status === 403) { setDenied(true); setLoaded(true); return }
    if (!res.ok) { setLoaded(true); return }
    const d = await res.json()
    setPhotos(d.photos || [])
    setMemory(d.memory || null)
    setDisk(d.disk || null)
    const map = new Map<string, { id: string; name: string; studentId: string }>()
    for (const p of d.photos || []) map.set(p.userId, { id: p.userId, name: p.name, studentId: p.studentId })
    setStudents(Array.from(map.values()))
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    if (filterStudent) load(filterStudent)
    else load()
  }, [status, filterStudent, load])

  const visible = useMemo(() => {
    let list = photos
    if (filterSection !== "all") list = list.filter(p => p.section === filterSection)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || p.studentId.includes(q))
    return list
  }, [photos, filterSection, query])

  if (status === "loading") return <div style={{ textAlign: "center", padding: 60, color: "#7A8A94" }}>加载中...</div>
  if (!session) return null

  if (denied || !isManager) {
    return (
      <>
      <div className="m-page-root">
        <header className="m-topbar">
          <Link className="m-back" href="/zongce" aria-label="返回综测"><ArrowLeft size={18} /></Link>
          <span className="m-title">照片中心<small>PHOTOS</small></span>
          <span className="m-year">2025-2026</span>
        </header>
        <div style={{ margin: "18px 16px 0", padding: "34px 24px", textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6 }}>
          <ShieldAlert size={28} style={{ color: "#A8B4BD", marginBottom: 12 }} />
          <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6 }}>无权访问</div>
          <div style={{ fontSize: 11.5, color: "var(--color-muted)" }}>仅负责综测板块的班委或管理员可查看照片中心</div>
        </div>
      </div>
      <div className="photos-desktop">
      <main className="zc-wrap">
        <button className="btn-ghost" onClick={() => router.push("/zongce")} style={{ marginBottom: 20 }}>
          <ArrowLeft size={14} /> 返回
        </button>
        <div className="card" style={{ textAlign: "center", padding: "60px 40px", background: "#fff" }}>
          <ShieldAlert size={32} style={{ color: "#A8B4BD", marginBottom: 12 }} />
          <h2 style={{ marginBottom: 8 }}>无权访问</h2>
          <p style={{ color: "#7A8A94", fontSize: ".88rem" }}>仅负责综测板块的班委或管理员可查看照片中心</p>
        </div>
      </main>
      </div>
      </>
    )
  }

  // ===== 移动版（设计稿 photos.html · 真实 API，≤640px 显示） =====
  const fileName = (url: string) => (url.split("/").pop() || "photo.jpg")
  const mobileView = (
    <div className="m-page-root">
      <header className="m-topbar">
        <Link className="m-back" href="/zongce" aria-label="返回综测"><ArrowLeft size={18} /></Link>
        <span className="m-title">照片中心<small>PHOTOS</small></span>
        <span className="m-year">2025-2026</span>
      </header>

      {/* 服务器状态卡 */}
      {disk && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "14px 16px", margin: "14px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".12em", color: "var(--color-muted)", textTransform: "uppercase" }}>磁盘占用</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--color-fg)" }}>
              {fmtGB(disk.used)} <small style={{ fontSize: 10, color: "var(--color-muted)", fontWeight: 400 }}>GB / {fmtGB(disk.total)} GB</small>
            </span>
          </div>
          <div style={{ height: 6, background: "#EBEFF5", borderRadius: 999, margin: "12px 0 14px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(disk.percent, 100)}%`, minWidth: 3, background: disk.percent > 85 ? "var(--color-danger)" : "var(--color-accent)", borderRadius: 999 }} />
          </div>
          <div style={{ display: "flex", gap: 26 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".12em", color: "var(--color-muted)", textTransform: "uppercase" }}>照片总数</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--color-fg)" }}>{photos.length} <small style={{ fontSize: 10, color: "var(--color-muted)", fontWeight: 400 }}>张</small></div>
            </div>
            {memory && (
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".12em", color: "var(--color-muted)", textTransform: "uppercase" }}>内存占用</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--color-fg)" }}>{fmtGB(memory.used)} <small style={{ fontSize: 10, color: "var(--color-muted)", fontWeight: 400 }}>GB</small></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 照片列表（2 列网格 · 真实缩略图，点击查看大图） */}
      <section style={{ padding: "18px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{
            display: "flex", alignItems: "center", gap: 9,
            fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700,
            letterSpacing: ".18em", textTransform: "uppercase", color: "var(--color-muted)",
          }}>照片库</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)" }}>{visible.length} 张</span>
        </div>
        {visible.length === 0 ? (
          <div style={{ padding: "44px 24px", textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, color: "var(--color-muted)", fontSize: 12 }}>
            <Images size={26} style={{ color: "#D5DBDF", marginBottom: 8, margin: "0 auto 8px", display: "block" }} />
            暂无佐证照片
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {visible.map((p, i) => (
              <button key={p.id + i} onClick={() => openViewer(visible.map(x => x.url), i)} style={{
                background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6,
                padding: "6px 6px 9px", display: "block", color: "inherit", textAlign: "left", cursor: "zoom-in", fontFamily: "inherit",
                transition: "transform .16s, border-color .16s", overflow: "hidden",
              }}>
                <div style={{ aspectRatio: "4 / 3", borderRadius: 4, overflow: "hidden", background: "#EDF0F5", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`${p.name} 佐证`} loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ padding: "7px 4px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: 600, color: "var(--color-fg)" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    <span className="chip none"><span className="lamp" />{p.section}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, color: "var(--color-muted-light)", letterSpacing: ".02em", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {fileName(p.url)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        佐证照片仅班委可见 · 上传后自动压缩归档<br /><b style={{ color: "var(--color-muted)", fontWeight: 600 }}>照片中心</b> · 2025-2026 学年
      </div>

      {/* 未适配占位 toast */}
      {toast && (
        <div style={{
          position: "fixed", left: "50%", bottom: "calc(84px + env(safe-area-inset-bottom))",
          transform: "translateX(-50%)", background: "rgba(26,29,34,.92)", color: "#fff",
          fontSize: 12.5, padding: "10px 18px", borderRadius: 8, zIndex: 200,
          maxWidth: "82vw", textAlign: "center", fontFamily: "var(--font-mono)",
        }}>{toast}</div>
      )}
    </div>
  )

  return (
    <>
    {mobileView}
    <div className="photos-desktop">
    <main className="zc-wrap">
      <button className="btn-ghost" onClick={() => router.push("/zongce")} style={{ marginBottom: 20 }}>
        <ArrowLeft size={14} /> 返回综测
      </button>
      <div style={{ marginBottom: 16 }}>
        <div className="eyebrow">审核管理</div>
        <h1 className="display" style={{ display: "block" }}>照片中心</h1>
        <div style={{ fontSize: ".75rem", color: "#7A8A94", marginTop: 4 }}>
          汇总各板块学生提交的佐证照片，共 {photos.length} 张 · {students.length} 名学生
        </div>
      </div>

      {/* 服务器磁盘存储 + 运行内存仪表盘 */}
      {(disk || memory) && (
        <div className="card" style={{ padding: "18px 24px", background: "#fff", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <HardDrive size={15} style={{ color: "#3D5A6E" }} />
            <span style={{ fontWeight: 700, fontSize: ".85rem" }}>服务器资源</span>
            <span style={{ fontSize: ".68rem", color: "#A8B4BD" }}>实时</span>
          </div>

          {/* 磁盘存储 */}
          {disk && (
            <div style={{ marginBottom: disk ? 18 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: ".72rem", color: "#556773", fontWeight: 600 }}>磁盘存储（照片存放）</span>
                <span style={{ fontSize: ".62rem", color: "#A8B4BD" }}>总 {fmtGB(disk.total)} GB</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 10 }}>
                <div className="stat" style={{ background: "#F9F8F5", borderRadius: 8, padding: "8px 14px" }}>
                  <div className="num" style={{ fontSize: "1.05rem" }}>{fmtGB(disk.used)} <span style={{ fontSize: ".58rem", color: "#A8B4BD" }}>GB</span></div>
                  <div className="lbl">已使用</div>
                </div>
                <div className="stat" style={{ background: "#F9F8F5", borderRadius: 8, padding: "8px 14px" }}>
                  <div className="num" style={{ fontSize: "1.05rem", color: disk.percent > 85 ? "#C4615A" : "#5A8C6F" }}>{fmtGB(disk.free)} <span style={{ fontSize: ".58rem", color: "#A8B4BD" }}>GB</span></div>
                  <div className="lbl">剩余</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, height: 8, borderRadius: 999, background: "#F1F0EC", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(disk.percent, 100)}%`, height: "100%", borderRadius: 999, background: disk.percent > 85 ? "#C4615A" : disk.percent > 60 ? "#C7924B" : "#5A8C6F" }} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: ".72rem", color: disk.percent > 85 ? "#C4615A" : "#556773", fontWeight: 600 }}>
                  {disk.percent}%
                </span>
              </div>
            </div>
          )}

          {/* 运行内存 */}
          {memory && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: ".72rem", color: "#556773", fontWeight: 600 }}>运行内存（RAM）</span>
                <span style={{ fontSize: ".62rem", color: "#A8B4BD" }}>总 {fmtGB(memory.total)} GB</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 10 }}>
                <div className="stat" style={{ background: "#F9F8F5", borderRadius: 8, padding: "8px 14px" }}>
                  <div className="num" style={{ fontSize: "1.05rem" }}>{fmtGB(memory.used)} <span style={{ fontSize: ".58rem", color: "#A8B4BD" }}>GB</span></div>
                  <div className="lbl">已使用</div>
                </div>
                <div className="stat" style={{ background: "#F9F8F5", borderRadius: 8, padding: "8px 14px" }}>
                  <div className="num" style={{ fontSize: "1.05rem", color: memory.percent > 85 ? "#C4615A" : "#5A8C6F" }}>{fmtGB(memory.free)} <span style={{ fontSize: ".58rem", color: "#A8B4BD" }}>GB</span></div>
                  <div className="lbl">剩余</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, height: 8, borderRadius: 999, background: "#F1F0EC", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(memory.percent, 100)}%`, height: "100%", borderRadius: 999, background: memory.percent > 85 ? "#C4615A" : memory.percent > 60 ? "#C7924B" : "#5A8C6F" }} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: ".72rem", color: memory.percent > 85 ? "#C4615A" : "#556773", fontWeight: 600 }}>
                  {memory.percent}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 筛选工具栏 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {SECTION_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilterSection(f.key)}
              className="tag" style={{
                cursor: "pointer",
                background: filterSection === f.key ? "#3D5A6E" : "#F9F8F5",
                color: filterSection === f.key ? "#fff" : "#7A8A94",
                border: `1px solid ${filterSection === f.key ? "#3D5A6E" : "#E8E3D9"}`,
                fontWeight: filterSection === f.key ? 600 : 400,
                padding: "5px 12px", fontSize: ".7rem",
              }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#A8B4BD" }} />
          <input className="form-input" placeholder="搜索姓名或学号..." value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ padding: "7px 12px 7px 30px", fontSize: ".78rem", width: 180 }} />
        </div>
      </div>

      {/* 学生快速筛选（有照片的学生） */}
      {students.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          <span style={{ fontSize: ".68rem", color: "#7A8A94", fontWeight: 600 }}>按学生查看</span>
          <button onClick={() => setFilterStudent("")} className="tag" style={{
            cursor: "pointer", padding: "4px 10px", fontSize: ".66rem",
            background: filterStudent === "" ? "#3D5A6E" : "#F9F8F5",
            color: filterStudent === "" ? "#fff" : "#7A8A94",
            border: `1px solid ${filterStudent === "" ? "#3D5A6E" : "#E8E3D9"}`,
          }}>全部</button>
          {students.map(s => (
            <button key={s.id} onClick={() => setFilterStudent(filterStudent === s.id ? "" : s.id)} className="tag" style={{
              cursor: "pointer", padding: "4px 10px", fontSize: ".66rem",
              background: filterStudent === s.id ? "#4A7C96" : "#F9F8F5",
              color: filterStudent === s.id ? "#fff" : "#7A8A94",
              border: `1px solid ${filterStudent === s.id ? "#4A7C96" : "#E8E3D9"}`,
            }}>{s.name}</button>
          ))}
        </div>
      )}

      {/* 照片网格 */}
      {!loaded ? (
        <div style={{ color: "#7A8A94", padding: "20px 0" }}>加载数据中...</div>
      ) : visible.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60, background: "#fff", color: "#7A8A94", fontSize: ".85rem" }}>
          <Images size={30} style={{ color: "#D5DBDF", marginBottom: 12 }} />
          <div>暂无佐证照片</div>
          <div style={{ fontSize: ".7rem", color: "#A8B4BD", marginTop: 6 }}>学生上传的综测佐证照片将汇总显示在这里</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {visible.map((p, i) => (
            <div key={p.id + i} className="card" style={{ padding: 0, overflow: "hidden", background: "#fff" }}>
              <a href={p.url} target="_blank" rel="noopener noreferrer" title="点击查看原图" style={{ display: "block", height: 150, background: "#F5F2ED", overflow: "hidden", position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`${p.name} 佐证`} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)" }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)" }} />
                <span style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 6, background: "rgba(0,0,0,.45)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ExternalLink size={12} />
                </span>
              </a>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: ".8rem" }}>{p.name}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: ".6rem", color: "#A8B4BD" }}>{p.studentId}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span className="tag tag-accent" style={{ fontSize: ".58rem", padding: "2px 8px" }}>{p.sectionLabel}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".6rem", color: STATUS_COLOR[p.status] || "#7A8A94" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[p.status] || "#A8B4BD" }} />
                    {STATUS_TEXT[p.status] || p.status}
                  </span>
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3, fontSize: ".58rem", color: "#A8B4BD" }}>
                    <Calendar size={9} /> {new Date(p.updatedAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 28 }}>
        <Link href="/zongce" className="btn-ghost" style={{ fontSize: ".75rem" }}>← 返回综测看板</Link>
      </div>
    </main>
    </div>

    {/* 图片查看器（移出桌面容器，移动端也可显示） */}
    {viewerOpen && (
      <ImageViewer
        images={viewerImages}
        index={viewerIndex}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setViewerIndex}
      />
    )}
    </>
  )
}
