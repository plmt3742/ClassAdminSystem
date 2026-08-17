"use client"

import { ChevronRight } from "lucide-react"

interface MobListItemProps {
  /** 左侧图标/头像插槽 */
  icon?: React.ReactNode
  /** 标题 */
  title: React.ReactNode
  /** 副标题/描述 */
  subtitle?: React.ReactNode
  /** 右侧插槽（数值/徽章/标签） */
  right?: React.ReactNode
  /** 是否显示右侧箭头 */
  chevron?: boolean
  /** 危险样式（标题变红） */
  danger?: boolean
  /** 右上角数字角标 */
  badge?: string | number
  onClick?: () => void
}

/** 列表行：左图标/头像 + 标题/副标题 + 右侧插槽（值/徽章/箭头），可点击。 */
export default function MobListItem({ icon, title, subtitle, right, chevron = false, danger = false, badge, onClick }: MobListItemProps) {
  const clickable = Boolean(onClick)

  return (
    <div
      className={`mob-list-item${clickable ? " mob-list-item--clickable" : ""}${danger ? " mob-list-item--danger" : ""}`}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {icon ? <span className="mob-list-item__lead">{icon}</span> : null}
      <span className="mob-list-item__body">
        <span className="mob-list-item__title">{title}</span>
        {subtitle ? <span className="mob-list-item__subtitle">{subtitle}</span> : null}
      </span>
      <span className="mob-list-item__right">
        {badge !== undefined ? <span className="mob-list-item__badge">{badge}</span> : null}
        {right}
        {chevron ? <ChevronRight size={18} /> : null}
      </span>
    </div>
  )
}
