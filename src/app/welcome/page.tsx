"use client"

import { useEffect, useRef, useState } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowRight, Eye } from "lucide-react"
import gsap from "gsap"

export default function WelcomePage() {
  const router = useRouter()
  const { status } = useSession()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [studentId, setStudentId] = useState("")
  const [password, setPassword] = useState("")
  const cardRef = useRef<HTMLDivElement>(null)
  const decor1Ref = useRef<HTMLDivElement>(null)
  const decor2Ref = useRef<HTMLDivElement>(null)

  // 已登录用户直接进入首页，不再展示登录表单
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/")
    }
  }, [status, router])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(decor1Ref.current, { scale: 0.8, opacity: 0, duration: 1.2, ease: "power2.out" })
      gsap.from(decor2Ref.current, { scale: 0.8, opacity: 0, duration: 1.4, delay: 0.15, ease: "power2.out" })
      gsap.from(cardRef.current, { y: 32, opacity: 0, duration: 0.6, delay: 0.3, ease: "power2.out" })
    })
    return () => ctx.revert()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    const result = await signIn("credentials", { studentId, password, redirect: false })
    setLoading(false)
    if (result?.error) { setError("学号或密码错误") }
    else { router.push("/"); router.refresh() }
  }

  // 游客模式：无需账号，直接进入（数据为演示内容）
  const handleGuest = async () => {
    if (guestLoading) return
    setGuestLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" })
      if (res.ok) {
        // 全页跳转确保 session 重新加载（router.push 会导致首页 session 未就绪而空白）
        window.location.href = "/"
      } else {
        setError("游客模式启动失败，请稍后重试")
        setGuestLoading(false)
      }
    } catch {
      setError("网络异常，请稍后重试")
      setGuestLoading(false)
    }
  }

  // ===== 移动版（设计稿 welcome.html · 登录主界面，≤640px 显示；无 topbar/tabbar） =====
  const mobileView = (
    <div className="m-page-root">
      {/* 登录页专属样式（设计稿 welcome.html 的 <style> 迁移；作用域限定在移动版根容器内） */}
      <style>{`
        .m-page-root .wl-orb {
          position: fixed; border-radius: 50%; pointer-events: none; z-index: 0;
          background: rgba(59,107,138,.04);
        }
        .m-page-root .wl-orb.one { width: 320px; height: 320px; top: -110px; left: -110px; }
        .m-page-root .wl-orb.two { width: 260px; height: 260px; bottom: -90px; right: -80px; }
        .m-page-root .wl-wrap {
          position: relative; z-index: 1;
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          padding: 24px 20px;
        }
        .m-page-root .wl-card {
          width: 100%; max-width: 340px;
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-top: 2px solid var(--color-accent); border-radius: 10px;
          padding: 30px 24px 26px;
          box-shadow: 0 8px 28px rgba(26,29,34,.05);
        }
        .m-page-root .wl-brand { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .m-page-root .wl-logo {
          width: 54px; height: 54px; border-radius: 10px;
          background: var(--color-accent); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-size: 27px; font-weight: 700; letter-spacing: .5px;
          box-shadow: 0 6px 16px var(--color-accent-glow);
        }
        .m-page-root .wl-title { font-family: var(--font-display); font-size: 21px; font-weight: 700; color: var(--color-fg); margin-top: 14px; }
        .m-page-root .wl-sub {
          font-family: var(--font-mono); font-size: 9.5px; color: var(--color-muted);
          letter-spacing: .08em; margin-top: 4px;
        }
        .m-page-root .wl-field { margin-bottom: 14px; }
        .m-page-root .wl-label {
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
        .m-page-root .wl-submit { margin-top: 20px; }
        .m-page-root .wl-submit .btn-primary { width: 100%; min-height: 46px; }
        .m-page-root .wl-foot { text-align: center; margin-top: 16px; }
        .m-page-root .wl-foot .mono {
          font-family: var(--font-mono); font-size: 8.5px; color: var(--color-muted-light);
          letter-spacing: .12em;
        }
        .m-page-root .wl-err {
          display: flex; align-items: center; gap: 6px;
          margin: 0 0 14px; padding: 9px 12px;
          border: 1px solid rgba(220,38,38,.15); border-radius: var(--radius);
          background: var(--color-danger-bg); color: var(--color-danger);
          font-size: 11px;
        }
        .m-page-root .wl-err svg { width: 13px; height: 13px; flex: none; }
        .m-page-root .wl-guest {
          width: 100%; margin-top: 12px; min-height: 40px;
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          border: 1.5px dashed #B9C4CE; border-radius: var(--radius);
          background: transparent; color: var(--color-muted);
          font-size: 12.5px; cursor: pointer; transition: all .18s var(--ease-out);
        }
        .m-page-root .wl-guest:hover { border-color: var(--color-accent); color: var(--color-accent); background: var(--color-accent-subtle); }
        .m-page-root .wl-guest:disabled { opacity: .6; cursor: default; }
        /* 登录页无底部导航（设计稿 welcome.html 无 tabbar；此样式仅存在于本页挂载期间） */
        .m-tabbar { display: none !important; }
      `}</style>

      {/* 两个极淡圆形装饰（accent 4%，延续桌面 welcome 页） */}
      <div className="wl-orb one" />
      <div className="wl-orb two" />

      <div className="wl-wrap">
        <div className="wl-card">
          {/* 品牌区：accent 方块徽标 + 衬线标题 + 副题 */}
          <div className="wl-brand">
            <div className="wl-logo">M</div>
            <h1 className="wl-title">班务管理</h1>
            <div className="wl-sub">班级事务 · 一体化管理平台</div>
          </div>

          {error && (
            <div className="wl-err">
              <AlertCircle size={13} />{error}
            </div>
          )}

          {/* 登录表单（共用现有 handleLogin / signIn 逻辑） */}
          <form onSubmit={handleLogin}>
            <div className="wl-field">
              <label className="wl-label" htmlFor="wlSid">学号</label>
              <input className="form-input" id="wlSid" type="text" placeholder="请输入学号" inputMode="numeric" value={studentId} onChange={e => setStudentId(e.target.value)} required autoFocus />
            </div>
            <div className="wl-field">
              <label className="wl-label" htmlFor="wlPw">密码</label>
              <input className="form-input" id="wlPw" type="password" placeholder="请输入密码" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="wl-submit">
              <button type="submit" className="btn-primary" disabled={loading}>
                <ArrowRight size={14} /> {loading ? "登录中..." : "登录"}
              </button>
            </div>
          </form>

          {/* 游客模式入口：无需账号，查看演示效果 */}
          <button type="button" className="wl-guest" onClick={handleGuest} disabled={guestLoading}>
            <Eye size={13} /> {guestLoading ? "进入中..." : "游客模式 · 无需账号体验"}
          </button>

          <div className="wl-foot"><span className="mono">CLASS ADMIN · 2025-2026</span></div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {mobileView}
      <div className="welcome-desktop">
    <div className="welcome-shell">
      <div ref={decor1Ref} className="welcome-decor" style={{ width: 600, height: 600, top: -200, right: -100 }} />
      <div ref={decor2Ref} className="welcome-decor" style={{ width: 400, height: 400, bottom: -120, left: -80 }} />

      <div ref={cardRef} className="welcome-card">
        <div className="welcome-brand">
          <div className="welcome-brand-icon">M</div>
          <h1>班务管理</h1>
          <p>班级事务 · 一体化管理平台</p>
        </div>

        {error && (
          <div className="form-error">
            <AlertCircle size={14} />{error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">学号</label>
            <input type="text" className="form-input" placeholder="2025404100xxx" value={studentId} onChange={e => setStudentId(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">密码</label>
            <input type="password" className="form-input" placeholder="输入密码" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary welcome-submit" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        {/* 游客模式入口：无需账号，查看演示效果 */}
        <button type="button" className="welcome-guest" onClick={handleGuest} disabled={guestLoading}>
          <Eye size={14} /> {guestLoading ? "进入中..." : "游客模式 · 无需账号体验"}
        </button>
      </div>
    </div>
      </div>
    </>
  )
}
