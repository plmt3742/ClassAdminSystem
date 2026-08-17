"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { LogOut, User, UserCog, Undo2 } from "lucide-react"
import gsap from "gsap"

export default function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const navRef = useRef<HTMLElement>(null)
  const [switchingBack, setSwitchingBack] = useState(false)

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const onScroll = () => el.classList.toggle("scrolled", window.scrollY > 10)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!navRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(navRef.current, { y: -8, opacity: 0, duration: 0.45, ease: "power2.out" })
    }, navRef)
    return () => ctx.revert()
  }, [])

  // 身份切换横幅出现时，通知页面内吸顶元素（如综测看板 topbar）下移，
  // 避免与横幅重叠：--sticky-offset = 导航栏 56px + 横幅 34px
  const impersonator = session?.user?.impersonator
  const isGuest = session?.user?.role === "guest"

  // 身份切换横幅出现时，通知页面内吸顶元素（如综测看板 topbar）下移，
  // 避免与横幅重叠：--sticky-offset = 导航栏 56px + 横幅 34px
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--sticky-offset", impersonator ? "90px" : "56px")
    return () => { root.style.setProperty("--sticky-offset", "56px") }
  }, [impersonator])

  if (!session) return null

  const handleBack = async () => {
    if (switchingBack) return
    setSwitchingBack(true)
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ back: true }),
      })
      if (res.ok) window.location.href = "/"
      else alert("恢复失败，请重新登录")
    } catch {
      alert("网络异常")
    } finally {
      setSwitchingBack(false)
    }
  }

  return (
    <>
      {/* 切换视角横幅 */}
      {impersonator && (
        <div className="impersonation-bar">
          <UserCog size={13} />
          <span>
            正在以 <b>{session.user?.name}</b>（{session.user?.studentId}）的身份操作
          </span>
          <button onClick={handleBack} disabled={switchingBack} className="impersonation-back">
            <Undo2 size={12} /> {switchingBack ? "恢复中..." : `返回管理员（${impersonator.name ?? "原账号"}）`}
          </button>
        </div>
      )}
      <nav ref={navRef} className="navbar">
        <Link href="/" className="navbar-brand">
          <span className="navbar-brand-dot" />
          班务管理
        </Link>

        <div className="navbar-nav">
          <Link href="/" className={`nav-link ${pathname === "/" ? "is-active" : ""}`}>首页</Link>
          {!isGuest && <Link href="/profile" className={`nav-link ${pathname === "/profile" ? "is-active" : ""}`}>个人</Link>}
        </div>

        <div className="navbar-actions">
          <span className="nav-link">
            <User size={16} />
            {session.user?.name}
          </span>
          <button onClick={() => signOut({ callbackUrl: window.location.origin + "/welcome" })} className="btn-ghost">
            <LogOut size={14} />
          </button>
        </div>
      </nav>
      {/* 固定顶栏占位：补偿脱离文档流的 56px，防止内容被遮挡 */}
      <div className="navbar-spacer" aria-hidden="true" />
      {impersonator && <div className="impersonation-bar-spacer" aria-hidden="true" />}
    </>
  )
}
