import type { Metadata, Viewport } from "next"
import MobShell from "./_components/MobShell"
import "./mobile.css"

export const metadata: Metadata = {
  title: "班务管理",
  description: "班级事务 · 一体化管理平台（移动端）",
  appleWebApp: { capable: true, title: "班务管理", statusBarStyle: "default" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

/** 移动端布局：仅引入 mobile.css 与 MobShell（不含桌面 Navbar/TabBar）。 */
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <MobShell>{children}</MobShell>
}
