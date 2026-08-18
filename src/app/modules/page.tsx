"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  ArrowLeft, ClipboardCheck, Flag, Users, PenSquare, Images, User, ChevronRight,
} from "lucide-react"

/** 模块选择页（设计稿 modules.html 的框架内实现）。
    仅移动端显示（桌面端从首页直接进入各模块，此页桌面隐藏）。 */
interface ModuleItem {
  name: string
  sub: string
  href: string
  icon: typeof ClipboardCheck
  badge?: string
}

export default function ModulesPage() {
  const { data: session } = useSession()
  const [zongceTodo, setZongceTodo] = useState("")

  // 综测待办数（真实数据，静默失败）
  useEffect(() => {
    fetch("/api/zongce/dashboard")
      .then(r => r.json())
      .then(d => {
        const pending = (d.pendingReviews || []).length
        const unfilled = (d.sections || []).filter((s: { status: string; section: string }) =>
          ["S", "A", "D", "E", "F"].includes(s.section) && s.status === "not_started").length
        const n = pending + unfilled
        if (n > 0) setZongceTodo(`${n} 项待办`)
      })
      .catch(() => {})
  }, [])

  // 游客模式：隐藏班委/管理入口（公告撰写、照片中心）
  const isGuest = session?.user?.role === "guest"

  const mods: ModuleItem[] = [
    { name: "综测工作", sub: zongceTodo || "7 大板块", href: "/zongce", icon: ClipboardCheck },
    { name: "活动参与", sub: "轮次抽签 · 委托管理", href: "/activities", icon: Flag },
    { name: "班级成员", sub: "班委核心 · 全员名单", href: "/members", icon: Users },
    ...(isGuest ? [] : [
      { name: "公告撰写", sub: "发布班级公告（班委）", href: "/announcements/new", icon: PenSquare },
      { name: "照片中心", sub: "佐证照片汇总（班委）", href: "/zongce/photos", icon: Images },
    ]),
    ...(isGuest ? [] : [{ name: "个人中心", sub: "编辑资料 · 修改密码", href: "/profile", icon: User }]),
  ]

  return (
    <div className="m-page-root">
      <header className="m-topbar">
        <Link className="m-back" href="/" aria-label="返回首页">
          <ArrowLeft size={18} />
        </Link>
        <span className="m-title">模块<small>MODULES</small></span>
        <span className="m-year">2025-2026</span>
      </header>

      <div className="m-pad" style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {mods.map(m => {
          const Icon = m.icon
          return (
            <Link key={m.name} href={m.href} className="m-card">
              <span className="tile"><Icon size={20} /></span>
              <span className="body">
                <span className="name">{m.name}</span>
                <span className="sub">{m.sub}</span>
              </span>
              <span className="chev"><ChevronRight size={16} /></span>
            </Link>
          )
        })}
      </div>

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        班级事务 · 一体化管理平台
      </div>
    </div>
  )
}
