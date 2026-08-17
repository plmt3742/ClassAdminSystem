"use client"

interface MobScoreRingProps {
  /** 当前分数 */
  value: number
  /** 满分（默认 100） */
  max?: number
  /** 环下标签（如 S / M / T） */
  label?: string
  /** 色调（综测三色） */
  tone?: "s" | "m" | "t"
  /** 尺寸：sm≈72px，lg≈96px */
  size?: "sm" | "lg"
}

const TONE_COLOR: Record<"s" | "m" | "t", string> = {
  s: "#3D5A6E",
  m: "#C5855A",
  t: "#5A8C6F",
}

/** 综测 S/M/T 圆形分数环：SVG 描边进度 + 大号衬线数字 + 标签。 */
export default function MobScoreRing({ value, max = 100, label, tone = "s", size = "sm" }: MobScoreRingProps) {
  const diameter = size === "lg" ? 96 : 72
  const stroke = size === "lg" ? 8 : 6
  const r = (diameter - stroke) / 2
  const c = 2 * Math.PI * r
  const ratio = Math.min(1, Math.max(0, max > 0 ? value / max : 0))
  const offset = c * (1 - ratio)
  const color = TONE_COLOR[tone]
  const fontSize = size === "lg" ? 26 : 20

  return (
    <span className="mob-score-ring">
      <svg className="mob-score-ring__svg" width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`} role="img" aria-label={label ? `${label} ${value}/${max}` : `${value}/${max}`}>
        <circle className="mob-score-ring__track" cx={diameter / 2} cy={diameter / 2} r={r} strokeWidth={stroke} />
        <circle
          className="mob-score-ring__arc"
          cx={diameter / 2}
          cy={diameter / 2}
          r={r}
          strokeWidth={stroke}
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          style={{ fill: "var(--fg)", fontFamily: "var(--font-display)", fontSize, fontWeight: 700 }}
        >
          {Math.round(value)}
        </text>
      </svg>
      {label ? <span className="mob-score-ring__label" style={{ color }}>{label}</span> : null}
    </span>
  )
}
