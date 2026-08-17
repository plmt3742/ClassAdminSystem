"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toPng } from "html-to-image"
import {
  Clock, MapPin, ExternalLink, Copy, Download, Send, UserPlus,
  RefreshCw, Check, X, Trash2, Pencil, Target, Mail, Inbox, CalendarDays,
} from "lucide-react"
import MobTopBar from "../../_components/MobTopBar"
import MobCard from "../../_components/MobCard"
import MobChip from "../../_components/MobChip"
import MobButton from "../../_components/MobButton"
import MobBottomSheet from "../../_components/MobBottomSheet"
import MobSegmented from "../../_components/MobSegmented"
import MobField from "../../_components/MobField"
import MobEmpty from "../../_components/MobEmpty"
import MobLoading from "../../_components/MobLoading"
import MobConfirm from "../../_components/MobConfirm"
import MobListItem from "../../_components/MobListItem"
import MobAvatar from "../../_components/MobAvatar"
import { useToast } from "../../_components/MobToast"

type Tone = "ok" | "warn" | "danger" | "info" | "neutral" | "s" | "m" | "t"

interface UserLite { id: string; name: string; studentId?: string | null }
interface DrawItem {
  id: string; userId: string; studentId?: string | null; round: number; status: string; source?: string
  delegateTo: string | null; delegateApproved: boolean
  user: UserLite; delegate: UserLite | null
}
interface VolunteerItem { id: string; userId: string; user: UserLite }
interface ActivityDetail {
  id: string; title: string; description?: string | null; status: string; createdAt: string
  eventTime?: string | null; location?: string | null; link?: string | null
  draws: DrawItem[]; volunteers: VolunteerItem[]
}

const STATUS_OPTIONS = ["抽签", "报名", "指定参与", "已完成", "已取消"]

type ConfirmAction = "complete" | "cancel" | "resume" | "delete" | "deleteDraw"
interface ConfirmState { action: ConfirmAction; drawId?: string; name?: string }

const drawLabel = (d: DrawItem): string => {
  if (d.status === "delegated") return d.delegateApproved ? "已转交" : "委托中"
  if (d.status === "completed") return "已完成"
  if (d.status === "cancelled") return "已取消"
  if (d.source === "volunteered") return "报名"
  if (d.source === "assigned") return "指定参与"
  return "抽签"
}

const drawTone = (d: DrawItem): Tone => {
  if (d.status === "completed") return "ok"
  if (d.status === "cancelled") return "neutral"
  if (d.status === "delegated") return d.delegateApproved ? "info" : "warn"
  if (d.source === "volunteered") return "ok"
  if (d.source === "assigned") return "warn"
  return "info"
}

export default function MobileActivityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const toast = useToast()

  const id = params.id as string
  const myId = session?.user?.id
  const isAdmin = session?.user?.role === "admin"
  const isGuest = session?.user?.role === "guest"

  const [activity, setActivity] = useState<ActivityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentRound, setCurrentRound] = useState(1)
  const [remainingCount, setRemainingCount] = useState(0)

  // 抽签
  const [drawOpen, setDrawOpen] = useState(false)
  const [drawCount, setDrawCount] = useState(1)
  const [drawing, setDrawing] = useState(false)
  const [lastDraw, setLastDraw] = useState<{ names: string[]; roundAdvanced: boolean } | null>(null)

  // 指定参与
  const [assignOpen, setAssignOpen] = useState(false)
  const [allStudents, setAllStudents] = useState<UserLite[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [assignSource, setAssignSource] = useState<"assigned" | "volunteered">("assigned")
  const [assigning, setAssigning] = useState(false)

  // 委托他人
  const [delegateDrawId, setDelegateDrawId] = useState<string | null>(null)
  const [searchQ, setSearchQ] = useState("")
  const [searchRes, setSearchRes] = useState<UserLite[]>([])

  // 编辑
  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editTime, setEditTime] = useState("")
  const [editLoc, setEditLoc] = useState("")
  const [editLink, setEditLink] = useState("")
  const [saving, setSaving] = useState(false)

  // 修改状态
  const [statusDrawId, setStatusDrawId] = useState<string | null>(null)

  // 确认框
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const [exporting, setExporting] = useState(false)

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/activities/${id}`)
    if (res.ok) setActivity((await res.json()).activity)
  }, [id])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  useEffect(() => {
    fetch("/api/global-round")
      .then(r => r.json())
      .then(d => {
        setCurrentRound(d.currentRound || 1)
        setRemainingCount(d.remaining?.length || 0)
      })
      .catch(() => {})
  }, [])

  /* ---------- 操作 ---------- */

  const handleDraw = async () => {
    setDrawing(true)
    try {
      const res = await fetch(`/api/activities/${id}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: drawCount }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "抽签失败"); return }
      const names: string[] = ((d.draws as { user?: UserLite }[]) || [])
        .map(dd => dd.user?.name || "")
        .filter(Boolean)
      setLastDraw({ names, roundAdvanced: Boolean(d.roundAdvanced) })
      setDrawOpen(false)
      toast.success(`已抽中 ${names.length} 人`)
      if (d.roundAdvanced) toast.success(`本轮人数不足，已自动进入第 ${d.currentRound} 轮`)
      refresh()
    } catch {
      toast.error("抽签失败")
    } finally {
      setDrawing(false)
    }
  }

  const openAssign = async () => {
    setAssignOpen(true)
    if (allStudents.length === 0) {
      try {
        const res = await fetch("/api/members")
        if (res.ok) setAllStudents((await res.json()).members || [])
      } catch {
        toast.error("加载成员失败")
      }
    }
  }

  const handleAssign = async () => {
    if (selectedIds.size === 0) { toast.error("请选择至少一名学生"); return }
    setAssigning(true)
    try {
      const res = await fetch(`/api/activities/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [...selectedIds], source: assignSource }),
      })
      if (!res.ok) { toast.error("指定失败"); return }
      toast.success(`已指定 ${selectedIds.size} 人参与`)
      setAssignOpen(false)
      setSelectedIds(new Set())
      refresh()
    } catch {
      toast.error("指定失败")
    } finally {
      setAssigning(false)
    }
  }

  const handleVolunteer = async () => {
    try {
      const res = await fetch(`/api/activities/${id}/volunteer`, { method: "POST" })
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "" }))
        toast.error(d.error || "报名失败")
        return
      }
      toast.success("报名成功")
      refresh()
    } catch {
      toast.error("报名失败")
    }
  }

  const handleCancelVolunteer = async (drawId: string) => {
    try {
      const res = await fetch(`/api/activities/${id}/volunteer`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "" }))
        toast.error(d.error || "取消失败")
        return
      }
      toast.success("已取消报名")
      refresh()
    } catch {
      toast.error("取消失败")
    }
  }

  const handleApprove = async (drawId: string, approve: boolean) => {
    try {
      const res = await fetch(`/api/activities/${id}/delegate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawId, approve }),
      })
      if (!res.ok) { toast.error("操作失败"); return }
      toast.success(approve ? "已同意代做" : "已拒绝")
      refresh()
    } catch {
      toast.error("操作失败")
    }
  }

  const handleSearch = async (q: string) => {
    setSearchQ(q)
    if (q.trim().length < 1) { setSearchRes([]); return }
    try {
      const res = await fetch(`/api/search-students?q=${encodeURIComponent(q)}`)
      if (res.ok) setSearchRes((await res.json()).students || [])
    } catch {
      setSearchRes([])
    }
  }

  const handleDelegate = async (drawId: string, targetUserId: string) => {
    try {
      const res = await fetch(`/api/activities/${id}/delegate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawId, targetUserId }),
      })
      if (!res.ok) { toast.error("委托失败"); return }
      toast.success("已发起委托，等待对方确认")
      setDelegateDrawId(null)
      setSearchQ("")
      setSearchRes([])
      refresh()
    } catch {
      toast.error("委托失败")
    }
  }

  const openEdit = () => {
    if (!activity) return
    setEditTitle(activity.title)
    setEditDesc(activity.description || "")
    setEditTime(activity.eventTime || "")
    setEditLoc(activity.location || "")
    setEditLink(activity.link || "")
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editTitle.trim()) { toast.error("标题不能为空"); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/activities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, description: editDesc, eventTime: editTime, location: editLoc, link: editLink }),
      })
      if (!res.ok) { toast.error("保存失败"); return }
      toast.success("已保存")
      setEditOpen(false)
      refresh()
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDrawStatus = async (drawId: string, label: string) => {
    try {
      const res = await fetch(`/api/draws/${drawId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      })
      if (!res.ok) { toast.error("修改失败"); return }
      toast.success("状态已更新")
      setStatusDrawId(null)
      refresh()
    } catch {
      toast.error("修改失败")
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("删除失败"); return }
      toast.success("活动已删除")
      router.push("/m/activities")
    } catch {
      toast.error("删除失败")
    }
  }

  const runConfirm = async () => {
    if (!confirm) return
    setConfirmBusy(true)
    try {
      let res: Response | null = null
      if (confirm.action === "complete") res = await fetch(`/api/activities/${id}/complete`, { method: "POST" })
      else if (confirm.action === "cancel") res = await fetch(`/api/activities/${id}/cancel`, { method: "POST" })
      else if (confirm.action === "resume") res = await fetch(`/api/activities/${id}/resume`, { method: "POST" })
      else if (confirm.action === "delete") res = await fetch(`/api/activities/${id}`, { method: "DELETE" })
      else if (confirm.action === "deleteDraw" && confirm.drawId) res = await fetch(`/api/draws/${confirm.drawId}/delete`, { method: "DELETE" })

      if (!res || !res.ok) { toast.error("操作失败"); return }
      if (confirm.action === "delete") {
        toast.success("活动已删除")
        router.push("/m/activities")
        return
      }
      toast.success(confirm.action === "deleteDraw" ? "已删除抽签记录" : "操作成功")
      refresh()
    } catch {
      toast.error("操作失败")
    } finally {
      setConfirmBusy(false)
      setConfirm(null)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("链接已复制")
    } catch {
      toast.error("复制失败")
    }
  }

  const handleExport = async () => {
    if (!activity) return
    setExporting(true)
    try {
      const draws = activity.draws.filter(d => d.status !== "cancelled")
      const now = new Date().toLocaleString("zh-CN")
      const statusText = activity.status === "completed" ? "已完成" : activity.status === "cancelled" ? "已取消" : activity.status === "drawn" ? "进行中" : "待开始"
      const el = document.createElement("div")
      el.innerHTML = `<div style="font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif;background:#F4F6F9;padding:36px 48px;display:flex;justify-content:center"><div style="background:#fff;width:520px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06)">
<div style="background:#3B6B8A;padding:32px 36px;color:#fff">
<div style="display:inline-block;padding:2px 10px;border-radius:6px;font-size:11px;font-weight:600;background:rgba(255,255,255,0.18);margin-bottom:10px">${statusText}</div>
<h1 style="font-size:22px;font-weight:800;margin:0;letter-spacing:-0.01em">${activity.title}</h1></div>
<div style="padding:28px 36px">
${activity.eventTime ? `<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:14px"><span style="color:#94A3B8;font-size:12px;font-weight:600;width:56px;flex-shrink:0">时间</span><span style="color:#1E293B">${activity.eventTime}</span></div>` : ""}
${activity.location ? `<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:14px"><span style="color:#94A3B8;font-size:12px;font-weight:600;width:56px;flex-shrink:0">地点</span><span style="color:#1E293B">${activity.location}</span></div>` : ""}
<div style="display:flex;align-items:center;justify-content:space-between;margin:24px 0 12px"><span style="font-size:15px;font-weight:700;color:#1E293B">参与名单</span><span style="font-size:12px;color:#94A3B8">共 ${draws.length} 人</span></div>
${draws.length === 0 ? '<div style="text-align:center;padding:24px;color:#94A3B8;font-size:13px">暂无参与记录</div>' : draws.map(d => {
        const eff = d.delegateApproved && d.delegate ? d.delegate : d.user
        const tagText = d.source === "volunteered" ? "自行报名" : d.source === "assigned" ? "指定参与" : "抽签"
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:13px"><div style="width:32px;height:32px;border-radius:50%;background:#E8F0F5;color:#3B6B8A;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">${eff.name.charAt(0)}</div><div style="flex:1"><div style="font-weight:600;color:#1E293B">${eff.name}${d.delegateApproved && d.delegate ? ' <span style="font-weight:400;color:#94A3B8;font-size:11px">(由 ' + d.user.name + ' 转交)</span>' : ''}</div><div style="color:#94A3B8;font-size:11px">${eff.studentId || ""}</div></div><div style="padding:2px 8px;border-radius:100px;font-size:10px;font-weight:600;background:#E8F0F5;color:#3B6B8A">${tagText}</div></div>`
      }).join("")}</div>
<div style="padding:16px 36px;border-top:1px solid #F1F5F9;display:flex;justify-content:space-between;font-size:11px;color:#CBD5E1"><span>班务管理系统</span><span>导出时间: ${now}</span></div></div></div>`
      el.style.position = "fixed"
      el.style.left = "-9999px"
      el.style.top = "-9999px"
      el.style.width = "620px"
      document.body.appendChild(el)
      await new Promise(r => requestAnimationFrame(r))
      const dataUrl = await toPng(el.firstElementChild as HTMLElement, { pixelRatio: 2 })
      const a = document.createElement("a")
      a.download = `${activity.title}.png`
      a.href = dataUrl
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      document.body.removeChild(el)
      toast.success("已导出图片")
    } catch {
      toast.error("导出失败")
    } finally {
      setExporting(false)
    }
  }

  /* ---------- 派生数据 ---------- */

  const isActive = activity ? activity.status === "pending" || activity.status === "drawn" : false
  const statusText = !activity ? "" : isActive ? "进行中" : activity.status === "completed" ? "已完成" : "已取消"
  const statusTone: Tone = isActive ? "info" : activity?.status === "completed" ? "ok" : "neutral"

  const myDraw = activity?.draws.find(d => d.userId === myId && d.status === "drawn" && isActive)
  const myVolunteerDraw = activity?.draws.find(d => d.userId === myId && d.source === "volunteered" && d.status === "drawn")
  const myPending = activity ? activity.draws.filter(d => d.delegateTo === myId && d.status === "delegated" && !d.delegateApproved) : []
  const activeDraws = activity ? activity.draws.filter(d => d.status !== "cancelled") : []

  const confirmTitle = !confirm ? "" :
    confirm.action === "complete" ? "完成活动" :
    confirm.action === "cancel" ? "取消活动" :
    confirm.action === "resume" ? "重新继续" :
    confirm.action === "delete" ? "删除活动" : "删除抽签"
  const confirmDesc = !confirm ? "" :
    confirm.action === "complete" ? "将标记所有已抽中的参与为已完成，是否继续？" :
    confirm.action === "cancel" ? "所有未完成的抽签将标记为已取消，是否继续？" :
    confirm.action === "resume" ? "已完成的抽签将恢复为进行中。" :
    confirm.action === "delete" ? "删除后不可恢复，请谨慎操作。" : `确定删除「${confirm.name || ""}」的抽签记录？`
  const confirmText = confirm?.action === "complete" ? "完成" :
    confirm?.action === "cancel" ? "取消活动" :
    confirm?.action === "resume" ? "恢复" : "删除"
  const confirmDanger = confirm?.action === "cancel" || confirm?.action === "delete" || confirm?.action === "deleteDraw"

  return (
    <div className="mob-page">
      <style>{`@keyframes act-reveal{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      <MobTopBar title={activity?.title || "活动详情"} back />

      {loading ? (
        <MobLoading rows={5} />
      ) : !activity ? (
        <MobEmpty icon={<CalendarDays size={28} />} title="活动不存在" desc="该活动可能已被删除" />
      ) : (
        <>
          {/* 活动信息卡 */}
          <MobCard>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <MobChip tone={statusTone}>{statusText}</MobChip>
              <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>
                第 {currentRound} 轮 · 剩余 {remainingCount} 人
              </span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 12, lineHeight: 1.35, color: "var(--fg)" }}>{activity.title}</div>
            {activity.description && (
              <div style={{ fontSize: 14, color: "var(--fg-2)", marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{activity.description}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              {activity.eventTime && <MetaRow icon={<Clock size={15} />} label="时间" value={activity.eventTime} />}
              {activity.location && <MetaRow icon={<MapPin size={15} />} label="地点" value={activity.location} />}
              {activity.link && <MetaRow icon={<ExternalLink size={15} />} label="链接" value={activity.link} href={activity.link} />}
            </div>
            <MobButton variant="soft" size="sm" block style={{ marginTop: 14 }} onClick={copyLink}>
              <Copy size={14} /> 复制邀请链接
            </MobButton>
          </MobCard>

          {/* 待我确认的委托 */}
          {myPending.length > 0 && (
            <MobCard>
              <GroupHead label="待我确认的委托" count={myPending.length} />
              {myPending.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ flex: "none", width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary-soft)", color: "var(--primary)" }}>
                    <Mail size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: "var(--fg-2)", lineHeight: 1.4 }}>
                    <b style={{ color: "var(--fg)" }}>{d.user.name}</b> 请你代替参加
                  </div>
                  <div style={{ display: "flex", gap: 6, flex: "none" }}>
                    <MobButton size="sm" variant="ghost" style={{ color: "var(--danger)" }} onClick={() => handleApprove(d.id, false)}>
                      <X size={14} /> 拒绝
                    </MobButton>
                    <MobButton size="sm" onClick={() => handleApprove(d.id, true)}>
                      <Check size={14} /> 同意代做
                    </MobButton>
                  </div>
                </div>
              ))}
            </MobCard>
          )}

          {/* 抽签结果揭示 */}
          {lastDraw && (
            <MobCard>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Target size={15} style={{ color: "var(--ok)" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>本次抽签结果 · {lastDraw.names.length} 人</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {lastDraw.names.map((n, i) => (
                  <span key={i} style={{ animation: "act-reveal 320ms cubic-bezier(.2,.7,.3,1) both", animationDelay: `${i * 45}ms` }}>
                    <MobChip tone="ok">{n}</MobChip>
                  </span>
                ))}
              </div>
              {lastDraw.roundAdvanced && (
                <div style={{ fontSize: 12, color: "var(--warn)", marginTop: 10 }}>本轮人数不足，已自动进入下一轮</div>
              )}
            </MobCard>
          )}

          {/* 参与名单 */}
          <GroupHead label="参与名单" count={activeDraws.length} />
          {activity.draws.length === 0 ? (
            <MobEmpty icon={<Inbox size={28} />} title="暂无参与记录" />
          ) : (
            <MobCard padding={false}>
              {activity.draws.map((d, i) => {
                const isMine = d.userId === myId
                const canDelegate = isMine && d.status === "drawn" && isActive
                const canApprove = d.delegateTo === myId && d.status === "delegated" && !d.delegateApproved
                const effUser = d.delegateApproved && d.delegate ? d.delegate : d.user
                return (
                  <div key={d.id} style={{ padding: "12px 16px", borderBottom: i < activity.draws.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <MobAvatar name={effUser.name} size="sm" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>{effUser.name}</span>
                          <span style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>{effUser.studentId}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                          第 {d.round} 轮
                          {d.delegateApproved && d.delegate ? ` · 由 ${d.user.name} 转交` : ""}
                          {!d.delegateApproved && d.status === "delegated" && d.delegate ? ` · 代做 → ${d.delegate.name}` : ""}
                        </div>
                      </div>
                      <MobChip tone={drawTone(d)}>{drawLabel(d)}</MobChip>
                    </div>
                    {(canDelegate || canApprove || isAdmin) && (
                      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                        {canDelegate && (
                          <MobButton size="sm" variant="ghost" onClick={() => setDelegateDrawId(d.id)}>
                            <Send size={13} /> 委托他人
                          </MobButton>
                        )}
                        {canApprove && (
                          <>
                            <MobButton size="sm" variant="ghost" style={{ color: "var(--danger)" }} onClick={() => handleApprove(d.id, false)}>
                              <X size={13} /> 拒绝
                            </MobButton>
                            <MobButton size="sm" variant="soft" onClick={() => handleApprove(d.id, true)}>
                              <Check size={13} /> 同意代做
                            </MobButton>
                          </>
                        )}
                        {isAdmin && d.status !== "delegated" && (
                          <MobButton size="sm" variant="ghost" onClick={() => setStatusDrawId(d.id)}>
                            <Pencil size={13} /> 修改状态
                          </MobButton>
                        )}
                        {isAdmin && (
                          <MobButton size="sm" variant="ghost" style={{ color: "var(--danger)" }} onClick={() => setConfirm({ action: "deleteDraw", drawId: d.id, name: effUser.name })}>
                            <Trash2 size={13} /> 删除
                          </MobButton>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </MobCard>
          )}

          {/* 我的操作（非管理员；游客模式仅展示） */}
          {!isAdmin && !isGuest && isActive && (
            <MobCard>
              <GroupHead label="我的操作" count={1} />
              <div style={{ display: "flex", gap: 10 }}>
                {myVolunteerDraw ? (
                  <MobButton block variant="danger" onClick={() => handleCancelVolunteer(myVolunteerDraw.id)}>
                    <X size={14} /> 取消报名
                  </MobButton>
                ) : myDraw ? (
                  <MobButton block variant="soft" onClick={() => setDelegateDrawId(myDraw.id)}>
                    <Send size={14} /> 委托他人
                  </MobButton>
                ) : (
                  <MobButton block onClick={handleVolunteer}>
                    <UserPlus size={14} /> 我要报名
                  </MobButton>
                )}
              </div>
            </MobCard>
          )}

          {/* 管理员操作 */}
          {isAdmin && (
            <MobCard>
              <GroupHead label="管理员操作" count={remainingCount} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {isActive ? (
                  <>
                    <MobButton size="sm" onClick={() => setDrawOpen(true)}>
                      <RefreshCw size={14} /> 抽签
                    </MobButton>
                    <MobButton size="sm" variant="soft" onClick={openAssign}>
                      <UserPlus size={14} /> 指定参与
                    </MobButton>
                    <MobButton size="sm" variant="soft" onClick={() => setConfirm({ action: "complete" })}>
                      <Check size={14} /> 完成活动
                    </MobButton>
                    <MobButton size="sm" variant="danger" onClick={() => setConfirm({ action: "cancel" })}>
                      <X size={14} /> 取消活动
                    </MobButton>
                  </>
                ) : (
                  <MobButton size="sm" variant="soft" onClick={() => setConfirm({ action: "resume" })}>
                    <RefreshCw size={14} /> 恢复
                  </MobButton>
                )}
                <MobButton size="sm" variant="ghost" onClick={openEdit}>
                  <Pencil size={14} /> 编辑
                </MobButton>
                <MobButton size="sm" variant="ghost" style={{ color: "var(--danger)" }} onClick={() => setConfirm({ action: "delete" })}>
                  <Trash2 size={14} /> 删除
                </MobButton>
                <MobButton size="sm" variant="ghost" loading={exporting} onClick={handleExport}>
                  <Download size={14} /> 导出图片
                </MobButton>
              </div>
            </MobCard>
          )}
        </>
      )}

      {/* 抽签弹层 */}
      <MobBottomSheet open={drawOpen} title="抽签" onClose={() => setDrawOpen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MobField
            label="抽取人数"
            type="number"
            value={drawCount}
            onChange={v => setDrawCount(Math.max(1, Math.min(45, Number(v) || 1)))}
            min={1}
            max={45}
          />
          <MobButton block loading={drawing} onClick={handleDraw}>
            {drawing ? "抽签中..." : "开始抽签"}
          </MobButton>
        </div>
      </MobBottomSheet>

      {/* 指定参与弹层 */}
      <MobBottomSheet open={assignOpen} title="指定参与" onClose={() => setAssignOpen(false)}>
        <MobSegmented
          equal
          options={[
            { value: "assigned", label: "管理员指定" },
            { value: "volunteered", label: "自行报名" },
          ]}
          value={assignSource}
          onChange={v => setAssignSource(v as "assigned" | "volunteered")}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "14px 0 10px" }}>
          <span style={{ fontSize: 13, color: "var(--fg-2)" }}>已选 {selectedIds.size} 人</span>
          <div style={{ display: "flex", gap: 6 }}>
            <MobButton size="sm" variant="ghost" onClick={() => setSelectedIds(new Set(allStudents.map(s => s.id)))}>全选</MobButton>
            <MobButton size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>清空</MobButton>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: "38vh", overflowY: "auto", paddingBottom: 4 }}>
          {allStudents.map(s => {
            const sel = selectedIds.has(s.id)
            return (
              <button key={s.id} type="button" onClick={() => {
                const n = new Set(selectedIds)
                if (n.has(s.id)) n.delete(s.id); else n.add(s.id)
                setSelectedIds(n)
              }}>
                <MobChip tone={sel ? "info" : "neutral"}>{s.name}</MobChip>
              </button>
            )
          })}
        </div>
        <MobButton block loading={assigning} onClick={handleAssign} style={{ marginTop: 12 }}>
          确认指定 {selectedIds.size} 人
        </MobButton>
      </MobBottomSheet>

      {/* 委托他人弹层 */}
      <MobBottomSheet open={delegateDrawId !== null} title="委托他人" onClose={() => { setDelegateDrawId(null); setSearchQ(""); setSearchRes([]) }}>
        <MobField value={searchQ} onChange={handleSearch} placeholder="搜索姓名或学号" />
        <div style={{ marginTop: 10 }}>
          {searchRes.length > 0 ? (
            <MobCard padding={false}>
              {searchRes.map(s => (
                <MobListItem
                  key={s.id}
                  icon={<MobAvatar name={s.name} size="sm" />}
                  title={s.name}
                  subtitle={s.studentId || ""}
                  onClick={() => delegateDrawId && handleDelegate(delegateDrawId, s.id)}
                />
              ))}
            </MobCard>
          ) : (
            searchQ.trim() && (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--fg-3)", fontSize: 13 }}>无匹配结果</div>
            )
          )}
        </div>
      </MobBottomSheet>

      {/* 修改状态弹层 */}
      <MobBottomSheet open={statusDrawId !== null} title="修改状态" onClose={() => setStatusDrawId(null)}>
        <MobCard padding={false}>
          {STATUS_OPTIONS.map(o => (
            <MobListItem key={o} title={o} onClick={() => statusDrawId && handleDrawStatus(statusDrawId, o)} />
          ))}
        </MobCard>
      </MobBottomSheet>

      {/* 编辑弹层 */}
      <MobBottomSheet open={editOpen} title="编辑活动" onClose={() => setEditOpen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MobField label="活动标题" required value={editTitle} onChange={setEditTitle} placeholder="活动标题" />
          <MobField label="活动描述" type="textarea" value={editDesc} onChange={setEditDesc} placeholder="活动描述（可选）" />
          <MobField label="时间" value={editTime} onChange={setEditTime} placeholder="如：周三 14:00" />
          <MobField label="地点" value={editLoc} onChange={setEditLoc} placeholder="如：6A-301" />
          <MobField label="链接" value={editLink} onChange={setEditLink} placeholder="相关链接（可选）" />
          <MobButton block loading={saving} onClick={handleEdit}>保存</MobButton>
        </div>
      </MobBottomSheet>

      {/* 确认框 */}
      <MobConfirm
        open={confirm !== null}
        title={confirmTitle}
        confirmText={confirmText}
        tone={confirmDanger ? "danger" : "default"}
        loading={confirmBusy}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirm}
      >
        {confirmDesc}
      </MobConfirm>
    </div>
  )
}

/* ---------- 子组件 ---------- */

function GroupHead({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "2px 0 8px" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-num)", fontSize: 12, color: "var(--fg-3)" }}>{count}</span>
    </div>
  )
}

function MetaRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "var(--surface-2)", borderRadius: 12 }}>
      <span style={{ flex: "none", display: "inline-flex", color: "var(--primary)" }}>{icon}</span>
      <span style={{ flex: "none", fontSize: 12, color: "var(--fg-3)", fontWeight: 600 }}>{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value}
        </a>
      ) : (
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
      )}
    </div>
  )
}
