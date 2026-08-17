"use client"

interface MobLoadingProps {
  /** 骨架行数 */
  rows?: number
}

interface MobLoadingBlockProps {
  width?: string
  height?: number
  dark?: boolean
}

/** 骨架屏容器：渲染 N 条闪烁灰色块。 */
export default function MobLoading({ rows = 4 }: MobLoadingProps) {
  return (
    <div className="mob-loading" aria-busy="true" aria-label="加载中">
      {Array.from({ length: rows }).map((_, i) => (
        <MobLoading.Block key={i} width={i % 3 === 0 ? "100%" : "72%"} height={i === 0 ? 18 : 14} />
      ))}
    </div>
  )
}

/** 单个闪烁骨架块（可自定义宽高，dark 用于深色底）。 */
MobLoading.Block = function Block({ width = "100%", height = 14, dark = false }: MobLoadingBlockProps) {
  return (
    <div
      className={`mob-loading__block${dark ? " mob-loading__block--dark" : ""}`}
      style={{ width, height }}
    />
  )
}
