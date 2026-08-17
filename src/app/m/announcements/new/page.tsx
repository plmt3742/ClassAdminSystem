"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import MobTopBar from "../../_components/MobTopBar"
import MobCard from "../../_components/MobCard"
import MobField from "../../_components/MobField"
import MobButton from "../../_components/MobButton"
import { useToast } from "../../_components/MobToast"

const COMMITTEE_TAGS = ["班长", "副班长", "团支书", "副团支书", "心理委员", "学习委员", "生活委员", "文体委员", "志愿队长", "组织委员", "宣传委员"]

/** 置顶开关：受控布尔开关（主色轨道 + 白色圆钮）。 */
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

/** 发布公告：标题（40 字）+ 正文 + 置顶开关 → POST /api/announcements。 */
export default function MobileNewAnnouncementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const isCommittee = (() => {
    if (!session?.user) return false
    if (session.user.role === "admin") return true
    const tags = session.user.tags || []
    return COMMITTEE_TAGS.some(t => tags.includes(t))
  })()

  useEffect(() => {
    if (status !== "loading" && !isCommittee) router.replace("/m/announcements")
  }, [status, isCommittee, router])

  const handleSubmit = async () => {
    if (!title.trim()) { setError("请输入公告标题"); return }
    if (!content.trim()) { setError("请输入公告内容"); return }
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), pinned }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || "发布失败")
        setSaving(false)
        return
      }
      const d = await res.json()
      toast.success("发布成功")
      if (d.announcement?.id) router.replace(`/m/announcements/${d.announcement.id}`)
      else router.replace("/m/announcements")
    } catch {
      setError("发布失败，请重试")
      setSaving(false)
    }
  }

  if (status === "loading") return null
  if (!isCommittee) return null

  return (
    <div className="mob-page">
      <MobTopBar title="发布公告" back />

      <MobCard>
        <MobField
          label="公告标题"
          required
          maxLength={40}
          value={title}
          onChange={setTitle}
          placeholder="请输入公告标题"
          hint={`${title.length}/40`}
        />
        <div style={{ marginTop: 14 }}>
          <MobField
            label="公告内容"
            type="textarea"
            required
            value={content}
            onChange={setContent}
            placeholder="请输入公告正文内容…"
          />
        </div>

        {error && (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--danger)" }}>{error}</div>
        )}

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
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>置顶公告</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>置顶后显示在公告列表首位</div>
          </div>
          <PinSwitch checked={pinned} onChange={setPinned} />
        </div>
      </MobCard>

      <MobButton block loading={saving} onClick={handleSubmit}>
        {saving ? "发布中..." : "发布"}
      </MobButton>

      <div style={{ textAlign: "center", padding: "16px 0 8px", fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.04em" }}>
        发布后将推送给全班同学 · 班委权限
      </div>
    </div>
  )
}
