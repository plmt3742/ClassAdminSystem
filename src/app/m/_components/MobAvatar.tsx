"use client"

interface MobAvatarProps {
  /** 姓名（用于取首字） */
  name?: string
  /** 头像图片地址（优先于 initials） */
  src?: string
  /** 尺寸 */
  size?: "sm" | "md" | "lg"
  /** 蓝色系分级：deep 深蓝(班委核心) / mid 中蓝(默认) / light 浅蓝(普通成员) */
  tone?: "deep" | "mid" | "light"
}

/** 首字头像：统一蓝色系（避免杂色），支持图片覆盖。 */
export default function MobAvatar({ name = "", src, size = "md", tone = "mid" }: MobAvatarProps) {
  const initial = name.trim().charAt(0) || "?"

  return (
    <span
      className={`mob-avatar mob-avatar--${size} mob-avatar--${tone}`}
      style={src ? { backgroundImage: `url(${src})` } : undefined}
      aria-hidden="true"
    >
      {src ? null : initial}
    </span>
  )
}
