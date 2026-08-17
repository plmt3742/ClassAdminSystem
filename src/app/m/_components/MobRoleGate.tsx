"use client"

import { useSession } from "next-auth/react"

interface MobRoleGateProps {
  /** 允许的角色名（admin / class_leader / student） */
  allowedRoles?: string[]
  /** 允许的班委标签（中文，如 班长 / 学习委员） */
  allowedTags?: string[]
  /** 无权限时渲染（默认 null） */
  fallback?: React.ReactNode
  children: React.ReactNode
}

/** 权限包装：session 角色或班委标签命中时渲染 children，否则渲染 fallback。 */
export default function MobRoleGate({ allowedRoles, allowedTags, fallback = null, children }: MobRoleGateProps) {
  const { data: session } = useSession()
  const user = session?.user

  if (!user) return <>{fallback}</>

  if (allowedRoles?.length && user.role && allowedRoles.includes(user.role)) {
    return <>{children}</>
  }
  if (allowedTags?.length && user.tags?.length && user.tags.some(t => allowedTags.includes(t))) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
