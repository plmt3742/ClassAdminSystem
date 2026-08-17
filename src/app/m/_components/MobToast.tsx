"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"
import { CheckCircle2, XCircle } from "lucide-react"

type ToastTone = "success" | "error"

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

interface ToastContextValue {
  /** 弹出提示（默认成功） */
  toast: (message: string, tone?: ToastTone) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/** 顶部居中堆叠的轻提示容器 + useToast() hook。自动 2.2s 消失。 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = ++idRef.current
      setToasts(prev => [...prev, { id, message, tone }])
      window.setTimeout(() => dismiss(id), 2200)
    },
    [dismiss],
  )

  const value: ToastContextValue = {
    toast,
    success: useCallback((m: string) => toast(m, "success"), [toast]),
    error: useCallback((m: string) => toast(m, "error"), [toast]),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="mob-toast-wrap" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`mob-toast mob-toast--${t.tone}`}>
            {t.tone === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** 获取 toast 方法。需在 ToastProvider 内使用。 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast 必须在 ToastProvider 内使用")
  return ctx
}
