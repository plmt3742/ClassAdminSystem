"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  CalendarDays, Clock, MapPin, Send, Mail, Inbox, Check, X,
  FileText, Target, Star, UserPlus,
} from "lucide-react"
import MobTopBar from "../_components/MobTopBar"
import MobCard from "../_components/MobCard"
import MobChip from "../_components/MobChip"
import MobButton from "../_components/MobButton"
import MobBottomSheet from "../_components/MobBottomSheet"
import MobSegmented from "../_components/MobSegmented"
import MobField from "../_components/MobField"
import MobFab from "../_components/MobFab"
import MobProgress from "../_components/MobProgress"
import MobEmpty from "../_components/MobEmpty"
import MobLoading from "../_components/MobLoading"
import { useToast } from "../_components/MobToast"

type Tone = "ok" | "warn" | "danger" | "info" | "neutral" | "s" | "m" | "t"

interface UserLite { id: string; name: string; studentId?: string | null }
interface DrawItem {
  id: string; userId: string; round: number; status: string; source?: string
  delegateTo: string | null; delegateApproved: boolean
  user: UserLite; delegate: UserLite | null
}
interface Activity {
  id: string; title: string; description?: string | null; status: string; round: number; createdAt: string
  eventTime?: string | null; location?: string | null; link?: string | null
  draws: DrawItem[]; volunteers: { userId: string }[]
}
interface DelegationItem {
  id: string; userId: string; delegateTo: string | null; delegateApproved: boolean
  user: UserLite; delegate: UserLite | null
  activity: { id: string; title: string }
}
interface TimelineEvent {
  id: string; type: string; text: string; time: string
  activityId?: string; activityTitle?: string
}
interface RemainingStudent { id: string; name: string; studentId: string }

const statusChip = (status: string): { label: string; tone: Tone } => {
  if (status === "completed") return { label: "已完成", tone: "ok" }
  if (status === "cancelled") return { label: "已取消", tone: "neutral" }
  return { label: "进行中", tone: "info" }
}

/** 我在该活动中的参与身份（镜像桌面 myStatus 逻辑）。 */
function myBadge(a: Activity, myId?: string): string {
  if (!myId) return ""
  const myDraw = a.draws.find(d => d.userId === myId)
  const myDelegation = a.draws.find(d => d.delegateTo === myId)
  if (myDelegation?.delegateApproved) return `代 ${myDelegation.user.name} 参加`
  if (myDelegation && !myDelegation.delegateApproved) return "待我确认委托"
  if (myDraw?.status === "completed") return "已完成"
  if (myDraw?.status === "cancelled") return "已取消"
  if (myDraw?.status === "delegated" && myDraw.delegateApproved) return `已转交 ${myDraw.delegate?.name || ""}`
  if (myDraw?.status === "delegated") return "委托待确认"
  if (myDraw?.source === "volunteered") return "我报名"
  if (myDraw?.source === "assigned") return "被指定"
  if (myDraw) return "我抽中"
  return "关注中"
}

const timelineIcon = (type: string) => {
  switch (type) {
    case "activity_created": return <FileText size={15} style={{ color: "var(--primary)" }} />
    case "student_drawn": return <Target size={15} style={{ color: "var(--warn)" }} />
    case "delegation_requested": return <Send size={15} style={{ color: "var(--fg-3)" }} />
    case "delegation_accepted": return <Check size={15} style={{ color: "var(--ok)" }} />
    case "activity_completed": return <Check size={15} style={{ color: "var(--ok)" }} />
    case "round_completed": return <Star size={15} style={{ color: "var(--primary)" }} />
    case "volunteered": return <UserPlus size={15} style={{ color: "var(--fg-3)" }} />
    default: return <Clock size={15} style={{ color: "var(--fg-3)" }} />
  }
}

export default function MobileActivitiesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const toast = useToast()
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const myId = session?.user?.id
  const isAdmin = session?.user?.role === "admin"

  const [tab, setTab] = useState("mine")
  const [loading, setLoading] = useState(true)

  const [activities, setActivities] = useState<Activity[]>([])
  const [currentRound, setCurrentRound] = useState(1)
  const [totalStudents, setTotalStudents] = useState(45)
  const [remaining, setRemaining] = useState<RemainingStudent[]>([])
  const [incoming, setIncoming] = useState<DelegationItem[]>([])
  const [outgoing, setOutgoing] = useState<DelegationItem[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])

  // 创建活动表单
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [location, setLocation] = useState("")
  const [link, setLink] = useState("")
  const [creating, setCreating] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [res, grRes, delRes, tlRes] = await Promise.all([
        fetch("/api/activities"),
        fetch("/api/global-round"),
        fetch("/api/me/delegations"),
        fetch("/api/activity-events"),
      ])
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
        setCurrentRound(data.currentRound || 1)
      }
      if (grRes.ok) {
        const gr = await grRes.json()
        setCurrentRound(gr.currentRound || 1)
        setTotalStudents(gr.totalStudents || 45)
        setRemaining(gr.remaining || [])
      }
      if (delRes.ok) {
        const del = await delRes.json()
        setIncoming(del.incoming || [])
        setOutgoing(del.outgoing || [])
      }
      if (tlRes.ok) {
        const tl = await tlRes.json()
        setTimeline(tl.events || [])
      }
    } catch {
      toastRef.current.error("加载失败，请重试")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("请输入活动标题"); return }
    setCreating(true)
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: desc, eventTime, location, link }),
      })
      if (!res.ok) { toast.error("创建失败"); return }
      setTitle(""); setDesc(""); setEventTime(""); setLocation(""); setLink("")
      setCreateOpen(false)
      toast.success("活动已创建")
      fetchAll()
    } catch {
      toast.error("创建失败")
    } finally {
      setCreating(false)
    }
  }

  const handleDelegateAction = async (drawId: string, activityId: string, approve: boolean) => {
    try {
      const res = await fetch(`/api/activities/${activityId}/delegate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawId, approve }),
      })
      if (!res.ok) { toast.error("操作失败"); return }
      toast.success(approve ? "已同意代做" : "已拒绝")
      fetchAll()
    } catch {
      toast.error("操作失败")
    }
  }

  const mine = activities.filter(a => {
    const drawn = a.draws.some(d => d.userId === myId)
    const delegating = a.draws.some(d => d.delegateTo === myId)
    return drawn || delegating
  })

  const activeGroup = activities.filter(a => a.status === "pending" || a.status === "drawn")
  const completedGroup = activities.filter(a => a.status === "completed")
  const cancelledGroup = activities.filter(a => a.status === "cancelled")

  const progress = totalStudents > 0 ? Math.round(((totalStudents - remaining.length) / totalStudents) * 100) : 0

  const openDetail = (id: string) => router.push(`/m/activities/${id}`)

  return (
    <div className="mob-page">
      <MobTopBar title="活动" icon={<CalendarDays size={17} />} right={<MobChip tone="info">第 {currentRound} 轮</MobChip>} />

      {loading ? (
        <MobLoading rows={6} />
      ) : (
        <>
          {/* 轮次进度卡 */}
          <MobCard>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-2)" }}>本轮轮次 · 第 {currentRound} 轮</span>
              <MobChip tone={remaining.length > 0 ? "warn" : "ok"}>{remaining.length > 0 ? "抽签进行中" : "本轮已完成"}</MobChip>
            </div>
            <div style={{ fontFamily: "var(--font-num)", fontSize: 32, fontWeight: 700, lineHeight: 1, color: "var(--fg)" }}>
              {remaining.length}
              <span style={{ fontSize: 14, fontWeight: 400, color: "var(--fg-3)", marginLeft: 6 }}>/ {totalStudents} 人未参加</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <MobProgress value={progress} label={`已参与 ${totalStudents - remaining.length} 人`} showPercent={false} />
            </div>
          </MobCard>

          <MobSegmented
            equal
            options={[
              { value: "mine", label: "我的活动" },
              { value: "delegation", label: `委托${incoming.length > 0 ? ` (${incoming.length})` : ""}` },
              { value: "all", label: "全部" },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === "mine" && (
            mine.length === 0 ? (
              <MobEmpty icon={<CalendarDays size={28} />} title="暂无涉及的活动" desc="等待管理员抽签" />
            ) : (
              mine.map(a => (
                <ActivityCard key={a.id} activity={a} badge={myBadge(a, myId)} onOpen={() => openDetail(a.id)} />
              ))
            )
          )}

          {tab === "delegation" && (
            <DelegationPanel
              incoming={incoming}
              outgoing={outgoing}
              onApprove={(d) => handleDelegateAction(d.id, d.activity?.id || "", true)}
              onReject={(d) => handleDelegateAction(d.id, d.activity?.id || "", false)}
              onOpen={openDetail}
            />
          )}

          {tab === "all" && (
            activities.length === 0 ? (
              <MobEmpty icon={<Inbox size={28} />} title="暂无活动" desc="管理员可在右下角创建" />
            ) : (
              <>
                {activeGroup.length > 0 && (
                  <GroupHead label="进行中" count={activeGroup.length} />
                )}
                {activeGroup.map(a => (
                  <ActivityCard key={a.id} activity={a} badge={myBadge(a, myId)} onOpen={() => openDetail(a.id)} />
                ))}
                {completedGroup.length > 0 && (
                  <GroupHead label="已完成" count={completedGroup.length} />
                )}
                {completedGroup.map(a => (
                  <ActivityCard key={a.id} activity={a} badge={myBadge(a, myId)} onOpen={() => openDetail(a.id)} />
                ))}
                {cancelledGroup.length > 0 && (
                  <GroupHead label="已取消" count={cancelledGroup.length} />
                )}
                {cancelledGroup.map(a => (
                  <ActivityCard key={a.id} activity={a} badge={myBadge(a, myId)} onOpen={() => openDetail(a.id)} />
                ))}
              </>
            )
          )}

          {/* 近期动态 */}
          <GroupHead label="近期动态" count={timeline.length} />
          <MobCard padding={false}>
            {timeline.length === 0 ? (
              <MobEmpty icon={<Clock size={28} />} title="暂无动态" />
            ) : (
              timeline.slice(0, 20).map((ev, i) => (
                <TimelineRow key={ev.id} ev={ev} last={i === Math.min(timeline.length, 20) - 1} onOpen={openDetail} />
              ))
            )}
          </MobCard>
        </>
      )}

      {isAdmin && (
        <MobFab onClick={() => setCreateOpen(true)} label="创建活动" />
      )}

      {/* 创建活动弹层 */}
      <MobBottomSheet open={createOpen} title="创建活动" onClose={() => setCreateOpen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MobField label="活动标题" required value={title} onChange={setTitle} placeholder="如：迎新晚会布置" />
          <MobField label="活动描述" type="textarea" value={desc} onChange={setDesc} placeholder="活动描述（可选）" />
          <MobField label="活动时间">
            <input
              type="datetime-local"
              className="mob-field__control"
              value={eventTime}
              onChange={e => setEventTime(e.target.value)}
            />
          </MobField>
          <MobField label="活动地点" value={location} onChange={setLocation} placeholder="如：6A-301" />
          <MobField label="相关链接" value={link} onChange={setLink} placeholder="相关链接（可选）" />
          <MobButton block loading={creating} onClick={handleCreate}>
            {creating ? "创建中..." : "创建活动"}
          </MobButton>
        </div>
      </MobBottomSheet>
    </div>
  )
}

/* ---------- 列表子组件 ---------- */

function GroupHead({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "8px 2px 6px" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-num)", fontSize: 12, color: "var(--fg-3)" }}>{count} 项</span>
    </div>
  )
}

function ActivityCard({ activity, badge, onOpen }: { activity: Activity; badge: string; onOpen: () => void }) {
  const chip = statusChip(activity.status)
  const names = activity.draws
    .filter(d => d.status !== "cancelled")
    .map(d => (d.delegateApproved && d.delegate ? d.delegate : d.user))
  return (
    <MobCard onClick={onOpen}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", lineHeight: 1.35 }}>{activity.title}</div>
          {badge ? (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <MobChip tone={badgeTone(badge)}>{badge}</MobChip>
            </div>
          ) : null}
        </div>
        <MobChip tone={chip.tone}>{chip.label}</MobChip>
      </div>
      {(activity.eventTime || activity.location) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10, fontSize: 12, color: "var(--fg-3)" }}>
          {activity.eventTime && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={13} />{activity.eventTime}</span>
          )}
          {activity.location && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={13} />{activity.location}</span>
          )}
        </div>
      )}
      {names.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
          {names.slice(0, 5).map((u, i) => (
            <MobChip key={i} tone="neutral">{u.name}</MobChip>
          ))}
          {names.length > 5 && <MobChip tone="neutral">+{names.length - 5}</MobChip>}
        </div>
      )}
    </MobCard>
  )
}

function badgeTone(badge: string): Tone {
  if (badge === "我抽中" || badge === "我报名") return "info"
  if (badge === "待我确认委托" || badge === "委托待确认") return "warn"
  if (badge === "已完成" || badge.startsWith("代 ")) return "ok"
  if (badge === "已取消") return "neutral"
  return "neutral"
}

function DelegationPanel({
  incoming, outgoing, onApprove, onReject, onOpen,
}: {
  incoming: DelegationItem[]
  outgoing: DelegationItem[]
  onApprove: (d: DelegationItem) => void
  onReject: (d: DelegationItem) => void
  onOpen: (id: string) => void
}) {
  if (incoming.length === 0 && outgoing.length === 0) {
    return <MobEmpty icon={<Send size={28} />} title="暂无委托" desc="抽中后可委托他人代做" />
  }
  return (
    <>
      {incoming.map(d => (
        <MobCard key={d.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: "none", width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary-soft)", color: "var(--primary)" }}>
              <Mail size={18} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.4 }}>
                <b>{d.user?.name}</b> 请你代替参加
              </div>
              <button type="button" onClick={() => onOpen(d.activity?.id || "")} style={{ fontSize: 13, color: "var(--primary)", marginTop: 2, padding: 0 }}>
                {d.activity?.title || "活动"}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <MobButton size="sm" variant="ghost" style={{ color: "var(--danger)" }} onClick={() => onReject(d)}>
              <X size={14} /> 拒绝
            </MobButton>
            <MobButton size="sm" onClick={() => onApprove(d)}>
              <Check size={14} /> 同意
            </MobButton>
          </div>
        </MobCard>
      ))}
      {outgoing.map(d => (
        <MobCard key={d.id} onClick={() => onOpen(d.activity?.id || "")}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: "none", width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--fg-3)" }}>
              <Send size={18} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.4 }}>
                委托 <b>{d.delegate?.name}</b> 代替参加「{d.activity?.title || "活动"}」
              </div>
              <div style={{ marginTop: 4 }}>
                <MobChip tone={d.delegateApproved ? "ok" : "warn"}>{d.delegateApproved ? "已同意" : "等待回复"}</MobChip>
              </div>
            </div>
          </div>
        </MobCard>
      ))}
    </>
  )
}

function TimelineRow({ ev, last, onOpen }: { ev: TimelineEvent; last: boolean; onOpen: (id: string) => void }) {
  const d = new Date(ev.time)
  const timeStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 16px", borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <span style={{ flex: "none", marginTop: 1 }}>{timelineIcon(ev.type)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--fg-2)" }}>
          {ev.activityId || ev.activityTitle ? (
            <button
              type="button"
              onClick={() => ev.activityId && onOpen(ev.activityId)}
              style={{ fontWeight: 600, color: "var(--fg)", fontSize: 13, padding: 0 }}
            >
              {ev.activityTitle}
            </button>
          ) : null}
          {ev.activityId || ev.activityTitle ? " " : ""}
          {ev.text}
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2, fontFamily: "var(--font-num)" }}>{timeStr}</div>
      </div>
    </div>
  )
}
