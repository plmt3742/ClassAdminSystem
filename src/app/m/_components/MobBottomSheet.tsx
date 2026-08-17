"use client"

import { X } from "lucide-react"

interface MobBottomSheetProps {
  /** 是否展开 */
  open: boolean
  /** 面板标题（可选） */
  title?: React.ReactNode
  /** 关闭回调（点遮罩 / 关闭键触发） */
  onClose: () => void
  children?: React.ReactNode
}

/** 底部弹层：遮罩 + 上滑面板，点遮罩关闭，含安全区下内边距。 */
export default function MobBottomSheet({ open, title, onClose, children }: MobBottomSheetProps) {
  if (!open) return null

  return (
    <div className="mob-sheet" role="dialog" aria-modal="true">
      <div className="mob-sheet__mask" onClick={onClose} />
      <div className="mob-sheet__panel">
        <div className="mob-sheet__handle" aria-hidden="true" />
        <div className="mob-sheet__head">
          <div className="mob-sheet__title">{title}</div>
          <button type="button" className="mob-sheet__close" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </div>
        <div className="mob-sheet__body">{children}</div>
      </div>
    </div>
  )
}
