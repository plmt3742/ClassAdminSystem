"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Shield, Pencil, ArrowLeftRight, ChevronDown, Users, Crown, ArrowLeft, ChevronRight } from "lucide-react"

const ALL_TAGS = ["班长","副班长","团支书","副团支书","心理委员","学习委员","生活委员","文体委员","志愿队长","组织委员","宣传委员"]
const CORE_ROLES = ["班长", "副班长", "团支书", "学习委员"]
const FUNC_ROLES = ["文体委员", "生活委员", "组织委员", "心理委员", "宣传委员", "志愿队长"]
const CORE_ROLE_EN: Record<string, string> = {
  "班长": "MONITOR",
  "副班长": "VICE MONITOR",
  "团支书": "SECRETARY",
  "学习委员": "STUDY",
}

interface Member {
  id: string; studentId: string; name: string; role: string; tags: string[]; createdAt: string
}

export default function MembersPage() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [mobileEdit, setMobileEdit] = useState(false)
  const isAdmin = session?.user?.role === "admin"

  const fetchMembers = useCallback(async () => {
    const res = await fetch("/api/members")
    const d = await res.json()
    setMembers((d.members || []).map((m: any) => ({ ...m, tags: typeof m.tags === "string" ? JSON.parse(m.tags || "[]") : (m.tags || []) })))
    setLoading(false)
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const toggleTag = async (userId: string, currentTags: string[], tag: string) => {
    const next = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag]
    await fetch("/api/admin/tags", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, tags: next }) })
    fetchMembers()
  }

  // 超级管理员切换为学生视角（以该学生身份操作）
  const handleImpersonate = async (m: Member) => {
    if (!confirm(`将以 ${m.name}（${m.studentId}）的身份进入系统，可操作该学生全部功能。\n点击「返回管理员」可恢复。`)) return
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: m.id }),
    })
    if (res.ok) {
      window.location.href = "/"
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || "切换失败")
    }
  }

  if (loading) return <p className="empty-state">加载中...</p>

  const coreMembers = members.filter(m => m.tags.some(t => CORE_ROLES.includes(t)))
  const funcMembers = members.filter(m => !coreMembers.includes(m) && m.tags.some(t => FUNC_ROLES.includes(t)))
  const regularMembers = members.filter(m => m.tags.length === 0)
  const coreCount = String(coreMembers.length).padStart(2, "0")
  const funcCount = String(funcMembers.length).padStart(2, "0")

  // 同一成员仅在其第一个匹配岗位展示（班长+志愿队长 → 只出现在班长行），
  // 同一岗位有多人时全部展示
  const shownIds = new Set<string>()

  const renderHolder = (member: Member, primaryRole: string) => (
    <div className={isAdmin && editingId === member.id ? "mb-holder mb-is-open" : "mb-holder"}>
      {isAdmin && (
        <div className="mb-card-actions">
          <button className="mb-icon-btn" title="编辑职务" onClick={() => setEditingId(editingId === member.id ? null : member.id)}>
            <Pencil className="mb-i" size={13} />
          </button>
          <button className="mb-icon-btn" title="切换视角" onClick={() => handleImpersonate(member)}>
            <ArrowLeftRight className="mb-i" size={13} />
          </button>
        </div>
      )}
      <div className="mb-holder-top">
        <div className="mb-avatar-lg"><span>{member.name[0]}</span></div>
        <div>
          <span className="mb-holder-name">{member.name}</span>
          <span className="mb-holder-id">{member.studentId}</span>
        </div>
      </div>
      <div className="mb-holder-tags">
        {member.tags.map(tag => (
          <span key={tag} className={tag === primaryRole ? "mb-tag mb-fill" : "mb-tag"}>{tag}</span>
        ))}
      </div>
      {isAdmin && editingId === member.id && (
        <div className="mb-editor">
          <div className="mb-editor-head">
            <ChevronDown className="mb-i mb-chev" size={11} />
            职务标签 · 共 {ALL_TAGS.length} 项
          </div>
          <div className="mb-chips">
            {ALL_TAGS.map(tag => (
              <button key={tag} className={`mb-chip ${member.tags.includes(tag) ? "active" : ""}`} onClick={() => toggleTag(member.id, member.tags, tag)}>
                {tag}
              </button>
            ))}
          </div>
          <div className="mb-editor-foot">
            <button className="mb-btn-sm" onClick={() => setEditingId(null)}>取消</button>
            <button className="mb-btn-sm mb-primary" onClick={() => setEditingId(null)}>保存</button>
          </div>
        </div>
      )}
    </div>
  )

  // ===== 移动版（设计稿 members.html · 真实数据，≤640px 显示） =====
  const mobileView = (
    <div className="m-page-root">
      <style>{`
        @media (max-width: 640px) {
          .sect-more { font-family: var(--font-mono); font-size: 9.5px; color: var(--color-muted); flex: none; }
          .member-list { display: flex; flex-direction: column; gap: 9px; }
          .member-list .m-card { padding: 11px 13px; gap: 12px; }
          .member-list .tile { font-family: var(--font-display); font-size: 16px; font-weight: 700; letter-spacing: .5px; }
          .member-list .body { min-width: 0; }
          .member-list .name { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; min-width: 0; }
          .member-list .sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .role { font-family: var(--font-mono); font-size: 9px; font-weight: 700; color: var(--color-accent-hover); background: #EBEFF5; border: 1px solid var(--color-border-strong); padding: 1px 7px; border-radius: var(--radius); white-space: nowrap; flex: none; }
          .role.lead { background: var(--color-accent); color: #fff; border-color: transparent; }
          .mem-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
          .mem-cell { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 13px 6px 11px; display: flex; flex-direction: column; align-items: center; gap: 5px; color: inherit; min-width: 0; }
          .mem-cell:active { transform: scale(.97); border-color: var(--color-accent); }
          .mc-av { width: 34px; height: 34px; border-radius: var(--radius); background: var(--color-accent-subtle); color: var(--color-accent); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 16px; font-weight: 700; letter-spacing: .5px; }
          .mc-name { font-size: 12px; font-weight: 600; color: var(--color-fg); white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
          .mc-sid { font-family: var(--font-mono); font-size: 8.5px; color: var(--color-muted); letter-spacing: .02em; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
          .mem-hint { font-family: var(--font-mono); font-size: 9px; color: var(--color-muted-light); text-align: center; margin-top: 10px; letter-spacing: .06em; }
          .adm-btn { display: flex; align-items: center; gap: 7px; width: 100%; margin: 10px 0 4px; font-size: 12.5px; font-weight: 600; color: var(--color-accent); background: var(--color-accent-subtle); border: 1px solid var(--color-border-strong); border-radius: var(--radius); padding: 10px 13px; cursor: pointer; }
          .adm-btn svg { width: 13px; height: 13px; stroke-width: 1.8; }
          .m-edit-panel { padding: 2px 0 8px; }
          .m-edit-member { padding: 10px 2px; border-top: 1px solid var(--color-border); }
          .m-edit-member:first-child { border-top: none; }
          .m-edit-id { font-size: 12.5px; font-weight: 600; color: var(--color-fg); display: flex; align-items: baseline; gap: 8px; }
          .m-edit-id span { font-family: var(--font-mono); font-size: 9px; color: var(--color-muted); }
          .m-edit-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
          .m-edit-chip { font-family: var(--font-mono); font-size: 9.5px; font-weight: 600; color: var(--color-muted); background: #F1F4F8; border: 1px solid var(--color-border); border-radius: 999px; padding: 3px 9px; cursor: pointer; min-height: 26px; }
          .m-edit-chip.on { color: var(--color-accent-hover); background: var(--color-accent-subtle); border-color: var(--color-accent); }
        }
      `}</style>

      <header className="m-topbar">
        <Link className="m-back" href="/modules" aria-label="返回模块"><ArrowLeft size={18} /></Link>
        <span className="m-title">班级成员<small>CLASS MEMBERS</small></span>
        <span className="m-year">{members.length} 人</span>
      </header>

      {/* 班委核心 */}
      <section className="m-pad" style={{ paddingTop: 16 }}>
        <div className="m-section-head">
          <span className="m-eyebrow">班委核心 · Core</span>
          <span className="sect-more">{coreCount} 人</span>
        </div>
        <div className="member-list">
          {coreMembers.map(m => (
            <div key={m.id} className="m-card">
              <span className="tile">{m.name[0]}</span>
              <span className="body">
                <span className="name">
                  {m.name}
                  {m.tags.map((tag, i) => (
                    <span key={tag} className={`role${i === 0 ? " lead" : ""}`}>{tag}</span>
                  ))}
                </span>
                <span className="sub">{m.studentId || "—"}</span>
              </span>
              <span className="chev"><ChevronRight size={16} /></span>
            </div>
          ))}
        </div>
      </section>

      {/* 职能班委 */}
      <section className="m-pad" style={{ paddingTop: 18 }}>
        <div className="m-section-head">
          <span className="m-eyebrow">职能班委 · Committee</span>
          <span className="sect-more">{funcCount} 人</span>
        </div>
        <div className="member-list">
          {funcMembers.map(m => (
            <div key={m.id} className="m-card">
              <span className="tile">{m.name[0]}</span>
              <span className="body">
                <span className="name">
                  {m.name}
                  {m.tags.map((tag, i) => (
                    <span key={tag} className={`role${i === 0 ? " lead" : ""}`}>{tag}</span>
                  ))}
                </span>
                <span className="sub">{m.studentId || "—"}</span>
              </span>
              <span className="chev"><ChevronRight size={16} /></span>
            </div>
          ))}
        </div>
      </section>

      {/* 班级成员 */}
      <section className="m-pad" style={{ paddingTop: 18 }}>
        <div className="m-section-head">
          <span className="m-eyebrow">班级成员 · Members</span>
          <span className="sect-more">{regularMembers.length} / {members.length}</span>
        </div>
        <div className="mem-grid">
          {regularMembers.map(m => (
            <div key={m.id} className="mem-cell">
              <span className="mc-av">{m.name[0]}</span>
              <span className="mc-name">{m.name}</span>
              <span className="mc-sid">{m.studentId || "—"}</span>
            </div>
          ))}
        </div>
        <p className="mem-hint">名单按学号排序 · 班级共 {members.length} 人</p>
      </section>

      {/* 管理员操作（仅班委可见） */}
      {isAdmin && (
        <section className="m-pad" style={{ paddingTop: 18 }}>
          <div className="m-panel">
            <div className="m-panel-head">
              <span className="m-eyebrow">管理员操作 · Admin</span>
              <span className="more">仅班委可见</span>
            </div>
            <button className="adm-btn" onClick={() => setMobileEdit(!mobileEdit)}>
              <Pencil size={13} /> 编辑职务
            </button>
            {mobileEdit && (
              <div className="m-edit-panel">
                {members.map(m => (
                  <div key={m.id} className="m-edit-member">
                    <div className="m-edit-id">{m.name}<span>{m.studentId || "—"}</span></div>
                    <div className="m-edit-chips">
                      {ALL_TAGS.map(tag => (
                        <button key={tag}
                          className={`m-edit-chip${m.tags.includes(tag) ? " on" : ""}`}
                          onClick={() => toggleTag(m.id, m.tags, tag)}>
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        班级事务 · 一体化管理平台<br /><b>CLASS ADMIN</b> · 数据每日 23:00 同步
      </div>
    </div>
  )

  return (
    <>
      {mobileView}
    <div className="members-desktop">
    <main className="mb-wrap">
      <header className="mb-page-head">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/" className="zs-back" style={{ marginBottom: 0 }}>
            <ArrowLeft size={15} /> 返回首页
          </Link>
          <div>
            <div className="mb-eyebrow">班级信息 · 班级成员</div>
            <h1 className="mb-title">班级成员<em>Class Members</em></h1>
          </div>
        </div>
        <div className="mb-head-right">
          <div className="mb-count-line">
            <span className="mb-count-num">{members.length}</span>
            <span className="mb-count-label">人</span>
          </div>
          <div className="mb-count-sub">班委核心 {coreCount} · 职能班委 {funcCount} · 普通成员 {regularMembers.length}</div>
          <div className="mb-legend">
            <span className="mb-legend-item"><Shield className="mb-i" size={12} />管理员标识</span>
            <span className="mb-legend-item"><Pencil className="mb-i" size={12} />编辑职务</span>
            <span className="mb-legend-item"><ArrowLeftRight className="mb-i" size={12} />切换视角</span>
          </div>
        </div>
      </header>

      {/* 班委核心 */}
      <section className="mb-group">
        <div className="mb-group-head">
          <h2 className="mb-group-title">班委核心</h2>
          <span className="mb-group-count">{coreCount}</span>
          <span className="mb-group-sub">班级领导层 · 班长 / 副班长 / 团支书 / 学习委员</span>
        </div>
        <div className="mb-hairline"></div>
        <div className="mb-org">
          {CORE_ROLES.map(role => {
            const holders = coreMembers.filter(m => m.tags.includes(role) && !shownIds.has(m.id))
            holders.forEach(h => shownIds.add(h.id))
            if (holders.length === 0) return null
            return (
              <div key={role} className="mb-org-row">
                <div className="mb-role-cell">
                  {role === "班长" && <Crown className="mb-crown mb-i" size={13} />}
                  <span className="mb-role-name">{role}<small>{CORE_ROLE_EN[role]}</small></span>
                </div>
                <div className="mb-org-holders">
                  {holders.map(m => (
                    <div key={m.id}>{renderHolder(m, role)}</div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 职能班委 */}
      <section className="mb-group">
        <div className="mb-group-head">
          <h2 className="mb-group-title">职能班委</h2>
          <span className="mb-group-count">{funcCount}</span>
          <span className="mb-group-sub">六个岗位 · 各司其职</span>
        </div>
        <div className="mb-hairline"></div>
        <div className="mb-org">
          {FUNC_ROLES.map(role => {
            const holders = funcMembers.filter(m => m.tags.includes(role) && !shownIds.has(m.id))
            holders.forEach(h => shownIds.add(h.id))
            if (holders.length === 0) return null
            return (
              <div key={role} className="mb-org-row">
                <div className="mb-role-cell">
                  <span className="mb-role-name">{role}</span>
                </div>
                <div className="mb-org-holders">
                  {holders.map(m => (
                    <div key={m.id}>{renderHolder(m, role)}</div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 班级成员 */}
      <section className="mb-group">
        <div className="mb-group-head">
          <h2 className="mb-group-title">班级成员</h2>
          <span className="mb-group-count">{regularMembers.length}</span>
          <span className="mb-group-sub">普通同学 · 全员名单</span>
        </div>
        <div className="mb-hairline"></div>
        <div className="mb-roster">
          {regularMembers.map(m => (
            <div key={m.id} className="mb-member-tile">
              <div className="mb-tile-avatar">
                <span>{m.name[0]}</span>
                {m.role === "admin" && (
                  <span className="mb-shield-badge"><Shield className="mb-i" size={9} /></span>
                )}
              </div>
              <div className="mb-tile-name">{m.name}</div>
              <div className="mb-tile-sid">{m.studentId}</div>
              {isAdmin && (
                <div className="mb-card-actions">
                  <button className="mb-icon-btn" title="编辑职务" onClick={() => setEditingId(editingId === m.id ? null : m.id)}>
                    <Pencil className="mb-i" size={11} />
                  </button>
                  <button className="mb-icon-btn" title="切换视角" onClick={() => handleImpersonate(m)}>
                    <ArrowLeftRight className="mb-i" size={11} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mb-section-foot">
          <Users className="mb-i" size={12} />
          共 {regularMembers.length} 人 · 管理员可编辑职务
        </div>
      </section>
    </main>
    </div>
    </>
  )
}
