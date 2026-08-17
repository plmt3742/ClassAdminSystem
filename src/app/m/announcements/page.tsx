"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Megaphone, Plus } from "lucide-react"
import MobTopBar from "../_components/MobTopBar"
import MobCard from "../_components/MobCard"
import MobChip from "../_components/MobChip"
import MobButton from "../_components/MobButton"
import MobListItem from "../_components/MobListItem"
import MobEmpty from "../_components/MobEmpty"
import MobLoading from "../_components/MobLoading"
import MobRoleGate from "../_components/MobRoleGate"

const COMMITTEE_TAGS = ["班长", "副班长", "团支书", "副团支书", "心理委员", "学习委员", "生活委员", "文体委员", "志愿队长", "组织委员", "宣传委员"]

interface Announcement {
  id: string; title: string; content: string; pinned: boolean
  authorId: string; authorName: string; createdAt: string; updatedAt: string
}

/** Format an ISO timestamp as MM-DD. */
const mmdd = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** 公告中心：置顶公告为头条卡，其余进入次级列表。发布按钮（班委/管理员可见）。 */
export default function MobileAnnouncementsPage() {
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/announcements")
      .then(r => r.json())
      .then((d: { announcements?: Announcement[] }) => setAnnouncements(d.announcements || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // 置顶公告作为头条（API 已按「置顶 + 时间」排序，取首个置顶项）
  const featured = announcements.find(a => a.pinned)
  const rest = announcements.filter(a => a.id !== featured?.id)

  return (
    <div className="mob-page">
      <MobTopBar
        title="公告"
        icon={<Megaphone size={17} />}
        right={
          <MobRoleGate allowedRoles={["admin"]} allowedTags={COMMITTEE_TAGS}>
            <MobButton size="sm" variant="soft" onClick={() => router.push("/m/announcements/new")}>
              <Plus size={14} /> 发布
            </MobButton>
          </MobRoleGate>
        }
      />

      {loading ? (
        <MobLoading rows={5} />
      ) : announcements.length === 0 ? (
        <MobEmpty icon={<Megaphone size={28} />} title="暂无公告" desc="班委发布的公告会显示在这里" />
      ) : (
        <>
          {featured && (
            <MobCard onClick={() => router.push(`/m/announcements/${featured.id}`)}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MobChip tone="info">置顶</MobChip>
                <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
                  {featured.authorName} · {mmdd(featured.createdAt)}
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, lineHeight: 1.5, color: "var(--fg)", marginTop: 10 }}>
                {featured.title}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--fg-3)" }}>全班可见</div>
            </MobCard>
          )}

          {rest.length > 0 && (
            <MobCard padding={false}>
              {rest.map(a => (
                <MobListItem
                  key={a.id}
                  title={a.title}
                  subtitle={`${a.authorName} · ${mmdd(a.createdAt)}`}
                  right={a.pinned ? <MobChip tone="info">置顶</MobChip> : undefined}
                  chevron
                  onClick={() => router.push(`/m/announcements/${a.id}`)}
                />
              ))}
            </MobCard>
          )}
        </>
      )}
    </div>
  )
}
