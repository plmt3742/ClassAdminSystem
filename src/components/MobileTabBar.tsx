"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, LayoutGrid, User } from "lucide-react"

/** 移动端底部导航（≤640px 显示）。按设计稿：首页 / 模块 / 我的。icon 20px。 */
const TABS = [
  { href: "/", label: "首页", icon: Home },
  { href: "/modules", label: "模块", icon: LayoutGrid },
  { href: "/profile", label: "我的", icon: User },
]

export default function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav className="m-tabbar" aria-label="移动端导航">
      {TABS.map(t => {
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href)
        const Icon = t.icon
        return (
          <Link key={t.href} href={t.href} className={`m-tab${active ? " on" : ""}`}>
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            <span className="m-tab-lb">{t.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
