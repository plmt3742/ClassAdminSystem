import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// 游客模式可访问的只读展示页面（其余一律重定向回首页）
const GUEST_ALLOWED_PREFIXES = [
  "/welcome",
  "/zongce/rules",
  "/zongce/ranking",
  "/zongce/report",
  "/members",
  "/activities",
  "/announcements",
  "/modules",
  "/m/zongce/rules",
  "/m/zongce/ranking",
  "/m/zongce/report",
  "/m/activities",
  "/m/announcements",
  "/m/members",
]
const GUEST_ALLOWED_EXACT = ["/", "/zongce", "/m", "/m/zongce"]

function isGuestAllowed(pathname: string): boolean {
  if (GUEST_ALLOWED_EXACT.includes(pathname)) return true
  return GUEST_ALLOWED_PREFIXES.some(p => pathname.startsWith(p))
}

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (
    pathname === "/welcome" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads") ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next()
  }

  // Redirect unauthenticated users to welcome
  if (!req.auth) {
    const url = new URL("/welcome", req.url)
    return NextResponse.redirect(url)
  }

  // 游客模式：仅允许只读展示页（管理/审核/填写页面一律打回首页）
  if (req.auth.user?.role === "guest" && !isGuestAllowed(pathname)) {
    const url = new URL("/", req.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
