"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, ChevronRight, BookOpen, Award } from "lucide-react"

const YEARS = [
  { id: "2025-2026", label: "2025-2026 学年", active: true, desc: "当前学年 · 大一课程" },
  { id: "2026-2027", label: "2026-2027 学年", active: false, desc: "即将开放" },
  { id: "2027-2028", label: "2027-2028 学年", active: false, desc: "即将开放" },
  { id: "2028-2029", label: "2028-2029 学年", active: false, desc: "即将开放" },
]

export default function SelectYearPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    // Auto-init courses on first visit
    fetch("/api/zongce/init", { method: "POST" }).finally(() => setInitializing(false))
  }, [])

  if (!session) return null

  if (initializing) return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
      <div className="card" style={{ padding: "60px 40px" }}>
        <BookOpen size={32} style={{ color: "#A8B4BD", marginBottom: 16 }} />
        <p style={{ color: "#7A8A94" }}>初始化课程数据...</p>
      </div>
    </main>
  )

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 80px" }}>
      <button className="btn-ghost" onClick={() => router.push("/")} style={{ marginBottom: 28 }}>
        <ArrowLeft size={14} /> 返回首页
      </button>

      <div style={{ marginBottom: 8 }}>
        <div className="eyebrow">综合素质测评</div>
        <h1 className="display" style={{ display: "block" }}>选择学年</h1>
      </div>
      <p style={{ color: "#7A8A94", fontSize: ".85rem", marginBottom: 28 }}>
        请选择要查看或填写的综测学年。不同学年的数据相互独立。
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {YEARS.map(y => {
          const cardContent = (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "var(--radius)",
                  background: y.active ? "var(--color-accent-subtle)" : "var(--color-bg-alt)",
                  color: y.active ? "var(--color-accent)" : "var(--color-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {y.active ? <Award size={20} /> : <BookOpen size={20} />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: ".95rem" }}>{y.label}</div>
                  <div style={{ fontSize: ".72rem", color: y.active ? "var(--color-muted)" : "var(--color-muted-light)", marginTop: 2 }}>
                    {y.desc}
                  </div>
                </div>
              </div>
              {y.active && (
                <span style={{
                  fontSize: ".62rem", fontWeight: 600, padding: "3px 10px",
                  borderRadius: 99, background: "var(--color-accent-subtle)",
                  color: "var(--color-accent)",
                }}>
                  进入 <ChevronRight size={10} style={{ verticalAlign: -1 }} />
                </span>
              )}
              {!y.active && (
                <span className="tag" style={{ fontSize: ".62rem" }}>未开放</span>
              )}
            </>
          )
          const cardStyle: React.CSSProperties = {
            textDecoration: "none", color: "inherit", padding: "22px 24px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            opacity: y.active ? 1 : 0.45, cursor: y.active ? "pointer" : "not-allowed",
            borderTopColor: y.active ? "var(--color-accent)" : "var(--color-border)",
            background: "#fff",
          }
          return y.active ? (
            <Link key={y.id} href={`/zongce?year=${y.id}`} className="card" style={cardStyle}>
              {cardContent}
            </Link>
          ) : (
            <div key={y.id} className="card" style={cardStyle}>
              {cardContent}
            </div>
          )
        })}
      </div>
    </main>
  )
}
