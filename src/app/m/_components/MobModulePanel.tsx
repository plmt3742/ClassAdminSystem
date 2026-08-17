"use client"

import { useRouter } from "next/navigation"
import { X, ClipboardList, CalendarDays, Megaphone, Users } from "lucide-react"

interface ModuleDef {
  key: string
  label: string
  icon: typeof ClipboardList
  href: string
}

// 全部同学通用的核心模块（其余入口分散在各页面内部）
const MODULES: ModuleDef[] = [
  { key: "zongce", label: "综测", icon: ClipboardList, href: "/m/zongce" },
  { key: "activities", label: "活动", icon: CalendarDays, href: "/m/activities" },
  { key: "announcements", label: "公告", icon: Megaphone, href: "/m/announcements" },
  { key: "members", label: "成员", icon: Users, href: "/m/members" },
]

interface MobModulePanelProps {
  open: boolean
  onClose: () => void
}

/** 功能宫格面板：从底部滑出，仅保留全部同学通用的核心模块。 */
export default function MobModulePanel({ open, onClose }: MobModulePanelProps) {
  const router = useRouter()

  if (!open) return null

  const go = (href: string) => {
    onClose()
    router.push(href)
  }

  return (
    <div className="mob-modpanel" role="dialog" aria-label="全部功能">
      <div className="mob-modpanel__mask" onClick={onClose} />
      <div className="mob-modpanel__panel">
        <div className="mob-modpanel__head">
          <div className="mob-modpanel__title">功能</div>
          <button type="button" className="mob-modpanel__close" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </div>
        <div className="mob-modpanel__grid">
          {MODULES.map(m => {
            const Icon = m.icon
            return (
              <button key={m.key} type="button" className="mob-modpanel__item" onClick={() => go(m.href)}>
                <span className="mob-modpanel__ic"><Icon size={22} strokeWidth={1.8} /></span>
                <span className="mob-modpanel__label">{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
