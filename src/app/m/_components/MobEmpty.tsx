"use client"

import MobButton from "./MobButton"

interface MobEmptyProps {
  /** 图标（放在圆形底色中） */
  icon?: React.ReactNode
  /** 主文案 */
  title?: string
  /** 辅助说明 */
  desc?: string
  /** 动作按钮文案（提供后渲染按钮） */
  actionText?: string
  /** 动作按钮点击 */
  onAction?: () => void
}

/** 空状态：图标圆 + 标题 + 说明 + 可选动作按钮。 */
export default function MobEmpty({ icon, title, desc, actionText, onAction }: MobEmptyProps) {
  return (
    <div className="mob-empty">
      {icon ? <div className="mob-empty__icon">{icon}</div> : null}
      {title ? <div className="mob-empty__title">{title}</div> : null}
      {desc ? <div className="mob-empty__desc">{desc}</div> : null}
      {actionText && onAction ? (
        <div className="mob-empty__action">
          <MobButton variant="soft" onClick={onAction}>
            {actionText}
          </MobButton>
        </div>
      ) : null}
    </div>
  )
}
