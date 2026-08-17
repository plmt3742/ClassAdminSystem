import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { compare } from "bcryptjs"
import { prisma } from "./prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/welcome",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        studentId: { label: "学号", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.studentId || !credentials?.password) return null
        const studentId = credentials.studentId as string
        const password = credentials.password as string

        try {
          const user = await prisma.user.findUnique({ where: { studentId } })
          if (user && user.password) {
            const isValid = await compare(password, user.password)
            if (isValid) {
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                uid: user.uid,
                studentId: user.studentId,
                role: user.role,
              }
            }
          }
        } catch (e: unknown) {
          console.error("[auth] DB lookup failed:", e instanceof Error ? e.message : e)
        }
        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.uid = user.uid ?? null
        token.studentId = (user as Record<string, unknown>).studentId as string ?? null
        token.role = (user as Record<string, unknown>).role as string ?? "student"
      }
      if (token.id && trigger !== "signIn" && trigger !== "signUp") {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { name: true, email: true, image: true, uid: true, studentId: true, role: true, tags: true, bio: true, phone: true },
          })
          if (fresh) {
            token.name = fresh.name
            token.email = fresh.email
            token.picture = fresh.image
            token.uid = fresh.uid
            token.studentId = fresh.studentId
            token.role = fresh.role
            token.tags = fresh.tags ? (typeof fresh.tags === "string" ? JSON.parse(fresh.tags) : fresh.tags) : null
          }
        } catch (e: unknown) {
          console.error("[auth] JWT refresh failed:", e instanceof Error ? e.message : e)
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.image = token.picture as string | null
        session.user.uid = token.uid ?? null
        session.user.studentId = token.studentId ?? null
        session.user.role = token.role ?? "student"
        session.user.tags = token.tags ?? null
        session.user.impersonator = (token.impersonator as { id: string; name?: string | null } | null) ?? null
      }
      return session
    },
  },
})
