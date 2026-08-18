"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { ArrowLeft, KeyRound, LogOut } from "lucide-react"
import gsap from "gsap"

const roleLabel: Record<string, string> = { admin: "管理员", class_leader: "班干部", student: "同学" }

// ——— homepage "十字星芒" design tokens (mirrors the hc- block in globals.css) ———
const MONO = '"JetBrains Mono","Cascadia Mono",Consolas,"Courier New",monospace'
const SERIF = 'Georgia,"Songti SC","SimSun","STSong",serif'

const cardStyle: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E0E5EC",
  borderRadius: 6,
  boxShadow: "0 1px 3px rgba(0,0,0,.05)",
  transition: "border-color .22s ease-out, box-shadow .22s ease-out",
}

const specLabelStyle: CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "#8A93A0",
  whiteSpace: "nowrap",
}

const specRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 16,
  padding: "14px 24px",
}

const specDividerStyle: CSSProperties = { height: 1, background: "#E0E5EC" }

const monoValueStyle: CSSProperties = {
  fontFamily: MONO,
  fontSize: 13.5,
  color: "#1A1D22",
  minWidth: 0,
  textAlign: "right",
  wordBreak: "break-all",
}

const serifValueStyle: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 13.5,
  fontWeight: 600,
  color: "#1A1D22",
  minWidth: 0,
  textAlign: "right",
}

/* homepage-style micro section label: mono uppercase + thin steel tick */
function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "#8A93A0", whiteSpace: "nowrap" }}>
      <span style={{ width: 14, height: 1, background: "#3B6B8A", flex: "none" }} />
      {text}
    </div>
  )
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<Record<string, unknown>>({})
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  const [showPwd, setShowPwd] = useState(false)
  const [curPwd, setCurPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [cfmPwd, setCfmPwd] = useState("")
  const [pwdMsg, setPwdMsg] = useState("")
  const [pwdSaving, setPwdSaving] = useState(false)

  const shellRef = useRef<HTMLDivElement>(null)
  const [cardHover, setCardHover] = useState(false)

  useEffect(() => {
    if (!session) return
    fetch("/api/me").then(r => r.json()).then(d => {
      setProfile(d.user || {})
      setEditName(d.user?.name || "")
      setEditBio(d.user?.bio || "")
      setEditPhone(d.user?.phone || "")
    }).catch(() => {})
  }, [session])

  useEffect(() => {
    if (status !== "authenticated") return
    const ctx = gsap.context(() => {
      gsap.from(shellRef.current?.children || [], { y: 28, opacity: 0, duration: 0.45, stagger: 0.08, ease: "power2.out" })
    })
    return () => ctx.revert()
  }, [status])

  if (status === "loading") return <p className="empty-state">加载中...</p>
  if (!session) return null

  const user = session.user

  const handleSave = async () => {
    setSaving(true); setMsg("")
    try {
      const res = await fetch("/api/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, bio: editBio, phone: editPhone }) })
      const data = await res.json()
      if (data.ok) { setProfile(data.user); setEditing(false); setMsg("保存成功"); setTimeout(() => setMsg(""), 2000) }
      else setMsg(data.error || "保存失败")
    } catch { setMsg("保存失败") }
    setSaving(false)
  }

  const handlePwd = async () => {
    if (!curPwd || !newPwd || !cfmPwd) { setPwdMsg("请填写完整"); return }
    if (newPwd !== cfmPwd) { setPwdMsg("两次新密码不一致"); return }
    if (newPwd.length < 6) { setPwdMsg("新密码至少 6 位"); return }
    setPwdSaving(true); setPwdMsg("")
    try {
      const res = await fetch("/api/me/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }) })
      const data = await res.json()
      if (data.ok) { setPwdMsg("修改成功"); setShowPwd(false); setCurPwd(""); setNewPwd(""); setCfmPwd(""); setTimeout(() => setPwdMsg(""), 3000) }
      else setPwdMsg(data.error || "修改失败")
    } catch { setPwdMsg("修改失败") }
    setPwdSaving(false)
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/welcome" })
  }

  // ===== 移动版（设计稿 profile.html · 真实数据，≤640px 显示） =====
  const userTags = ((user as any)?.tags || []) as string[]
  const mobileView = (
    <div className="m-page-root">
      {/* 个人中心页专属样式（设计稿 profile.html 的 <style> 迁移；作用域限定在移动版根容器内） */}
      <style>{`
        .m-page-root .pf-identity {
          display: flex; align-items: center; gap: 15px;
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-top: 2px solid var(--color-accent); border-radius: var(--radius);
          padding: 20px 16px; margin: 16px 16px 0;
        }
        .m-page-root .pf-identity .m-avatar { width: 58px; height: 58px; font-size: 27px; border-radius: 10px; }
        .m-page-root .pf-identity .m-id-name { font-size: 20px; }
        .m-page-root .pf-identity .m-id-sid { font-size: 11.5px; }
        .m-page-root .pf-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .m-page-root .pf-tags .chip { font-size: 9.5px; padding: 2px 8px; }
        .m-page-root .pf-card {
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: var(--radius); padding: 15px 16px 17px;
        }
        .m-page-root .pf-section { padding: 18px 16px 0; }
        .m-page-root .pf-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
        .m-page-root .pf-title { font-family: var(--font-display); font-size: 15px; font-weight: 700; }
        .m-page-root .pf-sub {
          font-family: var(--font-mono); font-size: 8.5px; color: var(--color-muted-light);
          letter-spacing: .1em; text-transform: uppercase;
        }
        .m-page-root .pf-row { margin-bottom: 13px; }
        .m-page-root .pf-row:last-child { margin-bottom: 0; }
        .m-page-root .pf-label {
          display: block; font-family: var(--font-mono); font-size: 9px;
          font-weight: 700; letter-spacing: .14em; color: var(--color-muted);
          margin-bottom: 6px; text-transform: uppercase;
        }
        .m-page-root .form-input {
          width: 100%; height: 38px; padding: 0 12px;
          border: 1.5px solid #E3E7EB; border-radius: var(--radius);
          background: var(--color-surface); color: var(--color-fg);
          font-family: var(--font-ui); font-size: 14px; outline: none;
          transition: border-color .18s var(--ease-out), box-shadow .18s var(--ease-out);
        }
        .m-page-root .form-input:focus { border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(59,107,138,.12); }
        .m-page-root .form-input::placeholder { color: var(--color-muted-light); }
        .m-page-root .pf-save { margin-top: 6px; display: flex; align-items: center; justify-content: flex-end; }
        .m-page-root .pf-save .btn-ghost { border: 1px solid var(--color-border); color: var(--color-accent); }
        .m-page-root .pf-save .btn-ghost:disabled { opacity: .5; }
        .m-page-root .pf-msg { font-family: var(--font-mono); font-size: 10px; margin-left: 10px; }
        .m-page-root .pf-msg.ok { color: var(--color-success); }
        .m-page-root .pf-msg.err { color: var(--color-danger); }
        .m-page-root .pf-exit { display: flex; justify-content: center; padding: 18px 16px 0; }
        .m-page-root .pf-exit-link {
          font-size: 12px; color: var(--color-muted-light);
          padding: 8px 16px; border-radius: var(--radius);
          letter-spacing: .03em; transition: color .18s var(--ease-out), background .18s var(--ease-out);
          display: inline-flex; align-items: center; gap: 5px;
          background: none; border: none; cursor: pointer;
        }
        .m-page-root .pf-exit-link svg { width: 13px; height: 13px; }
        .m-page-root .pf-exit-link:active { color: var(--color-danger); background: var(--color-danger-bg); }
      `}</style>

      <header className="m-topbar">
        <Link className="m-back" href="/modules" aria-label="返回模块"><ArrowLeft size={18} /></Link>
        <span className="m-title">个人中心<small>PROFILE</small></span>
      </header>

      {/* 身份卡（放大版：方块头像 + 姓名 + 学号 + 角色 + 标签 chips） */}
      <div className="pf-identity fx-item" style={{ animationDelay: "0ms" }}>
        <div
          className="m-avatar"
          style={user?.image ? { backgroundImage: `url(${user.image})`, backgroundSize: "cover", backgroundPosition: "center", color: "transparent" } : undefined}
        >
          {user?.image ? "" : (user?.name?.[0] || "?")}
        </div>
        <div className="m-id-meta">
          <div className="m-id-name">{user?.name}</div>
          <div className="m-id-sid">{user?.studentId || "—"}</div>
          <span className="m-id-role">{roleLabel[(profile.role as string) || "student"]}</span>
          {userTags.length > 0 && (
            <div className="pf-tags">
              {userTags.map(t => (
                <span key={t} className="chip ok"><span className="lamp" />{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 编辑资料（姓名 / 个性签名 / 电话 → PUT /api/me） */}
      <section className="pf-section fx-item" style={{ animationDelay: "45ms" }}>
        <div className="pf-head">
          <span className="pf-title">编辑资料</span>
          <span className="pf-sub">Edit Profile</span>
        </div>
        <div className="pf-card">
          <div className="pf-row">
            <label className="pf-label" htmlFor="mPfName">姓名</label>
            <input className="form-input" id="mPfName" type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="姓名" />
          </div>
          <div className="pf-row">
            <label className="pf-label" htmlFor="mPfBio">个性签名</label>
            <input className="form-input" id="mPfBio" type="text" value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="写一句你的个性签名" />
          </div>
          <div className="pf-row">
            <label className="pf-label" htmlFor="mPfPhone">电话</label>
            <input className="form-input" id="mPfPhone" type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="—" />
          </div>
          <div className="pf-save">
            <button className="btn-ghost" onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存修改"}</button>
            {msg && <span className={`pf-msg${msg === "保存成功" ? " ok" : " err"}`}>{msg}</span>}
          </div>
        </div>
      </section>

      {/* 账号安全（当前 / 新 / 确认密码 → PUT /api/me/password） */}
      <section className="pf-section fx-item" style={{ animationDelay: "90ms" }}>
        <div className="pf-head">
          <span className="pf-title">账号安全</span>
          <span className="pf-sub">Security</span>
        </div>
        <div className="pf-card">
          <div className="pf-row">
            <label className="pf-label" htmlFor="mPfPwOld">当前密码</label>
            <input className="form-input" id="mPfPwOld" type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} placeholder="请输入当前密码" />
          </div>
          <div className="pf-row">
            <label className="pf-label" htmlFor="mPfPwNew">新密码</label>
            <input className="form-input" id="mPfPwNew" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="请输入新密码" />
          </div>
          <div className="pf-row">
            <label className="pf-label" htmlFor="mPfPwCfm">确认新密码</label>
            <input className="form-input" id="mPfPwCfm" type="password" value={cfmPwd} onChange={e => setCfmPwd(e.target.value)} placeholder="请再次输入新密码" />
          </div>
          <div className="pf-save">
            <button className="btn-ghost" onClick={handlePwd} disabled={pwdSaving}>{pwdSaving ? "修改中..." : "保存修改"}</button>
            {pwdMsg && <span className={`pf-msg${pwdMsg.includes("成功") ? " ok" : " err"}`}>{pwdMsg}</span>}
          </div>
        </div>
      </section>

      {/* 退出登录（低调灰色小按钮，13px 图标 → /welcome） */}
      <div className="pf-exit fx-item" style={{ animationDelay: "135ms" }}>
        <button className="pf-exit-link" onClick={handleSignOut} aria-label="退出登录">
          <LogOut size={13} />退出登录
        </button>
      </div>

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        班级事务 · 一体化管理平台<br /><b>CLASS ADMIN</b> · 数据每日 23:00 同步
      </div>
    </div>
  )

  return (
    <>
    {mobileView}
    <div className="profile-desktop">
    <main className="profile-shell" ref={shellRef} style={{ padding: "48px 0 80px", gap: 28 }}>
      {/* ===== 资料 · PROFILE ===== */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel text="资料 · PROFILE" />

        {/* centerpiece — wide "center circle" card */}
        <div
          className="profile-header-card"
          style={{
            ...cardStyle,
            padding: "36px",
            gap: 28,
            borderColor: cardHover ? "#3B6B8A" : "#E0E5EC",
            boxShadow: cardHover ? "0 6px 18px rgba(0,0,0,.08)" : "0 1px 3px rgba(0,0,0,.05)",
          }}
          onMouseEnter={() => setCardHover(true)}
          onMouseLeave={() => setCardHover(false)}
        >
          <div
            className="hc-avatar-big"
            style={{
              width: 72, height: 72, fontSize: 32, flex: "none",
              boxShadow: cardHover ? "0 0 0 6px rgba(59,107,138,.12)" : undefined,
              ...(user?.image ? { backgroundImage: `url(${user.image})`, backgroundSize: "cover", backgroundPosition: "center", color: "transparent" } : {}),
            }}
          >
            {user?.image ? "" : (user?.name?.[0] || "?")}
          </div>

          <div className="profile-header-info">
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input className="form-input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="姓名" style={{ maxWidth: 240 }} />
                <input className="form-input" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="手机号" style={{ maxWidth: 240 }} />
                <textarea className="form-input" value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="个人简介" rows={3} style={{ maxWidth: 360, resize: "vertical" }} />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存"}</button>
                  <button className="btn-ghost" onClick={() => setEditing(false)}>取消</button>
                  {msg && <span style={{ fontSize: "0.82rem", color: "var(--color-success)" }}>{msg}</span>}
                </div>
              </div>
            ) : (
              <>
                <div className="hc-user-name" style={{ fontSize: 24 }}>{user?.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 7, flexWrap: "wrap" }}>
                  <span className="hc-user-role">{roleLabel[(profile.role as string) || "student"]}</span>
                  <span className="hc-user-id">学号 {user?.studentId || "—"}</span>
                </div>
                {(profile.bio as string) && (
                  <div style={{ marginTop: 12, fontFamily: SERIF, fontStyle: "italic", fontSize: 13, lineHeight: 1.7, color: "#4A5463" }}>
                    {profile.bio as string}
                  </div>
                )}
                <button
                  className="btn-ghost"
                  style={{ marginTop: 16, fontSize: 11, letterSpacing: ".06em", borderColor: "#E0E5EC", color: "#4A5463" }}
                  onClick={() => setEditing(true)}
                >编辑资料</button>
              </>
            )}
          </div>
        </div>

        {/* spec sheet — two-column list with hairline dividers */}
        <div style={cardStyle}>
          <div style={specRowStyle}>
            <div style={specLabelStyle}>学号</div>
            <div style={monoValueStyle}>{user?.studentId}</div>
          </div>
          <div style={specDividerStyle} />
          {(profile.phone as string) && (
            <>
              <div style={specRowStyle}>
                <div style={specLabelStyle}>手机</div>
                <div style={monoValueStyle}>{profile.phone as string}</div>
              </div>
              <div style={specDividerStyle} />
            </>
          )}
          <div style={specRowStyle}>
            <div style={specLabelStyle}>角色</div>
            <div style={serifValueStyle}>{roleLabel[(profile.role as string) || "student"]}</div>
          </div>
          <div style={specDividerStyle} />
          <div style={specRowStyle}>
            <div style={specLabelStyle}>加入时间</div>
            <div style={monoValueStyle}>{profile.createdAt ? new Date(profile.createdAt as string).toLocaleDateString("zh-CN") : "—"}</div>
          </div>
        </div>
      </div>

      {/* ===== 安全 · SECURITY ===== */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel text="安全 · SECURITY" />

        <div className="profile-pwd-card" style={{ ...cardStyle, padding: 26 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="profile-pwd-title" style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: "#1A1D22" }}>
              <KeyRound size={16} style={{ color: "#3B6B8A" }} />
              修改密码
            </div>
            {!showPwd && <button className="btn-ghost" onClick={() => setShowPwd(true)}>修改</button>}
          </div>
          {showPwd && (
            <div className="profile-pwd-form">
              <input type="password" className="form-input" value={curPwd} onChange={e => setCurPwd(e.target.value)} placeholder="当前密码" />
              <input type="password" className="form-input" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="新密码（至少6位）" />
              <input type="password" className="form-input" value={cfmPwd} onChange={e => setCfmPwd(e.target.value)} placeholder="确认新密码" />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn-primary" onClick={handlePwd} disabled={pwdSaving}>{pwdSaving ? "修改中..." : "确认修改"}</button>
                <button className="btn-ghost" onClick={() => { setShowPwd(false); setCurPwd(""); setNewPwd(""); setCfmPwd(""); setPwdMsg("") }}>取消</button>
                {pwdMsg && <span style={{ fontSize: "0.82rem", color: pwdMsg.includes("成功") ? "var(--color-success)" : "var(--color-danger)" }}>{pwdMsg}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
    </div>
    </>
  )
}
