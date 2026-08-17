"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

interface MobTopBarProps {
  /** 页面标题（17-18px 半粗） */
  title?: React.ReactNode
  /** 标题左侧图标（可选，如首页的班级图标） */
  icon?: React.ReactNode
  /** 是否显示返回按钮 */
  back?: boolean
  /** 自定义返回行为，默认 router.back() */
  onBack?: () => void
  /** 右侧插槽 */
  right?: React.ReactNode
}

/**
 * 吸顶顶栏：外层 sticky 容器（透明 + 安全区），内层为与卡片同圆角的白色圆角条。
 * 全程白条；无返回按钮时图标 + 标题与页面卡片左缘对齐（16px）。
 */
export default function MobTopBar({ title, icon, back, onBack, right }: MobTopBarProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) onBack()
    else router.back()
  }

  return (
    <div className="mob-topbar-wrap">
      <header className="mob-topbar">
        {back ? (
          <button type="button" className="mob-topbar__back" onClick={handleBack} aria-label="返回">
            <ChevronLeft size={24} strokeWidth={2} />
          </button>
        ) : null}
        {icon ? <span className="mob-topbar__icon">{icon}</span> : null}
        <div className="mob-topbar__title">{title}</div>
        {right ? <div className="mob-topbar__right">{right}</div> : null}
      </header>
    </div>
  )
}
