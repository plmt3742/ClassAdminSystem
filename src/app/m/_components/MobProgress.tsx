"use client"

type ProgressTone = "primary" | "s" | "m" | "t" | "ok" | "warn" | "danger"

interface MobProgressProps {
  /** 进度 0–100 */
  value: number
  /** 左侧标签 */
  label?: string
  /** 是否显示百分比 */
  showPercent?: boolean
  /** 填充色调 */
  tone?: ProgressTone
}

/** 进度条：可选标签/百分比，支持综测三色与语义色填充。 */
export default function MobProgress({ value, label, showPercent = true, tone = "primary" }: MobProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const toneCls = tone === "primary" ? "" : ` mob-progress__fill--${tone}`

  return (
    <div className="mob-progress">
      {label || showPercent ? (
        <div className="mob-progress__head">
          {label ? <span className="mob-progress__label">{label}</span> : <span />}
          {showPercent ? <span className="mob-progress__percent">{Math.round(clamped)}%</span> : null}
        </div>
      ) : null}
      <div className="mob-progress__track">
        <div className={`mob-progress__fill${toneCls}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}
