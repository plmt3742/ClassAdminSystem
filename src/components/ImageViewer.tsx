"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"

export interface ViewerImage {
  url: string
  label?: string
}

interface Props {
  images: ViewerImage[]
  index: number
  onClose: () => void
  onIndexChange?: (i: number) => void
}

const btnStyle: CSSProperties = {
  width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
  border: "1px solid #E0E5EC", background: "#fff", color: "#4A5463", cursor: "pointer", flex: "none",
}
const navStyle: CSSProperties = {
  position: "absolute", top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%",
  border: "1px solid #E0E5EC", background: "rgba(255,255,255,.92)", color: "#3B6B8A",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 2,
}

/**
 * 图片查看器（右侧抽屉）：点击缩略图浮现于右侧，支持滚轮缩放、拖拽移动、双击复位、多图切换
 */
export default function ImageViewer({ images, index, onClose, onIndexChange }: Props) {
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; active: boolean }>({ sx: 0, sy: 0, ox: 0, oy: 0, active: false })

  // 切换图片时复位
  useEffect(() => { setScale(1); setPos({ x: 0, y: 0 }) }, [index, images])

  // 键盘：ESC 关闭 / 左右切换
  // 焦点在输入框/文本域时方向键只移动光标，不切换图片（避免按键冲突）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const inField =
        !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)
      if (e.key === "Escape") onClose()
      if (inField) return
      if (e.key === "ArrowLeft" && onIndexChange) onIndexChange(Math.max(0, index - 1))
      if (e.key === "ArrowRight" && onIndexChange) onIndexChange(Math.min(images.length - 1, index + 1))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, onIndexChange, index, images.length])

  const zoom = (dir: 1 | -1) => setScale(s => Math.min(6, Math.max(0.4, +(s * (dir > 0 ? 1.25 : 0.8)).toFixed(2))))
  const reset = () => { setScale(1); setPos({ x: 0, y: 0 }) }

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, active: true }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return
    setPos({
      x: dragRef.current.ox + (e.clientX - dragRef.current.sx),
      y: dragRef.current.oy + (e.clientY - dragRef.current.sy),
    })
  }
  const onPointerUp = () => { dragRef.current.active = false }

  const current = images[index]
  if (!current) return null

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000 }}
      onWheel={e => { e.preventDefault(); zoom(e.deltaY < 0 ? 1 : -1) }}
    >
      <style>{`@keyframes ivSlide{from{transform:translateX(70px);opacity:.35}to{transform:none;opacity:1}}`}</style>
      {/* 遮罩 */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(20,25,30,.45)" }} onClick={onClose} />

      {/* 右侧抽屉 */}
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: "min(540px, calc(100vw - 72px))",
        background: "#fff", boxShadow: "-14px 0 36px rgba(0,0,0,.2)",
        display: "flex", flexDirection: "column",
        animation: "ivSlide .28s cubic-bezier(.16,1,.3,1)",
      }}>
        {/* 顶栏 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", borderBottom: "1px solid #EEF1F5" }}>
          <span style={{ fontSize: ".78rem", fontWeight: 600, color: "#1A1D22", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {current.label || "佐证图片"}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: ".7rem", color: "#8A93A0" }}>
            {index + 1}/{images.length}
          </span>
          <button onClick={() => zoom(-1)} title="缩小" style={btnStyle}><ZoomOut size={15} /></button>
          <button onClick={() => zoom(1)} title="放大" style={btnStyle}><ZoomIn size={15} /></button>
          <button onClick={reset} title="复位" style={btnStyle}><RotateCcw size={14} /></button>
          <button onClick={onClose} title="关闭" style={btnStyle}><X size={16} /></button>
        </div>

        {/* 图片区 */}
        <div
          style={{
            flex: 1, position: "relative", overflow: "hidden", background: "#F5F7FA",
            touchAction: "none", cursor: dragRef.current.active ? "grabbing" : "grab",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={reset}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.label || "图片"}
            draggable={false}
            style={{
              position: "absolute", left: "50%", top: "50%",
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`,
              maxWidth: "92%", maxHeight: "92%", objectFit: "contain",
              transition: dragRef.current.active ? "none" : "transform .18s ease-out",
              userSelect: "none", background: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,.12)",
              borderRadius: 4,
            }}
          />
          {/* 多图切换 */}
          {images.length > 1 && (
            <>
              <button onClick={() => onIndexChange?.(Math.max(0, index - 1))} style={{ ...navStyle, left: 10 }}><ChevronLeft size={20} /></button>
              <button onClick={() => onIndexChange?.(Math.min(images.length - 1, index + 1))} style={{ ...navStyle, right: 10 }}><ChevronRight size={20} /></button>
            </>
          )}
        </div>

        {/* 操作提示 */}
        <div style={{ padding: "8px 14px", borderTop: "1px solid #EEF1F5", fontSize: ".68rem", color: "#8A93A0", display: "flex", gap: 16, justifyContent: "center", fontFamily: "'JetBrains Mono',Consolas,monospace" }}>
          <span>滚轮缩放</span><span>拖拽移动</span><span>双击复位</span><span>ESC 关闭</span>
        </div>
      </div>
    </div>
  )
}
