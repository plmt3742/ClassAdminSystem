import type { Metadata, Viewport } from "next"
import SessionProvider from "@/components/SessionProvider"
import Navbar from "@/components/Navbar"
import MobileTabBar from "@/components/MobileTabBar"
import PathShell from "@/components/PathShell"
import MobileRedirect from "@/components/MobileRedirect"
import "./globals.css"

export const metadata: Metadata = {
  title: "班务管理",
  description: "班级事务 · 一体化管理平台",
  appleWebApp: { capable: true, title: "班务管理", statusBarStyle: "default" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <SessionProvider>
          <MobileRedirect />
          <PathShell>
            <Navbar />
            <MobileTabBar />
          </PathShell>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
