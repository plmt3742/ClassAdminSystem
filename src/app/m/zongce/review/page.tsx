"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ClipboardList, ChevronRight } from "lucide-react"
import MobTopBar from "@/app/m/_components/MobTopBar"
import MobEmpty from "@/app/m/_components/MobEmpty"
import MobLoading from "@/app/m/_components/MobLoading"
import MobChip from "@/app/m/_components/MobChip"
import { SECTION_META } from "@/lib/zongce-utils"

type Tone = "ok" | "warn" | "danger" | "info" | "neutral" | "s" | "m" | "t"

interface SectionDef {
  key: string
  letter: string
  label: string
  title: string
  reviewer: string
  endpoint: string
  tone: Tone
}

const TONE_BY_LETTER: Record<string, Tone> = {
  S: "s",
  A: "info",
  D: "m",
  E: "t",
  F: "warn",
}

/** 审核板块（B/C 由团支书/生活委员另行管理，不在审核入口内） */
const SECTIONS: SectionDef[] = ["s", "a", "d", "e", "f"].map(key => {
  const letter = key.toUpperCase()
  const meta = SECTION_META[letter]
  return {
    key,
    letter,
    label: meta ? meta.label : letter,
    title: `${letter} ${meta ? meta.label : ""}`.trim(),
    reviewer: meta ? meta.reviewer : "",
    endpoint: `/api/zongce/review-${key}`,
    tone: TONE_BY_LETTER[letter] ?? "neutral",
  }
})

export default function ReviewHubPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === "admin"
  const tags = session?.user?.tags ?? []
  const tagKey = tags.join("\u0000")

  const accessible = useMemo(
    () => (session ? SECTIONS.filter(s => isAdmin || tags.includes(s.reviewer)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, isAdmin, tagKey],
  )
  const canManageB = isAdmin || tags.includes("团支书")

  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (status !== "authenticated") return
    const targets = SECTIONS.filter(s => isAdmin || tags.includes(s.reviewer))
    if (targets.length === 0) {
      setLoaded(true)
      return
    }
    let cancelled = false
    Promise.allSettled(
      targets.map(s => fetch(s.endpoint).then(r => (r.ok ? r.json() : { cards: [] }))),
    )
      .then(results => {
        if (cancelled) return
        const next: Record<string, number> = {}
        results.forEach((res, i) => {
          if (res.status === "fulfilled") {
            const cards = (res.value?.cards || []) as Array<{ status?: string }>
            next[targets[i].key] = cards.filter(c => c.status === "submitted").length
          }
        })
        setCounts(next)
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [status, isAdmin, tagKey])

  const hasAny = accessible.length > 0 || canManageB

  return (
    <div className="mob-page" style={{ paddingBottom: 24 }}>
      <MobTopBar title="综测审核" icon={<ClipboardList size={17} />} back onBack={() => router.push("/m/zongce")} />

      {status === "loading" ? (
        <MobLoading rows={6} />
      ) : !hasAny ? (
        <MobEmpty
          icon={<ClipboardList size={28} />}
          title="你不是任何板块的审核人"
          desc="仅班长、学习委员、文体委员、组织委员、团支书或管理员可进入审核"
        />
      ) : (
        <>
          <p style={{ fontSize: 12, color: "var(--fg-3)", letterSpacing: "0.04em" }}>
            选择要审核的板块 · 通过后分数即时生效
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {accessible.map(s => {
              const pending = loaded ? counts[s.key] ?? 0 : null
              return (
                <Link
                  key={s.key}
                  href={`/m/zongce/review/${s.key}`}
                  className="mob-card mob-card--pad"
                  style={{ display: "flex", flexDirection: "column", gap: 10, color: "var(--fg)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <MobChip tone={s.tone}>{s.letter}</MobChip>
                    <ChevronRight size={16} style={{ color: "var(--fg-3)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{s.reviewer}审核</div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: pending != null && pending > 0 ? "var(--warn)" : "var(--fg-3)",
                    }}
                  >
                    {pending == null ? "…" : pending > 0 ? `${pending} 待审核` : "暂无待审核"}
                  </div>
                </Link>
              )
            })}

            {canManageB && (
              <Link
                href="/m/zongce/b-manage"
                className="mob-card mob-card--pad"
                style={{ display: "flex", flexDirection: "column", gap: 10, color: "var(--fg)" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <MobChip tone="neutral">B</MobChip>
                  <ChevronRight size={16} style={{ color: "var(--fg-3)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>B 集会政治学习</div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>团支书管理</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-3)" }}>管理入口</div>
              </Link>
            )}
          </div>

          <p style={{ textAlign: "center", fontSize: 11, color: "var(--fg-3)", paddingTop: 8 }}>
            各板块待审核提交在此汇总 · 退回项由学生修改后重新提交
          </p>
        </>
      )}
    </div>
  )
}
