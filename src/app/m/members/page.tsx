"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeftRight, ChevronRight, Undo2, UserCog, Users } from "lucide-react"
import MobTopBar from "../_components/MobTopBar"
import MobCard from "../_components/MobCard"
import MobChip from "../_components/MobChip"
import MobButton from "../_components/MobButton"
import MobAvatar from "../_components/MobAvatar"
import MobBottomSheet from "../_components/MobBottomSheet"
import MobConfirm from "../_components/MobConfirm"
import MobLoading from "../_components/MobLoading"
import MobEmpty from "../_components/MobEmpty"
import { useToast } from "../_components/MobToast"

const ALL_TAGS = ["班长", "副班长", "团支书", "副团支书", "心理委员", "学习委员", "生活委员", "文体委员", "志愿队长", "组织委员", "宣传委员"]
const CORE_ROLES = ["班长", "副班长", "团支书", "学习委员"]
const FUNC_ROLES = ["文体委员", "生活委员", "组织委员", "心理委员", "宣传委员", "志愿队长"]

const roleLabel: Record<string, string> = { admin: "管理员", class_leader: "班干部", student: "同学" }

interface RawMember {
  id: string; studentId: string | null; name: string | null; role: string | null
  tags: string | string[] | null; createdAt: string
}
interface Member {
  id: string; studentId: string; name: string; role: string; tags: string[]
}

const normalize = (raw: RawMember): Member => ({
  id: raw.id,
  studentId: raw.studentId || "",
  name: raw.name || "",
  role: raw.role || "student",
  tags: typeof raw.tags === "string" ? (JSON.parse(raw.tags || "[]") as string[]) : (raw.tags || []),
})

function MemberRow({ member, onClick, tone }: { member: Member; onClick: () => void; tone: "deep" | "mid" | "light" }) {
  const roleChip =
    member.role === "admin" ? <MobChip tone="info">管理员</MobChip>
      : member.role === "class_leader" ? <MobChip tone="neutral">班干部</MobChip>
        : null
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%",
        minHeight: 56, padding: "10px 16px", textAlign: "left",
        background: "transparent", border: "none", color: "var(--fg)",
        transition: "background 160ms var(--mob-ease)",
      }}
    >
      <MobAvatar name={member.name} size="md" tone={tone} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>{member.name}</span>
          {roleChip}
          {member.tags.map(t => <MobChip key={t} tone="neutral">{t}</MobChip>)}
        </span>
        <span style={{ display: "block", marginTop: 2, fontSize: 13, color: "var(--fg-3)", fontFamily: "var(--font-num)" }}>
          {member.studentId || "—"}
        </span>
      </span>
      <ChevronRight size={18} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
    </button>
  )
}

function GroupHead({ title, sub, count }: { title: string; sub: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "14px 16px 2px" }}>
      <div style={{ minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>{title}</span>
        <span style={{ fontSize: 12, color: "var(--fg-3)", marginLeft: 8 }}>{sub}</span>
      </div>
      <span style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-num)", flexShrink: 0 }}>{count} 人</span>
    </div>
  )
}

/** 班级成员：三组名单（班委核心/职能班委/普通成员）；管理员可编辑职务标签与模拟登录。 */
export default function MobileMembersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Member | null>(null)
  const [impersonateTarget, setImpersonateTarget] = useState<Member | null>(null)
  const [switchingBack, setSwitchingBack] = useState(false)

  const isAdmin = session?.user?.role === "admin"
  const impersonator = session?.user?.impersonator

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/members")
      const d = await res.json()
      setMembers(((d.members || []) as RawMember[]).map(normalize))
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const toggleTag = async (member: Member, tag: string) => {
    const next = member.tags.includes(tag) ? member.tags.filter(t => t !== tag) : [...member.tags, tag]
    setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, tags: next } : m)))
    setSelected(prev => (prev && prev.id === member.id ? { ...prev, tags: next } : prev))
    try {
      await fetch("/api/admin/tags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id, tags: next }),
      })
    } catch {
      toast.error("保存失败")
    }
  }

  const handleImpersonate = async () => {
    if (!impersonateTarget) return
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: impersonateTarget.id }),
      })
      if (res.ok) {
        // 新会话 JWT 已写入 cookie，整页刷新后首页展示切换视角横幅
        window.location.href = "/m"
      } else {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || "切换失败")
        setImpersonateTarget(null)
      }
    } catch {
      toast.error("网络异常")
      setImpersonateTarget(null)
    }
  }

  const handleBackToAdmin = async () => {
    if (switchingBack) return
    setSwitchingBack(true)
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ back: true }),
      })
      if (res.ok) window.location.href = "/m"
      else { toast.error("恢复失败，请重新登录"); setSwitchingBack(false) }
    } catch {
      toast.error("网络异常")
      setSwitchingBack(false)
    }
  }

  const coreMembers = members.filter(m => m.tags.some(t => CORE_ROLES.includes(t)))
  const funcMembers = members.filter(m => !coreMembers.includes(m) && m.tags.some(t => FUNC_ROLES.includes(t)))
  const regularMembers = members.filter(m => m.tags.length === 0)

  return (
    <div className="mob-page">
      <MobTopBar title="成员" icon={<Users size={17} />} />

      {impersonator && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--surface)", border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-card)", padding: "10px 12px", boxShadow: "var(--shadow-card)",
        }}>
          <UserCog size={18} style={{ color: "var(--warn)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5 }}>
            正在以 <b style={{ color: "var(--fg)" }}>{session?.user?.name}</b>（{session?.user?.studentId || "—"}）的身份操作
          </div>
          <MobButton size="sm" variant="soft" loading={switchingBack} onClick={handleBackToAdmin}>
            <Undo2 size={14} /> 恢复管理员身份
          </MobButton>
        </div>
      )}

      {loading ? (
        <MobLoading rows={7} />
      ) : members.length === 0 ? (
        <MobEmpty icon={<UserCog size={28} />} title="暂无成员" desc="成员名单将在这里显示" />
      ) : (
        <>
          <MobCard padding={false}>
            <GroupHead title="班委核心" sub="班级领导层" count={coreMembers.length} />
            {coreMembers.length === 0 ? (
              <div style={{ padding: "12px 16px 16px", fontSize: 13, color: "var(--fg-3)" }}>暂无</div>
            ) : (
              coreMembers.map(m => <MemberRow key={m.id} member={m} tone="deep" onClick={() => isAdmin && setSelected(m)} />)
            )}
          </MobCard>

          <MobCard padding={false}>
            <GroupHead title="职能班委" sub="六个岗位" count={funcMembers.length} />
            {funcMembers.length === 0 ? (
              <div style={{ padding: "12px 16px 16px", fontSize: 13, color: "var(--fg-3)" }}>暂无</div>
            ) : (
              funcMembers.map(m => <MemberRow key={m.id} member={m} tone="mid" onClick={() => isAdmin && setSelected(m)} />)
            )}
          </MobCard>

          <MobCard padding={false}>
            <GroupHead title="普通成员" sub="全员名单" count={regularMembers.length} />
            {regularMembers.length === 0 ? (
              <div style={{ padding: "12px 16px 16px", fontSize: 13, color: "var(--fg-3)" }}>暂无</div>
            ) : (
              regularMembers.map(m => <MemberRow key={m.id} member={m} tone="light" onClick={() => isAdmin && setSelected(m)} />)
            )}
          </MobCard>
        </>
      )}

      <MobBottomSheet open={!!selected} title={selected?.name || ""} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <div style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 12 }}>
              学号 <span style={{ fontFamily: "var(--font-num)" }}>{selected.studentId || "—"}</span>
              <span style={{ marginLeft: 10 }}>{roleLabel[selected.role] || "同学"}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-2)", marginBottom: 8 }}>
              职务标签 · 共 {ALL_TAGS.length} 项
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ALL_TAGS.map(tag => {
                const active = selected.tags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(selected, tag)}
                    style={{
                      height: 34, padding: "0 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                      background: active ? "var(--primary)" : "var(--surface-2)",
                      color: active ? "#fff" : "var(--fg-2)",
                      border: `1px solid ${active ? "var(--primary)" : "var(--border-strong)"}`,
                      transition: "background 160ms var(--mob-ease), color 160ms var(--mob-ease)",
                    }}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
            <div style={{ marginTop: 20 }}>
              <MobButton block onClick={() => setImpersonateTarget(selected)}>
                <ArrowLeftRight size={16} /> 模拟登录此学生
              </MobButton>
            </div>
          </>
        )}
      </MobBottomSheet>

      <MobConfirm
        open={!!impersonateTarget}
        title="模拟登录"
        confirmText="切换"
        onCancel={() => setImpersonateTarget(null)}
        onConfirm={handleImpersonate}
      >
        将以 {impersonateTarget?.name}（{impersonateTarget?.studentId}）的身份进入系统，可操作该学生全部功能。点击「返回管理员」可恢复。
      </MobConfirm>
    </div>
  )
}
