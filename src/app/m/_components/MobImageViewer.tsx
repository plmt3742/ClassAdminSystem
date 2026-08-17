"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

export interface MobViewerImage {
  url: string
  label?: string
}

interface MobImageViewerProps {
  images: MobViewerImage[]
  index: number
  onClose: () => void
  onIndexChange?: (i: number) => void
}

const ZOOM = 2.5

/**
 * 移动端全屏图片查看器：单击切换缩放（1x/2.5x），放大后可拖拽平移，
 * 多图左右箭头切换，右上角关闭，黑底。
 */
export default function MobImageViewer({ images, index, onClose, onIndexChange }: MobImageViewerProps) {
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const drag = useRef({ sx: 0, sy: 0, ox: 0, oy: 0, active: false, moved: false })

  useEffect(() => {
    setScale(1)
    setPos({ x: 0, y: 0 })
  }, [index, images])

  const prev = useCallback(() => onIndexChange?.(Math.max(0, index - 1)), [onIndexChange, index])
  const next = useCallback(() => onIndexChange?.(Math.min(images.length - 1, index + 1)), [onIndexChange, index, images.length])

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, active: true, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.sx
    const dy = e.clientY - drag.current.sy
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true
    if (scale > 1) {
      setPos({ x: drag.current.ox + dx, y: drag.current.oy + dy })
    }
  }
  const onPointerUp = () => {
    if (!drag.current.active) return
    drag.current.active = false
    if (!drag.current.moved) {
      // 单击切换缩放
      if (scale === 1) {
        setScale(ZOOM)
      } else {
        setScale(1)
        setPos({ x: 0, y: 0 })
      }
    }
  }

  const current = images[index]
  if (!current) return null

  return (
    <div className="mob-viewer" role="dialog" aria-modal="true" aria-label={current.label || "图片查看"}>
      <div
        style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="mob-viewer__img"
          src={current.url}
          alt={current.label || "图片"}
          draggable={false}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transition: drag.current.active ? "none" : "transform 180ms ease-out",
          }}
        />
      </div>

      <div className="mob-viewer__count">
        {index + 1} / {images.length}
      </div>

      <button type="button" className="mob-viewer__close" onClick={onClose} aria-label="关闭">
        <X size={22} />
      </button>

      <button type="button" className="mob-viewer__close-label" onClick={onClose}>
        <X size={16} /> 关闭
      </button>

      {images.length > 1 ? (
        <>
          <button type="button" className="mob-viewer__nav mob-viewer__nav--prev" onClick={prev} aria-label="上一张">
            <ChevronLeft size={24} />
          </button>
          <button type="button" className="mob-viewer__nav mob-viewer__nav--next" onClick={next} aria-label="下一张">
            <ChevronRight size={24} />
          </button>
        </>
      ) : null}
    </div>
  )
}
