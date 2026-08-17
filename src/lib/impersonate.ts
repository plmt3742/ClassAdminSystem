import { encode } from "next-auth/jwt"
import { prisma } from "./prisma"

const MAX_AGE = 30 * 24 * 60 * 60 // 与 NextAuth 默认会话时长一致（30 天）

/**
 * 为用户签发一份可被 NextAuth 正常解密的新会话 JWT。
 * salt 必须等于 session cookie 名（NextAuth 以 cookie 名派生加密密钥）。
 */
export async function buildSessionTokenForUser(
  userId: string,
  salt: string,
  extra?: Record<string, unknown>,
): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null
  const secret = process.env.AUTH_SECRET
  if (!secret) return null
  try {
    return await encode({
      secret,
      salt,
      maxAge: MAX_AGE,
      token: {
        sub: user.id,
        id: user.id,
        name: user.name,
        email: user.email ?? null,
        picture: user.image ?? null,
        uid: user.uid ?? null,
        studentId: user.studentId,
        role: user.role,
        tags: user.tags ? (typeof user.tags === "string" ? JSON.parse(user.tags) : user.tags) : null,
        ...extra,
      },
    })
  } catch (e: unknown) {
    console.error("[impersonate] encode failed:", e instanceof Error ? e.message : e)
    return null
  }
}
