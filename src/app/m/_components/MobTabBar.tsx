"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, LayoutGrid, UserRound, ClipboardList, CalendarDays, Megaphone, Users } from "lucide-react"
import MobModulePanel from "./MobModulePanel"

/** 中间槽位：根据当前路径动态显示所在模块（icon + 文本），首页时显示"功能"。 */
const CENTER_MAP: { prefix: string; label: string; icon: typeof Home }[] = [
  { prefix: "/m/zongce", label: "综测", icon: ClipboardList },
  { prefix: "/m/activities", label: "活动", icon: CalendarDays },
  { prefix: "/m/announcements", label: "公告", icon: Megaphone },
  { prefix: "/m/members", label: "成员", icon: Users },
]

/**
 * 固定底部导航（3 个 Tab）：首页 / 中间槽位 / 我的。
 * 中间槽位：进入某模块后显示该模块的 icon + 文本（高亮），点击打开功能宫格面板。
 */
export default function MobTabBar() {
  const pathname = usePathname()
  const [panelOpen, setPanelOpen] = useState(false)

  const homeActive = pathname === "/m"
  const profileActive = pathname.startsWith("/m/profile")

  const center = CENTER_MAP.find(c => pathname.startsWith(c.prefix))
  const centerActive = center !== undefined
  const CenterIcon = center?.icon ?? LayoutGrid
  const centerLabel = center?.label ?? "功能"

  return (
    <>
      <nav className="mob-tabbar" aria-label="移动端主导航">
        <Link href="/m" className={`mob-tabbar__item${homeActive ? " mob-tabbar__item--active" : ""}`} aria-current={homeActive ? "page" : undefined}>
          <Home className="mob-tabbar__icon" size={22} strokeWidth={1.8} aria-hidden="true" />
          <span className="mob-tabbar__label">首页</span>
        </Link>
        <button
          type="button"
          className={`mob-tabbar__item${centerActive || panelOpen ? " mob-tabbar__item--active" : ""}`}
          onClick={() => setPanelOpen(v => !v)}
          aria-label="功能"
        >
          <CenterIcon className="mob-tabbar__icon" size={22} strokeWidth={1.8} aria-hidden="true" />
          <span className="mob-tabbar__label">{centerLabel}</span>
        </button>
        <Link href="/m/profile" className={`mob-tabbar__item${profileActive ? " mob-tabbar__item--active" : ""}`} aria-current={profileActive ? "page" : undefined}>
          <UserRound className="mob-tabbar__icon" size={22} strokeWidth={1.8} aria-hidden="true" />
          <span className="mob-tabbar__label">我的</span>
        </Link>
      </nav>
      <MobModulePanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  )
}
