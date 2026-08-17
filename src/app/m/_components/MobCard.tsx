"use client"

interface MobCardProps {
  /** 卡片标题（位于头部） */
  title?: React.ReactNode
  /** 头部右侧插槽（如「查看全部」） */
  extra?: React.ReactNode
  /** 内容是否套用默认内边距 */
  padding?: boolean
  /** 是否可点击（按压微缩反馈） */
  onClick?: () => void
  className?: string
  children?: React.ReactNode
}

/** 白色圆角卡片（16px 圆角 + 软阴影），可选标题/extra/padding。 */
export default function MobCard({ title, extra, padding = true, onClick, className = "", children }: MobCardProps) {
  const hasHead = Boolean(title || extra)
  const clickable = Boolean(onClick)

  const cls = [
    "mob-card",
    padding ? "mob-card--pad" : "",
    clickable ? "mob-card--clickable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <section className={cls} onClick={onClick} role={clickable ? "button" : undefined} tabIndex={clickable ? 0 : undefined}>
      {hasHead && (
        <div className="mob-card__head">
          <div className="mob-card__title">{title}</div>
          {extra ? <div className="mob-card__extra">{extra}</div> : null}
        </div>
      )}
      {hasHead ? <div className="mob-card__body">{children}</div> : children}
    </section>
  )
}
