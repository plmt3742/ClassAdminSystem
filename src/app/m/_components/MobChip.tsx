"use client"

type ChipTone = "ok" | "warn" | "danger" | "info" | "neutral" | "s" | "m" | "t"

interface MobChipProps {
  /** 语义色调；s/m/t 为综测三色 */
  tone?: ChipTone
  children: React.ReactNode
}

/** 状态胶囊 / 标签：用于审核状态（待审核/已通过/已退回）与综测分色标记。 */
export default function MobChip({ tone = "neutral", children }: MobChipProps) {
  return <span className={`mob-chip mob-chip--${tone}`}>{children}</span>
}
