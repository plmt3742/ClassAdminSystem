"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { BookOpen, ChevronRight, ClipboardCheck, LayoutGrid, Pencil, Trophy, Users } from "lucide-react"

const COMMITTEE_TAGS = ["班长","副班长","团支书","副团支书","心理委员","学习委员","生活委员","文体委员","志愿队长","组织委员","宣传委员"]

const roleLabel: Record<string, string> = { admin: "管理员", class_leader: "班干部", student: "同学", guest: "游客" }

interface Announcement {
  id: string; title: string; pinned: boolean; authorName: string; createdAt: string
}

interface OnlineHistoryPoint { hour: string; count: number }
interface ZongceSection { section: string; status: string }
interface PendingReview { id: string; section: string }
interface Activity { id: string; title: string; eventTime?: string | null; volunteers?: unknown[] }

/** Format an ISO timestamp as MM-DD (timeline meta). */
const mmdd = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/* 中心扩散流动线：短线从中心圆外缘向外移动，移动中逐渐变小变淡（浅浅流动感）。
   每条臂 4 条线错峰出发，形成持续向外行走的节奏。 */
const HC_FLOW_DURATION = 3            // 单条线全程时长（秒）
const HC_FLOW_COUNT = 4               // 每条臂同时流动的线数
const HC_FLOW_DELAYS = Array.from({ length: HC_FLOW_COUNT }).map((_, i) => ((i * HC_FLOW_DURATION) / HC_FLOW_COUNT).toFixed(2))

export default function HomePage() {
  const { data: session, status } = useSession()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [userProfile, setUserProfile] = useState<Record<string, unknown>>({})
  const [onlineCount, setOnlineCount] = useState(0)
  const [onlineHistory, setOnlineHistory] = useState<OnlineHistoryPoint[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [sections, setSections] = useState<ZongceSection[]>([])
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [members, setMembers] = useState<unknown[]>([])

  useEffect(() => {
    if (!session) return
    fetch("/api/announcements").then(r => r.json()).then(d => setAnnouncements(d.announcements || [])).catch(() => {})
    fetch("/api/me").then(r => r.json()).then(d => setUserProfile(d.user || {})).catch(() => {})
    fetch("/api/zongce/dashboard").then(r => r.json()).then(d => {
      setSections(d.sections || [])
      setPendingReviews(d.pendingReviews || [])
    }).catch(() => {})
    fetch("/api/activities").then(r => r.json()).then(d => setActivities(d.activities || [])).catch(() => {})
    fetch("/api/members").then(r => r.json()).then(d => setMembers(d.members || [])).catch(() => {})
  }, [session])

  // Heartbeat + chart
  useEffect(() => {
    if (!session) return
    const beat = () => {
      fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: session.user?.id, userName: session.user?.name }) }).catch(() => {})
      fetch("/api/heartbeat").then(r => r.json()).then(d => {
        setOnlineCount(d.online || 0)
        setOnlineHistory(d.history || [])
        setOnlineUsers((d.users || []).map((u: { userName: string }) => u.userName))
      }).catch(() => {})
    }
    beat()
    const t = setInterval(beat, 60000)
    return () => clearInterval(t)
  }, [session])

  if (status === "loading") return <p className="empty-state">加载中...</p>
  if (!session) return null

  const user = session.user

  // Check if user is a committee member (班委)
  const isCommittee = user.role === "admin" || COMMITTEE_TAGS.some(t => (user.tags || []).includes(t))
  const isGuest = user.role === "guest"

  /* ---------- 综测 (Zongce) ---------- */
  // 自填板块通过进度：S/A/D/E/F 为学生本人填写，仅统计已通过（approved），草稿/待审核/退回不算
  const SELF_SECTIONS = ["S", "A", "D", "E", "F"]
  const filledSections = sections.filter(s => SELF_SECTIONS.includes(s.section) && s.status === "approved").length
  const unfilledList = sections.filter(s => s.status === "not_started").map(s => s.section)
  const draftList = sections.filter(s => s.status === "draft").map(s => s.section)

  /* 待审核：按板块统计（管理员可见全部，班委由 dashboard 过滤） */
  const reviewSectionHref: Record<string, string> = {
    S: "/zongce/review-s", A: "/zongce/review-a", B: "/zongce/b-manage",
    D: "/zongce/review-d", E: "/zongce/review-e", F: "/zongce/review-f",
  }
  const reviewBySection = ["S", "A", "B", "D", "E", "F"]
    .map(section => ({ section, count: pendingReviews.filter(r => r.section === section).length }))
    .filter(x => x.count > 0)

  /* ---------- 活动 / 成员 ---------- */
  const activityCount = activities.length
  const memberCount = members.length

  /* ---------- 公告 ---------- */
  // 时间线：显示全部公告（API 已按置顶+时间排序），置顶项带高亮，多时横向滚动
  const tlItems = announcements.slice(0, 8)

  /* ---------- 在线柱状图 (real data → bar chart, 方框更有趣) ---------- */
  // 24h 数据 → 24 根方框柱，越高代表在线越多；最后一根（当前）高亮
  const maxCount = Math.max(...onlineHistory.map(h => h.count), 1)
  const barCount = Math.max(onlineHistory.length, 1)
  const BAR_W = 430 / barCount
  const BAR_GAP = Math.min(3, BAR_W * 0.18)
  const barW = BAR_W - BAR_GAP
  const bars = onlineHistory.map((h, i) => {
    const hPx = Math.max(3, (h.count / maxCount) * 46)
    const isNow = i === onlineHistory.length - 1
    return {
      x: i * BAR_W + BAR_GAP / 2,
      y: 60 - hPx,
      h: hPx,
      isNow,
      // 越靠近当前越实，越久远越淡（有层次的方框感）
      opacity: isNow ? 1 : 0.28 + (i / Math.max(barCount - 1, 1)) * 0.55,
      count: h.count,
    }
  })

  const shownUsers = onlineUsers.slice(0, 5)
  const extraUsers = onlineUsers.length > 5 ? onlineUsers.length - 5 : 0

  /* ---------- TOP cards ---------- */
  const cards: { icon: typeof ClipboardCheck; name: string; sub: string; href: string }[] = [
    { icon: Users, name: "班级成员", sub: `${memberCount} 人`, href: "/members" },
    { icon: Trophy, name: "活动参与", sub: `${activityCount} 场`, href: "/activities" },
    { icon: ClipboardCheck, name: "综测工作", sub: `${filledSections}/5 已填`, href: "/zongce" },
  ]
  if (isCommittee) {
    cards.push({ icon: BookOpen, name: "公告撰写", sub: "班委", href: "/announcements/new" })
  }
  // 明暗渐变：以中心为最亮点，向两端对称渐暗（无论 3 张还是 4 张卡都成立）
  const centerIdx = (cards.length - 1) / 2
  const cardDim = cards.map((_, i) => {
    const dist = Math.abs(i - centerIdx) / Math.max(centerIdx, 1)
    return {
      opacity: 1 - dist * 0.38,
      scale: 1 - dist * 0.12,
    }
  })

  /* ---------- LEFT todo rows (仅综测：待填写 + 草稿待完善 + 待审核) ---------- */
  const todos: { dot: string; text: string; count: string; href: string }[] = []
  if (unfilledList.length > 0) {
    todos.push({ dot: "var(--red)", text: `综测 · 还有 ${unfilledList.length} 个板块未填写 (${unfilledList.join("/")})`, count: `${unfilledList.length}`, href: "/zongce" })
  }
  if (draftList.length > 0) {
    todos.push({ dot: "var(--amber)", text: `综测 · ${draftList.length} 个板块草稿待完善 (${draftList.join("/")})`, count: `${draftList.length}`, href: "/zongce" })
  }
  for (const r of reviewBySection) {
    todos.push({
      dot: "var(--amber)",
      text: `综测 · ${r.section} 板块 ${r.count} 条待审核`,
      count: `${r.count}`,
      href: reviewSectionHref[r.section],
    })
  }
  // Badge = 综测待办总量（未填写 + 草稿 + 待审核）
  const todoBadge = String(unfilledList.length + draftList.length + reviewBySection.reduce((s, r) => s + r.count, 0)).padStart(2, "0")

  return (
    <>
      {/* ================= 移动版（设计稿结构，≤640px 显示） ================= */}
      <div className="m-home">
        {/* 身份区：方块头像 + 衬线姓名 + mono 学号 + 角色胶囊（点击进入个人页） */}
        <div className="m-pad" style={{ paddingTop: 20 }}>
          <Link href={isGuest ? "/" : "/profile"} className="m-identity" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 12 }}>
            <div className="m-avatar">{user?.name?.[0] || "?"}</div>
            <div className="m-id-meta">
              <div className="m-id-name">{user?.name}<span className="live-dot" /></div>
              <div className="m-id-sid">{isGuest ? "演示账号" : ((user as any)?.studentId || "—")}</div>
              <span className="m-id-role">{roleLabel[(user?.role as string) || "student"]}</span>
            </div>
            {!isGuest && (
              <span className="m-id-edit" aria-label="编辑资料">
                <Pencil size={15} />
              </span>
            )}
          </Link>
        </div>

        {/* 模块入口：m-gate 大卡（设计稿：单个"模块"入口 → 模块选择页） */}
        <div className="m-pad m-section-gap">
          <Link href="/modules" className="m-gate">
            <span className="tile"><LayoutGrid size={22} /></span>
            <span className="body">
              <span className="name">模块</span>
              <span className="sub">选择要进入的功能模块</span>
            </span>
            <span className="chev"><ChevronRight size={18} /></span>
          </Link>
        </div>

        {/* 在线：人数 + 柱状图 + 名单 */}
        <div className="m-pad m-section-gap">
          <div className="m-online">
            <div className="m-online-head">
              <span className="m-eyebrow">在线 · Online</span>
              <span className="m-live-num">{onlineCount}<small>人在线</small></span>
            </div>
            <div className="m-wave">
              <svg viewBox="0 0 430 44" preserveAspectRatio="none" aria-hidden="true">
                {bars.map(b => (
                  <rect key={b.x} x={b.x} y={b.y} width={barW} height={b.h} rx="2" fill="#3B6B8A" opacity={b.opacity} />
                ))}
              </svg>
              <div className="m-wave-ticks"><span>-24h</span><span>-12h</span><span>-6h</span><span>现在</span></div>
            </div>
            <div className="m-names">
              {shownUsers.map((name, i) => (
                <span key={i} className="m-namechip"><span className="ndot" /><span className="nm">{name}</span></span>
              ))}
              {extraUsers > 0 && <span className="m-morechip">+{extraUsers}</span>}
            </div>
          </div>
        </div>

        {/* 公告：面板 + 头条卡 + 次级行 */}
        {tlItems.length > 0 && (
          <div className="m-pad m-section-gap">
            <div className="m-panel">
              <div className="m-panel-head">
                <span className="m-eyebrow">公告 · Announcements</span>
              </div>
              <Link className="m-feature" href={`/announcements/${tlItems[0].id}`}>
                <span className="kicker">
                  {tlItems[0].pinned && <span className="pin">置顶</span>}
                  {tlItems[0].authorName} · {mmdd(tlItems[0].createdAt)}
                </span>
                <span className="title">{tlItems[0].title}</span>
              </Link>
              {tlItems.slice(1, 4).map(a => (
                <Link key={a.id} className="m-mini" href={`/announcements/${a.id}`}>
                  <span className="date">{mmdd(a.createdAt)}</span>
                  <span className="title">{a.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 待办：面板 + 任务行 */}
        {todos.length > 0 && (
          <div className="m-pad m-section-gap">
            <div className="m-panel">
              <div className="m-panel-head">
                <span className="m-eyebrow">待办 · Todo</span>
                <span className="more">{todoBadge} 项</span>
              </div>
              {todos.map(t => (
                <Link key={t.text} href={t.href} className="m-task">
                  <span className={`tic ${t.dot === "var(--red)" ? "red" : "amber"}`}>
                    {t.dot === "var(--red)"
                      ? <ClipboardCheck size={16} />
                      : <Trophy size={16} />}
                  </span>
                  <span className="txt">{t.text}</span>
                  <span className={`num${t.dot === "var(--red)" ? " warn" : ""}`}>{t.count}</span>
                  <span className="chev"><ChevronRight size={12} /></span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
          工业软件二班 · 数据每日 23:00 同步
        </div>
      </div>

      {/* ================= 十字星芒 STAGE（桌面端） ================= */}
      <div className="hc-stage">

        {/* decorative geometry */}
        <div className="hc-deco" aria-hidden="true">
          <div className="hc-baseline" />
          <div className="hc-cross-h" />
          <div className="hc-cross-v" />
          <div className="hc-ring r1" />
          <div className="hc-ring r2" />
          <div className="hc-ring r3" />
          {/* 中心扩散流动线：四条臂上短线持续向外移动，越远越小越淡 */}
          {HC_FLOW_DELAYS.map((d, i) => (
            <span key={`fl${i}`} className="hc-flow hc-flow-l" style={{ "--delay": `${d}s` } as CSSProperties} />
          ))}
          {HC_FLOW_DELAYS.map((d, i) => (
            <span key={`fr${i}`} className="hc-flow hc-flow-r" style={{ "--delay": `${d}s` } as CSSProperties} />
          ))}
          {HC_FLOW_DELAYS.map((d, i) => (
            <span key={`fu${i}`} className="hc-flow hc-flow-u" style={{ "--delay": `${d}s` } as CSSProperties} />
          ))}
          {HC_FLOW_DELAYS.map((d, i) => (
            <span key={`fd${i}`} className="hc-flow hc-flow-d" style={{ "--delay": `${d}s` } as CSSProperties} />
          ))}
        </div>

        {/* ============ CENTER · L8 读数面板排版 ============ */}
        <div className="hc-center">
          <Link href={isGuest ? "/" : "/profile"} className="hc-m-head" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 12 }}>
            <div className="hc-m-avatar">{user?.name?.[0] || "?"}</div>
            <div className="hc-m-name">{user?.name}<span className="hc-m-dot" /></div>
          </Link>
          <div className="hc-m-rows">
            <div className="hc-m-row"><span className="k">角色</span><span className="v role">{roleLabel[(user?.role as string) || "student"]}</span></div>
            <div className="hc-m-row"><span className="k">学号</span><span className="v">{isGuest ? "演示账号" : ((user as any)?.studentId || "—")}</span></div>
            <div className="hc-m-row"><span className="k">状态</span><span className="v" style={{ color: onlineCount > 0 ? "#3E8E63" : "#A8B4BD" }}>{onlineCount > 0 ? "在线" : "离线"}</span></div>
          </div>
          {!isGuest && (
            <Link href="/profile" className="hc-m-edit">
              <Pencil size={9} className="hc-ic" />
              编辑资料
            </Link>
          )}
        </div>

        {/* ============ TOP · 功能 ============ */}
        <div className="hc-arm hc-arm-top">
          <div className="hc-mlabel">模块 · MODULES</div>
          <div className="hc-cards">
            {cards.map((c, i) => {
              // 综测未完成（未填写或草稿）→ 抖动提醒
              const needsZongce = c.name === "综测工作" && (unfilledList.length > 0 || draftList.length > 0)
              return (
                <Link key={c.name} href={c.href} className={`hc-card${needsZongce ? " hc-card-attn" : ""}`} style={{ opacity: cardDim[i].opacity, transform: `scale(${cardDim[i].scale})` }}>
                  <span className="hc-ctile"><c.icon size={19} /></span>
                  <span className="hc-cname">{c.name}</span>
                  <span className="hc-csub">{c.sub}</span>
                  {needsZongce && <span className="hc-card-dot" />}
                </Link>
              )
            })}
          </div>
        </div>

        {/* ============ BOTTOM · 公告（杂志式列表） ============ */}
        {tlItems.length > 0 && (
          <div className="hc-arm hc-arm-bottom">
            <div className="hc-mlabel">公告 · ANNOUNCEMENTS<span className="hc-tl-total">{tlItems.length} 条</span></div>
            <div className="hc-tl">
              <div className="hc-tl-items">
                {tlItems.map(a => (
                  <Link key={a.id} href={`/announcements/${a.id}`} className={`hc-tl-item${a.pinned ? " hc-tl-pinned" : ""}`}>
                    <span className="hc-tl-date">{mmdd(a.createdAt)}</span>
                    <span className="hc-tl-title">{a.title}</span>
                    {a.pinned && <span className="hc-pin">置顶</span>}
                    <span className="hc-tl-author">{a.authorName}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============ LEFT · 待办 ============ */}
        {todos.length > 0 && (
          <div className="hc-arm hc-arm-left">
            <div className="hc-todo-mod">
              <div className="hc-todo-head">
                <div className="hc-mlabel">待办 · TODO</div>
                <span className="hc-todo-count">{todoBadge}</span>
              </div>
              <div className="hc-todos">
                {todos.map(t => (
                  <Link key={t.text} href={t.href} className="hc-todo">
                    <span className="hc-tdot" style={{ background: t.dot }} />
                    <span className="hc-t-txt">{t.text}</span>
                    <span className="hc-t-count">{t.count}</span>
                    <ChevronRight size={11} className="hc-ic hc-chev" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============ RIGHT · 在线 + 波浪 ============ */}
        <div className="hc-arm hc-arm-right">
          <div className="hc-mod">
            <div className="hc-online-head">
              <div className="hc-mlabel">在线 · ONLINE</div>
              <span className="hc-live-num">{onlineCount}<small>人在线</small></span>
            </div>
            <div className="hc-wave-wrap">
              <div className="hc-wave-view">
                <svg className="hc-wave-svg" viewBox="0 0 430 60" preserveAspectRatio="none" aria-hidden="true">
                  {bars.map((b, i) => (
                    <rect
                      key={i}
                      x={b.x}
                      y={b.y}
                      width={barW}
                      height={b.h}
                      rx="2"
                      fill={b.isNow ? "#3B6B8A" : "#3B6B8A"}
                      opacity={b.opacity}
                    />
                  ))}
                </svg>
              </div>
              <span className="hc-wave-now">现在 · {onlineCount} 人</span>
              <div className="hc-wave-ticks">
                <span>-24h</span><span>-12h</span><span>-6h</span><span>现在</span>
              </div>
            </div>
            <div className="hc-names">
              {shownUsers.map((name, i) => (
                <span key={i} className="hc-namechip"><span className="hc-ndot" /><span className="hc-nm">{name}</span></span>
              ))}
              {extraUsers > 0 && <span className="hc-morechip">+{extraUsers}</span>}
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
