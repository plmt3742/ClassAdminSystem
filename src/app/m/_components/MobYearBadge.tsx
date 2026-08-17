"use client"

interface MobYearBadgeProps {
  /** 学年，如 2025-2026 */
  year: string
}

/** 学年徽章（综测页常用，如 2025-2026）。 */
export default function MobYearBadge({ year }: MobYearBadgeProps) {
  return <span className="mob-year-badge">{year}</span>
}
