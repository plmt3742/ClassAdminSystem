"use client"

import { Plus } from "lucide-react"

interface MobFabProps {
  onClick: () => void
  /** 无障碍标签 */
  label?: string
}

/** 悬浮操作按钮：右下角、位于 TabBar 之上，主色圆形 + 加号。 */
export default function MobFab({ onClick, label = "新增" }: MobFabProps) {
  return (
    <button type="button" className="mob-fab" onClick={onClick} aria-label={label}>
      <Plus size={24} strokeWidth={2.2} />
    </button>
  )
}
