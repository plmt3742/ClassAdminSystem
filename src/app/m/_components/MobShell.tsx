"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import MobTabBar from "./MobTabBar"
import { ToastProvider } from "./MobToast"

/**
 * 移动端应用外壳：挂 .mob 根类（令牌作用域）、ToastProvider、
 * 会话守卫（loading 时骨架屏 / 未登录跳 /welcome）与底部 TabBar。
 */
export default function MobShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/welcome")
    }
  }, [status, router])

  return (
    <div className="mob">
      <ToastProvider>
        {status === "loading" ? (
          <div className="mob-splash" aria-busy="true">
            <div className="mob-loading__block" style={{ height: 56 }} />
            <div className="mob-loading__block" style={{ height: 20, width: "60%" }} />
            <div className="mob-loading__block" style={{ height: 120 }} />
            <div className="mob-loading__block" style={{ height: 80 }} />
          </div>
        ) : (
          <div className="mob-shell">
            <div className="mob-shell-content">{children}</div>
            <MobTabBar />
          </div>
        )}
      </ToastProvider>
    </div>
  )
}
