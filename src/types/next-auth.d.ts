import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    uid?: string | null
    studentId?: string | null
    role?: string | null
    bio?: string | null
    phone?: string | null
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      uid?: string | null
      studentId?: string | null
      role?: string | null
      tags?: string[] | null
      impersonator?: { id: string; name?: string | null } | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    uid?: string | null
    studentId?: string | null
    role?: string | null
    tags?: string[] | null
    impersonator?: { id: string; name?: string | null } | null
  }
}
