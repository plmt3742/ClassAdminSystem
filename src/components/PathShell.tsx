"use client"

import { usePathname } from "next/navigation"

/**
 * 路径外壳：当 pathname 以 /m 开头时隐藏桌面 Navbar 与旧移动 TabBar，
 * 其余路由保持原样渲染。
 */
export default function PathShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMobile = pathname.startsWith("/m")

  return <div style={isMobile ? { display: "none" } : undefined}>{children}</div>
}
