"use client"

interface MobButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 视觉变体 */
  variant?: "primary" | "ghost" | "danger" | "soft"
  /** 尺寸（最小触控高度 44px） */
  size?: "sm" | "md" | "lg"
  /** 占满整行 */
  block?: boolean
  /** 加载中（显示 spinner 并禁用） */
  loading?: boolean
}

/** 触控友好的按钮：primary/ghost/danger/soft 变体，44px 最小高度与按压反馈。 */
export default function MobButton({
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: MobButtonProps) {
  const cls = [
    "mob-btn",
    `mob-btn--${variant}`,
    size !== "md" ? `mob-btn--${size}` : "",
    block ? "mob-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <button type="button" className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <span className="mob-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}
