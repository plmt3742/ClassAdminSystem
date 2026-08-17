"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { FileText, Pencil, Trash2 } from "lucide-react"
import MobTopBar from "../../_components/MobTopBar"
import MobCard from "../../_components/MobCard"
import MobChip from "../../_components/MobChip"
import MobButton from "../../_components/MobButton"
import MobBottomSheet from "../../_components/MobBottomSheet"
import MobConfirm from "../../_components/MobConfirm"
import MobField from "../../_components/MobField"
import MobLoading from "../../_components/MobLoading"
import MobEmpty from "../../_components/MobEmpty"
import { useToast } from "../../_components/MobToast"

interface Announcement {
  id: string; title: string; content: string; pinned: boolean
  authorId: string; authorName: string; createdAt: string; updatedAt: string
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  })
}

/** 置顶开关：受控布尔开关。 */
function PinSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="置顶公告"
      onClick={() => onChange(!checked)}
      style={{
        width: 46,
        height: 26,
        borderRadius: 999,
        flexShrink: 0,
        position: "relative",
        background: checked ? "var(--primary)" : "var(--border-strong)",
        transition: "background 160ms var(--mob-ease)",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 23 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 2px rgba(23, 32, 43, 0.25)",
          transition: "left 160ms var(--mob-ease)",
        }}
      />
    </button>
  )
}

/** 公告详情：文章视图；作者/管理员可编辑（底部弹层 PUT）与删除（危险确认 DELETE）。 */
export default function MobileAnnouncementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const toast = useToast()
  const id = params.id as string

  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)

  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editPinned, setEditPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState("")

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchAnnouncement = useCallback(async () => {
    try {
      const res = await fetch(`/api/announcements/${id}`)
      if (res.ok) {
        const d = await res.json()
        setAnnouncement(d.announcement)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAnnouncement() }, [fetchAnnouncement])

  // 与桌面端一致：作者（session.user.id === authorId）或管理员可编辑/删除
  const isAuthor = session?.user?.id === announcement?.authorId
  const isAdmin = session?.user?.role === "admin"
  const canEdit = isAuthor || isAdmin

  const openEdit = () => {
    if (!announcement) return
    setEditTitle(announcement.title)
    setEditContent(announcement.content)
    setEditPinned(announcement.pinned)
    setEditError("")
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!editTitle.trim()) { setEditError("请输入标题"); return }
    if (!editContent.trim()) { setEditError("请输入内容"); return }
    setSaving(true)
    setEditError("")
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim(), pinned: editPinned }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setEditError(d.error || "保存失败")
        setSaving(false)
        return
      }
      const d = await res.json()
      setAnnouncement(d.announcement)
      setEditOpen(false)
      toast.success("已保存")
    } catch {
      setEditError("保存失败，请重试")
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("已删除")
        router.replace("/m/announcements")
      } else {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || "删除失败")
        setDeleting(false)
      }
    } catch {
      toast.error("删除失败，请重试")
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="mob-page">
        <MobTopBar title="公告详情" back />
        <MobLoading rows={6} />
      </div>
    )
  }

  if (!announcement) {
    return (
      <div className="mob-page">
        <MobTopBar title="公告详情" back />
        <MobEmpty icon={<FileText size={28} />} title="公告不存在" desc="该公告可能已被删除" />
      </div>
    )
  }

  return (
    <div className="mob-page">
      <MobTopBar title="公告详情" back />

      <MobCard>
        {announcement.pinned && (
          <div style={{ marginBottom: 8 }}>
            <MobChip tone="info">置顶</MobChip>
          </div>
        )}
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, lineHeight: 1.5, color: "var(--fg)" }}>
          {announcement.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12, color: "var(--fg-3)" }}>
          <span style={{ color: "var(--primary)", fontWeight: 600 }}>{announcement.authorName}</span>
          <span>{formatDate(announcement.createdAt)}</span>
          <span>· 全班</span>
        </div>
      </MobCard>

      <MobCard>
        <div style={{ fontSize: 14.5, lineHeight: 1.85, color: "var(--fg-2)", whiteSpace: "pre-wrap", textAlign: "justify" }}>
          {announcement.content}
        </div>
      </MobCard>

      {canEdit && (
        <div style={{ display: "flex", gap: 10 }}>
          <MobButton variant="ghost" style={{ flex: 1 }} onClick={openEdit}>
            <Pencil size={16} /> 编辑
          </MobButton>
          <MobButton variant="danger" style={{ flex: 1 }} onClick={() => setDeleteOpen(true)}>
            <Trash2 size={16} /> 删除
          </MobButton>
        </div>
      )}

      <MobBottomSheet open={editOpen} title="编辑公告" onClose={() => setEditOpen(false)}>
        <MobField label="标题" required maxLength={40} value={editTitle} onChange={setEditTitle} placeholder="请输入公告标题" />
        <div style={{ marginTop: 14 }}>
          <MobField label="内容" type="textarea" required value={editContent} onChange={setEditContent} placeholder="请输入公告内容" />
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 16,
          padding: "13px 14px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-control)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>置顶公告</div>
          <PinSwitch checked={editPinned} onChange={setEditPinned} />
        </div>
        {editError && <div style={{ marginTop: 12, fontSize: 13, color: "var(--danger)" }}>{editError}</div>}
        <div style={{ marginTop: 16 }}>
          <MobButton block loading={saving} onClick={handleSave}>保存</MobButton>
        </div>
      </MobBottomSheet>

      <MobConfirm
        open={deleteOpen}
        title="删除公告"
        tone="danger"
        confirmText="删除"
        loading={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      >
        删除后不可恢复，请谨慎操作。
      </MobConfirm>
    </div>
  )
}
