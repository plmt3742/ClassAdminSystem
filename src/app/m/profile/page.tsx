"use client"

import { useCallback, useEffect, useState } from "react"
import { signOut, useSession } from "next-auth/react"
import { Bell, KeyRound, LogOut, UserRound } from "lucide-react"
import MobTopBar from "../_components/MobTopBar"
import MobCard from "../_components/MobCard"
import MobChip from "../_components/MobChip"
import MobAvatar from "../_components/MobAvatar"
import MobListItem from "../_components/MobListItem"
import MobBottomSheet from "../_components/MobBottomSheet"
import MobConfirm from "../_components/MobConfirm"
import MobField from "../_components/MobField"
import MobButton from "../_components/MobButton"
import { useToast } from "../_components/MobToast"

const roleLabel: Record<string, string> = { admin: "管理员", class_leader: "班干部", student: "同学" }

interface ProfileData {
  id?: string
  name?: string | null
  studentId?: string | null
  bio?: string | null
  phone?: string | null
  role?: string | null
  tags?: string[] | null
  createdAt?: string | null
  image?: string | null
}

interface DelegationDraw {
  id: string
  delegateApproved: boolean
  activity: { id: string; title: string } | null
  user: { id: string; name: string; studentId: string } | null
  delegate: { id: string; name: string; studentId: string } | null
}

export default function MobileProfilePage() {
  const { data: session, status, update } = useSession()
  const toast = useToast()

  const [profile, setProfile] = useState<ProfileData>({})

  // 编辑资料
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [saving, setSaving] = useState(false)

  // 修改密码
  const [pwdOpen, setPwdOpen] = useState(false)
  const [curPwd, setCurPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [cfmPwd, setCfmPwd] = useState("")
  const [pwdSaving, setPwdSaving] = useState(false)

  // 委托通知 / 委托管理
  const [unreadCount, setUnreadCount] = useState(0)
  const [incoming, setIncoming] = useState<DelegationDraw[]>([])
  const [outgoing, setOutgoing] = useState<DelegationDraw[]>([])
  const [rejectTarget, setRejectTarget] = useState<{ drawId: string; activityId: string; name: string } | null>(null)

  // 退出登录
  const [confirmLogout, setConfirmLogout] = useState(false)

  const fetchDelegations = useCallback(async () => {
    try {
      const res = await fetch("/api/me/delegations")
      const data = (await res.json()) as { incoming?: DelegationDraw[]; outgoing?: DelegationDraw[] }
      setIncoming(data.incoming || [])
      setOutgoing(data.outgoing || [])
    } catch {
      /* 忽略 */
    }
  }, [])

  useEffect(() => {
    if (!session) return
    fetch("/api/me")
      .then(r => r.json())
      .then((d: { user?: ProfileData }) => {
        const u = d.user || {}
        setProfile(u)
        setEditName(u.name || "")
        setEditBio(u.bio || "")
        setEditPhone(u.phone || "")
      })
      .catch(() => {})
    fetch("/api/me/notifications")
      .then(r => r.json())
      .then((d: { unreadCount?: number }) => setUnreadCount(d.unreadCount || 0))
      .catch(() => {})
    fetchDelegations()
  }, [session, fetchDelegations])

  if (status === "loading" || !session) return null

  const user = session.user
  const tags = user.tags || []
  const displayRole = roleLabel[profile.role || user.role || "student"]

  const openEdit = () => {
    setEditName(profile.name || user.name || "")
    setEditBio(profile.bio || "")
    setEditPhone(profile.phone || "")
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("姓名不能为空")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), bio: editBio, phone: editPhone }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string; user?: ProfileData }
      if (data.ok) {
        setProfile(data.user || { ...profile, name: editName.trim(), bio: editBio, phone: editPhone })
        await update()
        toast.success("保存成功")
        setEditOpen(false)
      } else {
        toast.error(data.error || "保存失败")
      }
    } catch {
      toast.error("网络异常，请重试")
    } finally {
      setSaving(false)
    }
  }

  const handlePwd = async () => {
    if (!curPwd || !newPwd || !cfmPwd) {
      toast.error("请填写完整")
      return
    }
    if (newPwd.length < 6) {
      toast.error("新密码至少 6 位")
      return
    }
    if (newPwd !== cfmPwd) {
      toast.error("两次新密码不一致")
      return
    }
    setPwdSaving(true)
    try {
      const res = await fetch("/api/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (data.ok) {
        toast.success("密码修改成功")
        setPwdOpen(false)
        setCurPwd("")
        setNewPwd("")
        setCfmPwd("")
      } else {
        toast.error(data.error || "修改失败")
      }
    } catch {
      toast.error("网络异常，请重试")
    } finally {
      setPwdSaving(false)
    }
  }

  const handleMarkRead = async () => {
    if (unreadCount === 0) {
      toast.success("暂无未读通知")
      return
    }
    try {
      await fetch("/api/me/notifications", { method: "PUT" })
      setUnreadCount(0)
      toast.success("已标记为已读")
    } catch {
      toast.error("操作失败")
    }
  }

  const handleDelegateAction = async (drawId: string, activityId: string, approve: boolean) => {
    try {
      const res = await fetch(`/api/activities/${activityId}/delegate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawId, approve }),
      })
      const data = (await res.json()) as { error?: string }
      if (res.ok) {
        toast.success(approve ? "已同意委托" : "已拒绝委托")
        await fetchDelegations()
      } else {
        toast.error(data.error || "操作失败")
      }
    } catch {
      toast.error("网络异常，请重试")
    }
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/welcome" })
  }

  return (
    <div className="mob-page">
      <MobTopBar title="我的" icon={<UserRound size={17} />} />

      {/* 身份卡：头像 + 姓名 + 学号 + 角色/标签 */}
      <MobCard>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <MobAvatar name={user.name || "?"} src={user.image || profile.image || undefined} size="lg" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--fg)" }}>{user.name}</div>
            <div style={{ fontFamily: "var(--font-num)", fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>学号 {user.studentId || "—"}</div>
            {profile.bio ? <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.bio}</div> : null}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          <MobChip tone="info">{displayRole}</MobChip>
          {tags.map(t => <MobChip key={t} tone="neutral">{t}</MobChip>)}
        </div>
      </MobCard>

      {/* 账户 */}
      <MobCard padding={false}>
        <MobListItem icon={<UserRound size={20} />} title="编辑资料" chevron onClick={openEdit} />
        <MobListItem icon={<KeyRound size={20} />} title="修改密码" chevron onClick={() => setPwdOpen(true)} />
        <MobListItem icon={<Bell size={20} />} title="委托通知" badge={unreadCount > 0 ? unreadCount : undefined} chevron onClick={handleMarkRead} />
      </MobCard>

      {/* 委托管理：收到的委托（同意/拒绝）+ 发出的委托（状态） */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <MobCard title="委托管理" extra={incoming.length > 0 ? <MobChip tone="warn">{incoming.length} 待处理</MobChip> : undefined}>
          {incoming.map(d => (
            <div key={d.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.6 }}>
                <b>{d.user?.name}</b>（{d.user?.studentId}）请你代替参加「{d.activity?.title || "活动"}」
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <MobButton size="sm" variant="ghost" onClick={() => setRejectTarget({ drawId: d.id, activityId: d.activity?.id || "", name: d.user?.name || "" })}>
                  拒绝
                </MobButton>
                <MobButton size="sm" onClick={() => handleDelegateAction(d.id, d.activity?.id || "", true)}>
                  同意
                </MobButton>
              </div>
            </div>
          ))}
          {outgoing.map(d => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6 }}>
                委托 <b style={{ color: "var(--fg)" }}>{d.delegate?.name}</b> 代替参加「{d.activity?.title || "活动"}」
              </div>
              <MobChip tone={d.delegateApproved ? "ok" : "warn"}>{d.delegateApproved ? "已同意" : "等待回复"}</MobChip>
            </div>
          ))}
        </MobCard>
      )}

      {/* 退出登录 */}
      <MobCard padding={false}>
        <MobListItem icon={<LogOut size={20} />} title="退出登录" danger onClick={() => setConfirmLogout(true)} />
      </MobCard>

      {/* 关于 */}
      <div style={{ textAlign: "center", padding: "20px 16px 8px", fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.04em", lineHeight: 1.8 }}>
        班务管理 · 移动端 v1.0
        <br />
        班务管理 · 数据每日 23:00 同步
      </div>

      {/* 编辑资料弹层 */}
      <MobBottomSheet open={editOpen} title="编辑资料" onClose={() => setEditOpen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MobField label="姓名" required value={editName} onChange={setEditName} placeholder="姓名" />
          <MobField label="个性签名" type="textarea" value={editBio} onChange={setEditBio} placeholder="写一句你的个性签名" />
          <MobField label="电话" inputMode="tel" value={editPhone} onChange={setEditPhone} placeholder="手机号" />
          <MobButton block loading={saving} onClick={handleSave}>
            保存
          </MobButton>
        </div>
      </MobBottomSheet>

      {/* 修改密码弹层 */}
      <MobBottomSheet open={pwdOpen} title="修改密码" onClose={() => setPwdOpen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MobField label="当前密码" type="password" value={curPwd} onChange={setCurPwd} placeholder="请输入当前密码" autoComplete="current-password" />
          <MobField label="新密码" type="password" value={newPwd} onChange={setNewPwd} placeholder="至少 6 位" hint="至少 6 位" autoComplete="new-password" />
          <MobField label="确认新密码" type="password" value={cfmPwd} onChange={setCfmPwd} placeholder="请再次输入新密码" autoComplete="new-password" />
          <MobButton block loading={pwdSaving} onClick={handlePwd}>
            确认修改
          </MobButton>
        </div>
      </MobBottomSheet>

      {/* 拒绝委托确认 */}
      <MobConfirm
        open={rejectTarget !== null}
        title="拒绝委托"
        tone="danger"
        confirmText="拒绝"
        onCancel={() => setRejectTarget(null)}
        onConfirm={() => {
          if (!rejectTarget) return
          handleDelegateAction(rejectTarget.drawId, rejectTarget.activityId, false)
          setRejectTarget(null)
        }}
      >
        <>确定拒绝 {rejectTarget?.name} 的委托请求吗？</>
      </MobConfirm>

      {/* 退出登录确认 */}
      <MobConfirm
        open={confirmLogout}
        title="退出登录"
        tone="danger"
        confirmText="退出"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={handleSignOut}
      >
        确定要退出登录吗？
      </MobConfirm>
    </div>
  )
}
