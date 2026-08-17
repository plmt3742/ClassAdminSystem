"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

/**
 * 移动端 UA 检测跳转：手机/平板访问旧版页面时自动进入新版移动端 /m。
 * 仅在客户端生效；/m 与 /welcome 路径不跳转。
 */
export default function MobileRedirect() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (pathname.startsWith("/m") || pathname.startsWith("/welcome")) return
    const ua = navigator.userAgent
    const isMobile =
      /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|Opera Mini|IEMobile|Windows Phone/i.test(ua)
    if (isMobile) router.replace("/m")
  }, [pathname, router])

  return null
}
