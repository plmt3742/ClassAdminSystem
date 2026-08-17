import { encode } from "next-auth/jwt"

const MAX_AGE = 30 * 24 * 60 * 60 // 与 NextAuth 默认会话时长一致（30 天）

/** 游客固定标识（不在数据库中，jwt callback 的 DB 刷新会查不到并保留原值） */
export const GUEST_ID = "guest"
export const GUEST_NAME = "游客"

/**
 * 签发一份游客模式 JWT（role = "guest"），不走数据库。
 * salt 必须等于 session cookie 名（NextAuth 以 cookie 名派生加密密钥）。
 */
export async function buildGuestToken(salt: string): Promise<string | null> {
  const secret = process.env.AUTH_SECRET
  if (!secret) return null
  try {
    return await encode({
      secret,
      salt,
      maxAge: MAX_AGE,
      token: {
        sub: GUEST_ID,
        id: GUEST_ID,
        name: GUEST_NAME,
        email: null,
        picture: null,
        uid: null,
        studentId: "GUEST",
        role: "guest",
        tags: [],
      },
    })
  } catch (e: unknown) {
    console.error("[guest] encode failed:", e instanceof Error ? e.message : e)
    return null
  }
}
