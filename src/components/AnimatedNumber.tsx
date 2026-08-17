"use client"

// 数字滚动动画（缓出），供综测看板/仪表盘共用
import { useEffect, useRef, useState } from "react"

export default function AnimatedNumber({ value, showZero = false }: { value: number; showZero?: boolean }) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)

  useEffect(() => {
    if (value === 0 && !showZero) { prevRef.current = 0; return }
    const from = prevRef.current
    const start = performance.now()
    const duration = 900
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = from + (value - from) * eased
      setDisplay(v)
      if (p < 1) raf = requestAnimationFrame(tick)
      else prevRef.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, showZero])

  return <>{value > 0 || showZero ? display.toFixed(2) : "--"}</>
}
