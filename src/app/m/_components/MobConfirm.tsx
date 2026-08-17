"use client"

import MobButton from "./MobButton"

interface MobConfirmProps {
  /** 是否显示 */
  open: boolean
  /** 标题 */
  title?: React.ReactNode
  /** 描述 / 正文内容 */
  children?: React.ReactNode
  /** 取消按钮文案 */
  cancelText?: string
  /** 确认按钮文案 */
  confirmText?: string
  /** 确认按钮色调（danger 用于删除等危险操作） */
  tone?: "default" | "danger"
  /** 确认中（禁用按钮） */
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** 居中确认对话框：标题 + 描述 + 取消/确认（可危险红）。 */
export default function MobConfirm({
  open,
  title,
  children,
  cancelText = "取消",
  confirmText = "确定",
  tone = "default",
  loading = false,
  onCancel,
  onConfirm,
}: MobConfirmProps) {
  if (!open) return null

  return (
    <div className="mob-confirm" role="alertdialog" aria-modal="true">
      <div className="mob-confirm__mask" onClick={onCancel} />
      <div className="mob-confirm__panel">
        {title ? <div className="mob-confirm__title">{title}</div> : null}
        {children ? <div className="mob-confirm__desc">{children}</div> : null}
        <div className="mob-confirm__actions">
          <MobButton variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelText}
          </MobButton>
          <MobButton variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmText}
          </MobButton>
        </div>
      </div>
    </div>
  )
}
