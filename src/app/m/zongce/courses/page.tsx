"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Plus, Trash2, BookOpen } from "lucide-react"
import MobTopBar from "../../_components/MobTopBar"
import MobCard from "../../_components/MobCard"
import MobChip from "../../_components/MobChip"
import MobButton from "../../_components/MobButton"
import MobBottomSheet from "../../_components/MobBottomSheet"
import MobConfirm from "../../_components/MobConfirm"
import MobField from "../../_components/MobField"
import MobEmpty from "../../_components/MobEmpty"
import MobLoading from "../../_components/MobLoading"
import MobYearBadge from "../../_components/MobYearBadge"
import { useToast } from "../../_components/MobToast"

interface Course {
  id: string
  name: string
  credits: number
  semester: number
  isElective: boolean
  sortOrder: number
}

const SEMESTER_LABELS: Record<number, string> = { 1: "第一学期", 2: "第二学期" }
const YEAR = "2025-2026"

export default function MobileCoursesPage() {
  const { data: session, status } = useSession()
  const toast = useToast()

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newCredits, setNewCredits] = useState("")
  const [newSemester, setNewSemester] = useState(1)
  const [newElective, setNewElective] = useState(false)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [initOpen, setInitOpen] = useState(false)
  const [initializing, setInitializing] = useState(false)

  const isAdmin = session?.user?.role === "admin"
  const tags = session?.user?.tags ?? []
  const canManage = isAdmin || tags.includes("学习委员")

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch("/api/zongce/courses")
      if (res.ok) {
        const d = await res.json()
        setCourses(d.courses || [])
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "authenticated") fetchCourses()
  }, [status, fetchCourses])

  const resetForm = () => {
    setNewName("")
    setNewCredits("")
    setNewSemester(1)
    setNewElective(false)
  }

  const addCourse = async () => {
    if (!newName.trim() || !newCredits) {
      toast.error("请填写课程名称与学分")
      return
    }
    setSaving(true)
    try {
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
        toast.success("已添加课程")
        resetForm()
        setSheetOpen(false)
        fetchCourses()
      } else {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || "添加失败")
      }
    } catch {
      toast.error("网络异常，请重试")
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/zongce/courses?id=${deleteTarget.id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("已删除课程")
        setDeleteTarget(null)
        fetchCourses()
      } else {
        toast.error("删除失败")
      }
    } catch {
      toast.error("网络异常，请重试")
    } finally {
      setDeleting(false)
    }
  }

  const initCourses = async () => {
    setInitializing(true)
    try {
      const res = await fetch("/api/zongce/init", { method: "POST" })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(d.created > 0 ? `已初始化 ${d.created} 门预设课程` : (d.message || "课程已存在"))
        setInitOpen(false)
        fetchCourses()
      } else {
        toast.error(d.error || "初始化失败")
      }
    } catch {
      toast.error("网络异常，请重试")
    } finally {
      setInitializing(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="mob-page">
        <MobTopBar back title="课程配置" right={<MobYearBadge year={YEAR} />} />
        <MobLoading rows={6} />
      </div>
    )
  }
  if (!session) return null

  if (!canManage) {
    return (
      <div className="mob-page">
        <MobTopBar back title="课程配置" right={<MobYearBadge year={YEAR} />} />
        <MobEmpty icon={<BookOpen size={28} />} title="无权限" desc="仅学习委员或管理员可配置课程" />
      </div>
    )
  }

  return (
    <div className="mob-page" style={{ paddingBottom: 24 }}>
      <MobTopBar back title="课程配置" right={<MobYearBadge year={YEAR} />} />

      {[1, 2].map(sem => {
        const semesterCourses = courses.filter(c => c.semester === sem)
        if (semesterCourses.length === 0) return null
        return (
          <MobCard key={sem} title={SEMESTER_LABELS[sem]} extra={<span style={{ fontSize: 12, color: "var(--fg-3)" }}>{semesterCourses.length} 门</span>} padding={false}>
            {semesterCourses.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                  {c.isElective && <MobChip tone="neutral">任选课</MobChip>}
                </span>
                <span style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-num)", flex: "none" }}>{c.credits} 学分</span>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(c)}
                  aria-label={`删除${c.name}`}
                  style={{ color: "var(--danger)", flex: "none", display: "inline-flex", padding: 6 }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </MobCard>
        )
      })}

      {courses.length === 0 && (
        <MobEmpty icon={<BookOpen size={28} />} title="暂无课程" desc="请添加课程，或由管理员初始化预设课程" />
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <MobButton block variant="soft" onClick={() => { resetForm(); setSheetOpen(true) }}>
          <Plus size={16} /> 添加课程
        </MobButton>
        {isAdmin && (
          <MobButton block variant="ghost" onClick={() => setInitOpen(true)}>
            初始化预设课程
          </MobButton>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "6px 16px 0", fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.04em" }}>
        共 {courses.length} 门课程 · 学分与课程以教务系统为准
      </div>

      {/* 添加课程弹层 */}
      <MobBottomSheet open={sheetOpen} title="添加课程" onClose={() => setSheetOpen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MobField label="课程名称" required placeholder="如：高等数学A-1" value={newName} onChange={setNewName} />
          <MobField label="学分" required type="number" inputMode="decimal" min={0.5} step={0.5} placeholder="如：3" value={newCredits} onChange={setNewCredits} />
          <MobField
            label="学期"
            type="select"
            value={newSemester}
            onChange={v => setNewSemester(Number(v))}
            options={[{ value: "1", label: "第一学期" }, { value: "2", label: "第二学期" }]}
          />
          {/* 任选课开关 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-2)" }}>任选课</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>任选课不计入学习成绩</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={newElective}
              onClick={() => setNewElective(v => !v)}
              style={{
                width: 48, height: 28, borderRadius: 999, flex: "none", position: "relative",
                background: newElective ? "var(--primary)" : "var(--border-strong)", transition: "background 160ms var(--mob-ease)",
              }}
            >
              <span
                style={{
                  position: "absolute", top: 3, left: newElective ? 23 : 3, width: 22, height: 22, borderRadius: "50%",
                  background: "#fff", transition: "left 160ms var(--mob-ease)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>
          <MobButton block onClick={addCourse} loading={saving}>添加</MobButton>
        </div>
      </MobBottomSheet>

      {/* 删除确认 */}
      <MobConfirm
        open={deleteTarget !== null}
        title="删除课程"
        tone="danger"
        confirmText="删除"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      >
        确定删除课程「{deleteTarget?.name}」吗？删除后不可恢复。
      </MobConfirm>

      {/* 初始化确认 */}
      <MobConfirm
        open={initOpen}
        title="初始化预设课程"
        confirmText="初始化"
        loading={initializing}
        onCancel={() => setInitOpen(false)}
        onConfirm={initCourses}
      >
        将导入本学年 24 门预设课程（仅当课程表为空时生效），是否继续？
      </MobConfirm>
    </div>
  )
}
