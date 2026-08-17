"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Trash2, Save, ArrowLeft, Pencil } from "lucide-react"

interface Course {
  id: string
  name: string
  credits: number
  semester: number
  isElective: boolean
  sortOrder: number
}

const SEMESTER_LABELS: Record<number, string> = { 1: "第一学期", 2: "第二学期" }

export default function CoursesConfigPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState("")
  const [newCredits, setNewCredits] = useState("")
  const [newSemester, setNewSemester] = useState(1)
  const [newElective, setNewElective] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState("")
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(""), 1800)
  }

  const fetchCourses = useCallback(async () => {
    const res = await fetch("/api/zongce/courses")
    const d = await res.json()
    setCourses(d.courses || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCourses() }, [fetchCourses])

  const addCourse = async () => {
    if (!newName.trim() || !newCredits) return
    setSaving(true)
    const res = await fetch("/api/zongce/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        credits: Number(newCredits),
        semester: newSemester,
        isElective: newElective,
        sortOrder: courses.filter(c => c.semester === newSemester).length,
      }),
    })
    if (res.ok) {
      setNewName("")
      setNewCredits("")
      setNewElective(false)
      setShowAdd(false)
      fetchCourses()
    }
    setSaving(false)
  }

  const deleteCourse = async (id: string) => {
    if (!confirm("确定删除此课程？")) return
    await fetch(`/api/zongce/courses?id=${id}`, { method: "DELETE" })
    fetchCourses()
  }

  // Seed predefined courses
  const seedCourses = async () => {
    const preset = [
      // Semester 1
      { name: "形势与政策1", credits: 0.5, semester: 1, isElective: false },
      { name: "习近平新时代中国特色社会主义概论", credits: 3, semester: 1, isElective: false },
      { name: "中国近现代史纲要", credits: 3, semester: 1, isElective: false },
      { name: "线性代数", credits: 3, semester: 1, isElective: false },
      { name: "通识教育-自然科学经典导引", credits: 2, semester: 1, isElective: false },
      { name: "高等数学A-1", credits: 5, semester: 1, isElective: false },
      { name: "国际素养英语A-1", credits: 2, semester: 1, isElective: false },
      { name: "大学生心理健康教育课程", credits: 2, semester: 1, isElective: false },
      { name: "程序设计基础", credits: 3, semester: 1, isElective: false },
      { name: "体育1", credits: 1, semester: 1, isElective: false },
      { name: "计算机导论", credits: 2, semester: 1, isElective: false },
      { name: "军事技能", credits: 2, semester: 1, isElective: false },
      // Semester 2
      { name: "离散数学", credits: 3, semester: 2, isElective: false },
      { name: "通识教育-人文社科经典导引", credits: 2, semester: 2, isElective: false },
      { name: "形势与政策2", credits: 0.5, semester: 2, isElective: false },
      { name: "国际素养英语A2", credits: 2, semester: 2, isElective: false },
      { name: "高等数学A-2", credits: 5, semester: 2, isElective: false },
      { name: "思想道德与法治", credits: 3, semester: 2, isElective: false },
      { name: "数据结构与算法", credits: 4, semester: 2, isElective: false },
      { name: "军事理论", credits: 2, semester: 2, isElective: false },
      { name: "劳动教育", credits: 1, semester: 2, isElective: false },
      { name: "体育2", credits: 1, semester: 2, isElective: false },
      { name: "AI辅助程序设计实践", credits: 1, semester: 2, isElective: false },
      { name: "国家安全教育", credits: 1, semester: 2, isElective: false },
    ]

    for (let i = 0; i < preset.length; i++) {
      const c = preset[i]
      await fetch("/api/zongce/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...c, sortOrder: i + 1 }),
      })
    }
    fetchCourses()
  }

  if (loading) return <p className="empty-state">加载中...</p>
  if (!session) return null

  const isAdmin = session.user?.role === "admin"
  const tags: string[] = (session.user as any)?.tags || []
  const canManage = isAdmin || tags.includes("学习委员")

  if (!canManage) {
    return (
      <>
      <div className="m-page-root">
        <header className="m-topbar">
          <Link className="m-back" href="/zongce" aria-label="返回综测"><ArrowLeft size={18} /></Link>
          <span className="m-title">课程配置<small>COURSES</small></span>
          <span className="m-year">2025-2026</span>
        </header>
        <div style={{ margin: "18px 16px 0", padding: "34px 24px", textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12.5, color: "var(--color-muted)" }}>
          仅学习委员或管理员可配置课程
        </div>
      </div>
      <div className="courses-desktop">
      <main style={{ width: "min(480px, calc(100vw - 56px))", margin: "0 auto", padding: "36px 0 80px" }}>
        <p className="empty-state">仅学习委员或管理员可配置课程</p>
      </main>
      </div>
      </>
    )
  }

  // ===== 移动版（设计稿 courses.html · 真实 API，≤640px 显示） =====
  const mobileView = (
    <div className="m-page-root">
      <header className="m-topbar">
        <Link className="m-back" href="/zongce" aria-label="返回综测"><ArrowLeft size={18} /></Link>
        <span className="m-title">课程配置<small>COURSES</small></span>
        <span className="m-year">2025-2026</span>
      </header>

      {[1, 2].map(sem => {
        const semesterCourses = courses.filter(c => c.semester === sem)
        if (semesterCourses.length === 0) return null
        return (
          <section key={sem} style={{ padding: "18px 16px 0" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{
                display: "flex", alignItems: "center", gap: 9,
                fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700,
                letterSpacing: ".18em", textTransform: "uppercase", color: "var(--color-muted)",
              }}>{SEMESTER_LABELS[sem]}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)" }}>{semesterCourses.length} 门</span>
            </div>
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "4px 16px 8px" }}>
              {semesterCourses.map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 2px", borderBottom: "1px solid var(--color-border)" }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--color-fg)", lineHeight: 1.4, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                    {c.isElective && <span className="chip none"><span className="lamp" />任选课</span>}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-muted)", flex: "none" }}>{c.credits} 学分</span>
                  <button onClick={() => showToast("编辑课程 · 待适配")} aria-label={`编辑${c.name}`} style={{
                    color: "var(--color-muted-light)", flex: "none", padding: 8, background: "none", border: "none", cursor: "pointer", display: "inline-flex",
                  }}>
                    <Pencil size={13} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <div style={{ fontSize: 10.5, color: "var(--color-muted)", padding: "12px 16px 0" }}>
        共 {courses.length} 门课程 · 学分与课程以教务系统为准
      </div>

      {/* 添加课程 */}
      <div style={{ padding: "14px 16px 0" }}>
        <button onClick={() => showToast("添加课程 · 待适配")} style={{
          width: "100%", minHeight: 44, border: "1px dashed var(--color-border-strong)", borderRadius: 6,
          background: "transparent", color: "var(--color-accent)", cursor: "pointer",
          fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <Plus size={15} /> 添加课程
        </button>
      </div>

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        课程数据由学习委员维护 · 影响 S 板块成绩换算<br /><b style={{ color: "var(--color-muted)", fontWeight: 600 }}>课程配置</b> · 2025-2026 学年
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
    <div className="courses-desktop">
    <main style={{ width: "min(720px, calc(100vw - 56px))", margin: "0 auto", padding: "36px 0 80px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <button className="btn-ghost" onClick={() => router.push("/zongce")}>
          ← 返回综测
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          {courses.length === 0 && (
            <button className="btn-secondary" onClick={seedCourses} style={{ fontSize: "0.8rem" }}>
              <Save size={14} /> 导入预设课程
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ fontSize: "0.8rem" }}>
            <Plus size={14} /> 添加课程
          </button>
        </div>
      </div>

      <div className="section-head">
        <div>
          <div className="eyebrow">课程配置</div>
          <h2>本学年课程列表</h2>
        </div>
        <span style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>共 {courses.length} 门</span>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto auto auto", gap: 10, alignItems: "end" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">课程名称</label>
              <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="如：高等数学A-1" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">学分</label>
              <input className="form-input" type="number" step="0.5" min="0.5" value={newCredits} onChange={e => setNewCredits(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">学期</label>
              <select className="form-input" value={newSemester} onChange={e => setNewSemester(Number(e.target.value))}>
                <option value={1}>第一学期</option>
                <option value={2}>第二学期</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" id="elective" checked={newElective} onChange={e => setNewElective(e.target.checked)} style={{ width: 16, height: 16 }} />
              <label htmlFor="elective" style={{ fontSize: "0.78rem", whiteSpace: "nowrap", color: "var(--color-muted)" }}>任选课</label>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn-primary" onClick={addCourse} disabled={saving} style={{ padding: "10px 14px", fontSize: "0.78rem" }}>
                添加
              </button>
              <button className="btn-ghost" onClick={() => setShowAdd(false)} style={{ padding: "10px 14px" }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Course list by semester */}
      {[1, 2].map(sem => {
        const semesterCourses = courses.filter(c => c.semester === sem)
        if (semesterCourses.length === 0) return null
        return (
          <div key={sem} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: "1rem", marginBottom: 12, color: "var(--color-fg-secondary)" }}>
              {SEMESTER_LABELS[sem]} ({semesterCourses.length}门)
            </h3>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-alt)" }}>
                    <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "var(--color-muted)", fontSize: "0.7rem" }}>#</th>
                    <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "var(--color-muted)", fontSize: "0.7rem" }}>课程名称</th>
                    <th style={{ textAlign: "center", padding: "10px 16px", fontWeight: 600, color: "var(--color-muted)", fontSize: "0.7rem", width: 60 }}>学分</th>
                    <th style={{ textAlign: "center", padding: "10px 16px", fontWeight: 600, color: "var(--color-muted)", fontSize: "0.7rem", width: 60 }}>类型</th>
                    <th style={{ textAlign: "center", padding: "10px 16px", fontWeight: 600, color: "var(--color-muted)", fontSize: "0.7rem", width: 50 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterCourses.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "10px 16px", color: "var(--color-muted)", fontSize: "0.72rem" }}>{i + 1}</td>
                      <td style={{ padding: "10px 16px", fontWeight: 500 }}>{c.name}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{c.credits}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}>
                        {c.isElective ? <span className="tag" style={{ fontSize: "0.62rem" }}>任选</span> : <span className="tag tag-accent" style={{ fontSize: "0.62rem" }}>必修</span>}
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}>
                        <button className="btn-ghost" onClick={() => deleteCourse(c.id)} style={{ padding: "4px 6px", minHeight: 28, color: "var(--color-danger)" }}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {courses.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "var(--color-muted)", marginBottom: 16 }}>暂无课程，请添加或导入预设课程</p>
          <button className="btn-secondary" onClick={seedCourses}>
            <Save size={14} /> 导入预设课程（24门）
          </button>
        </div>
      )}
    </main>
    </div>
    </>
  )
}
