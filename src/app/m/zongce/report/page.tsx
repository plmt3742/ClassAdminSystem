"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { BookOpen, ClipboardCheck, Users, Home, Music, Heart, Award } from "lucide-react"
import MobTopBar from "../../_components/MobTopBar"
import MobScoreRing from "../../_components/MobScoreRing"
import MobLoading from "../../_components/MobLoading"
import MobEmpty from "../../_components/MobEmpty"
import MobChip from "../../_components/MobChip"
import MobImageViewer, { type MobViewerImage } from "../../_components/MobImageViewer"
import { D_RANK_TABLE, POSITION_PRESETS } from "@/lib/zongce-utils"

// ---------- 数据形状（与 /api/zongce/ranking 一致） ----------
interface RankSectionScore { section: string; status: string; score: number }
interface RankCourseDetail { name: string; credits: number; semester: number; score: number | null; grade: string | null; gpa: number | null; repeat: boolean; failed: boolean }
interface RankRow {
  id: string; name: string; studentId: string; physicalTest?: boolean | null; gpa: number
  sScore: number; mScore: number; totalScore: number
  failedCount?: number; failedPolicyCount?: number
  sectionScores: RankSectionScore[]
  sectionDetails: Record<string, Record<string, unknown>>
  coursesDetail: RankCourseDetail[]
}

const D_TYPE_LABEL: Record<string, string> = {
  ceremony: "大型活动", team_unranked: "队伍参赛未获奖", performance: "文艺表演",
  rehearsal: "排练", sports: "阳光体育", sports_unranked: "运动会参与未获奖", award: "获奖项目",
}
const D_LEVEL_LABEL: Record<string, string> = { college: "院级", school: "校级", province: "省级", national: "国家级" }
const D_RANK_LABEL: Record<number, string> = { 1: "一等奖", 2: "二等奖", 3: "三等奖", 4: "第4-8名", 5: "其他" }
const F3_LEVEL_LABEL: Record<string, string> = { national: "国家级", province: "省级", city: "市级", school: "校级" }
const F4_TYPE_LABEL: Record<string, string> = { newspaper: "校报投稿", journal: "期刊论文", essay: "征文/课题", research: "课题调研", patent: "专利" }
const M_LABELS: Record<string, string> = { A: "学风考勤", B: "集会政治学习", C: "星级宿舍", D: "文体活动", E: "社会实践 / 公益", F: "奖惩附加" }

const asNum = (v: unknown): number => (typeof v === "number" ? v : 0)
const asBool = (v: unknown): boolean => v === true
const asStr = (v: unknown): string => (typeof v === "string" ? v : "")
const asArr = (v: unknown): Record<string, unknown>[] =>
  (Array.isArray(v) ? v.filter(x => x && typeof x === "object") : []) as Record<string, unknown>[]

// D 板块固定分项（与表单一致，实时计算不依赖存储值）
const D_TYPE_SCORES: Record<string, number> = {
  ceremony: 0.2, team_unranked: 0.3, performance: 0.3,
  rehearsal: 0.2, sports: 0.5, sports_unranked: 0.3,
}
/** D 条目实时得分 */
function dItemScore(it: Record<string, unknown>): number {
  const type = asStr(it.type)
  if (type === "award") {
    const rank = asNum(it.rank)
    if (rank === 5) return asNum(it.score) // 其他名次手填分
    const table = D_RANK_TABLE[asStr(it.level)] ?? D_RANK_TABLE.school ?? [2, 1.5, 1, 0.5]
    return table[Math.min(Math.max(rank, 1), 4) - 1] ?? 0
  }
  return D_TYPE_SCORES[type] ?? 0
}

/** F1 职位 type → 中文标签 */
function posLabel(t: string): string {
  const p = POSITION_PRESETS.find(x => x.type === t)
  return p ? p.label : t
}

/** 照片缩略图网格（点击全屏查看） */
function PhotoThumbs({ urls, onView }: { urls: string[]; onView: (i: number) => void }) {
  if (urls.length === 0) return null
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {urls.map((u, i) => (
        <button key={i} type="button" onClick={() => onView(i)} style={{ padding: 0, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--surface-2)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt={`佐证 ${i + 1}`} style={{ width: 68, height: 68, objectFit: "cover", display: "block" }} />
        </button>
      ))}
    </div>
  )
}

/** 报表板块卡片：letter 徽章 + 标题 + 大分数 + 明细（呼吸感：大留白、细虚线、宽字距） */
function ReportCard({ letter, label, score, max, children }: { letter: string; label: string; score: string; max?: string; children?: React.ReactNode }) {
  return (
    <section style={{ background: "var(--surface)", borderRadius: 18, boxShadow: "var(--shadow-card)", padding: "22px 20px 20px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{
          width: 36, height: 36, borderRadius: 11, flexShrink: 0,
          background: letter === "S" ? "rgba(61,90,110,.1)" : "rgba(197,133,90,.12)",
          color: letter === "S" ? "var(--zc-s)" : "var(--zc-m)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, fontFamily: "var(--font-num)",
        }}>{letter}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--fg)", letterSpacing: ".01em" }}>{label}</span>
          {max ? <span style={{ display: "block", fontSize: 11, color: "var(--fg-3)", marginTop: 2, letterSpacing: ".08em" }}>满分 {max} 分</span> : null}
        </span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: letter === "S" ? "var(--zc-s)" : "var(--zc-m)", flexShrink: 0 }}>
          {score}
        </span>
      </div>
      {children ? <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 6 }}>{children}</div> : null}
    </section>
  )
}

/** 明细行：细标签 + 值（右对齐） */
function DetailRow({ k, v, strong, danger }: { k: React.ReactNode; v: React.ReactNode; strong?: boolean; danger?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "9px 0", borderBottom: "1px dashed var(--border)" }}>
      <span style={{ fontSize: 12.5, color: "var(--fg-3)", flexShrink: 0, letterSpacing: ".02em" }}>{k}</span>
      <span style={{ fontSize: 12.5, fontWeight: strong ? 600 : 400, color: danger ? "var(--danger)" : "var(--fg)", textAlign: "right", lineHeight: 1.5 }}>{v}</span>
    </div>
  )
}

/** 子分组小标题 */
function SubHead({ text }: { text: string }) {
  return <div style={{ fontSize: 11, color: "var(--fg-3)", letterSpacing: ".12em", margin: "12px 0 2px", textTransform: "uppercase" }}>{text}</div>
}

/** 个人综测报表：全部板块得分 + 详细提交内容。 */
export default function MobileReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [row, setRow] = useState<RankRow | null>(null)
  const [loaded, setLoaded] = useState(false)
  // 自己板块原始数据（含照片）
  const [ownSec, setOwnSec] = useState<Record<string, { data: Record<string, unknown>; evidence: string[]; status: string; score: number | null }>>({})
  // 照片查看器
  const [viewer, setViewer] = useState<MobViewerImage[] | null>(null)
  const [viewerIdx, setViewerIdx] = useState(0)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/ranking")
      .then(r => (r.ok ? r.json() : null))
      .then((d: { rows?: RankRow[] } | null) => {
        if (d?.rows && session?.user?.id) {
          // 游客模式：直接展示演示报表（第一行数据）
          const me = session.user.role === "guest" ? d.rows[0] : d.rows.find(x => x.id === session.user.id)
          if (me) setRow(me)
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
    // 自己的板块原始数据（照片等）
    fetch("/api/zongce/sections")
      .then(r => (r.ok ? r.json() : null))
      .then((d: { sections?: { section: string; data: string | null; evidence: string | null; status: string; score: number | null }[] } | null) => {
        const map: Record<string, { data: Record<string, unknown>; evidence: string[]; status: string; score: number | null }> = {}
        for (const s of d?.sections ?? []) {
          let parsed: Record<string, unknown> = {}
          try { parsed = JSON.parse(s.data || "{}") } catch { parsed = {} }
          let ev: string[] = []
          try { ev = JSON.parse(s.evidence || "[]") } catch { ev = [] }
          map[s.section] = { data: parsed, evidence: Array.isArray(ev) ? ev : [], status: s.status, score: s.score }
        }
        setOwnSec(map)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const content = useMemo(() => {
    if (!row) return null
    // 优先用自己板块原始数据（含照片），ranking 明细作兜底
    const det = row.sectionDetails
    const a = ownSec.A?.data ?? det.A ?? {}
    const b = ownSec.B?.data ?? det.B ?? {}
    const c = ownSec.C?.data ?? det.C ?? {}
    const e = ownSec.E?.data ?? det.E ?? {}
    const f = ownSec.F?.data ?? det.F ?? {}
    const dItems = asArr(ownSec.D?.data?.items ?? det.D?.items)
    const f1 = asArr(f.f1), f2 = asArr(f.f2), f3 = asArr(f.f3), f4 = asArr(f.f4), f5 = asArr(f.f5)
    const secScore = (k: string) => {
      const s = row.sectionScores.find(x => x.section === k)
      return s && s.status === "approved" ? (s.score ?? 0).toFixed(2) : "—"
    }
    return {
      a, b, c, e, f, dItems, f1, f2, f3, f4, f5, secScore,
      failTotal: (row.failedCount ?? 0) + (row.failedPolicyCount ?? 0),
      cStar: asNum(c.starLevel),
      youthBonus: Math.floor(asNum(b.youthStudyCount) / 3) * 0.2,
      sEvidence: ownSec.S?.evidence ?? [],
      eEvidence: ownSec.E?.evidence ?? [],
      dPhotos: (it: Record<string, unknown>) => (Array.isArray(it.photos) ? (it.photos as string[]) : []),
      fPhotos: (it: Record<string, unknown>) => (Array.isArray(it.photos) ? (it.photos as string[]) : []),
    }
  }, [row, ownSec])

  if (status === "loading" || !loaded) {
    return (
      <div className="mob-page">
        <MobTopBar title="综测报表" back icon={<BookOpen size={17} />} />
        <MobLoading rows={8} />
      </div>
    )
  }
  if (!session || !row || !content) {
    return (
      <div className="mob-page">
        <MobTopBar title="综测报表" back icon={<BookOpen size={17} />} />
        <MobEmpty icon={<BookOpen size={28} />} title="暂无报表数据" desc="综测成绩尚未生成" />
      </div>
    )
  }

  const { a, b, c, e, f, dItems, f1, f2, f3, f4, f5, secScore, failTotal, cStar, youthBonus, sEvidence, eEvidence, dPhotos, fPhotos } = content

  const openViewer = (urls: string[]) => {
    setViewer(urls.map((u, i) => ({ url: u, label: `佐证照片 ${i + 1}` })))
    setViewerIdx(0)
  }

  return (
    <div className="mob-page" style={{ paddingBottom: 32 }}>
      <MobTopBar title="综测报表" back icon={<BookOpen size={17} />} />

      {/* 报表头部：呼吸感留白 */}
      <div style={{ textAlign: "center", padding: "26px 8px 22px" }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".22em", color: "var(--fg-3)", textTransform: "uppercase", fontFamily: "var(--font-num)" }}>
          Personal Report · 2025-2026
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--fg)", marginTop: 12, letterSpacing: ".02em" }}>
          {row.name}
        </div>
        <div style={{ fontFamily: "var(--font-num)", fontSize: 12, color: "var(--fg-3)", marginTop: 6, letterSpacing: ".08em" }}>
          {row.studentId} · GPA {row.gpa.toFixed(2)}
        </div>
        <div style={{ marginTop: 22, display: "flex", justifyContent: "center", gap: 26 }}>
          <MobScoreRing value={row.sScore} max={130} label="S 学业" tone="s" size="sm" />
          <MobScoreRing value={row.mScore} max={30} label="M 品行" tone="m" size="sm" />
          <MobScoreRing value={row.totalScore} max={160} label="T 总分" tone="t" size="sm" />
        </div>
        <div style={{ marginTop: 20, display: "inline-flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--fg-3)", letterSpacing: ".1em" }}>综测总分</span>
          <span key={row.totalScore.toFixed(2)} className="mob-num-pop" style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 700, color: "var(--fg)", lineHeight: 1 }}>
            {row.totalScore.toFixed(2)}
          </span>
        </div>
        {row.physicalTest !== null && row.physicalTest !== undefined && (
          <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--fg-3)", letterSpacing: ".06em" }}>体测</span>
            {row.physicalTest ? <MobChip tone="ok">过关</MobChip> : <MobChip tone="danger">未过关</MobChip>}
          </div>
        )}
      </div>

      {/* S 学习成绩 */}
      <ReportCard letter="S" label="学习成绩" score={row.sScore.toFixed(2)} max="130">
        <DetailRow k="学年 GPA" v={row.gpa.toFixed(2)} strong />
        <DetailRow k="挂科情况" v={failTotal > 0 ? `挂科 ${failTotal} 门` : "无挂科"} danger={failTotal > 0} />
        {sEvidence.length > 0 && (
          <div style={{ padding: "8px 0 2px" }}>
            <SubHead text="成绩截图" />
            <PhotoThumbs urls={sEvidence} onView={i => { setViewer(sEvidence.map((u, x) => ({ url: u, label: `成绩截图 ${x + 1}` }))); setViewerIdx(i) }} />
          </div>
        )}
        {row.coursesDetail.length > 0 && (
          <>
            <SubHead text="课程成绩明细" />
            {row.coursesDetail.map((cs, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--border)" }}>
                <span style={{ fontSize: 12.5, color: "var(--fg-2)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cs.name}
                  <span style={{ color: "var(--fg-3)", fontSize: 11 }}> · {cs.semester === 1 ? "上" : "下"}学期 · {cs.credits}学分</span>
                  {cs.repeat && <span style={{ color: "var(--warn)", fontSize: 11 }}> · 重修</span>}
                </span>
                <span style={{ fontFamily: "var(--font-num)", fontSize: 12.5, fontWeight: 600, color: cs.failed ? "var(--danger)" : "var(--fg)", flexShrink: 0 }}>
                  {cs.score != null ? cs.score : cs.grade || "—"}
                  {cs.gpa != null ? <span style={{ color: "var(--fg-3)", fontWeight: 400 }}> · 绩点{cs.gpa}</span> : null}
                </span>
              </div>
            ))}
          </>
        )}
      </ReportCard>

      {/* A 学风考勤 */}
      <ReportCard letter="A" label="学风考勤" score={secScore("A")} max="5">
        <DetailRow k="旷课" v={`${asNum(a.absences)} 次`} />
        <DetailRow k="迟到 / 早退" v={`${asNum(a.tardies)} 次`} />
        <DetailRow k="特殊情况请假" v={`${asNum(a.specialLeaves)} 次（不扣分）`} />
      </ReportCard>

      {/* B 集会政治学习 */}
      <ReportCard letter="B" label="集会政治学习" score={secScore("B")} max="2.5">
        <DetailRow k="基础分" v="1.50" />
        <DetailRow k="优秀团员" v={asBool(b.excellentMember) ? "是（标记）" : "否"} />
        <DetailRow k="党支部工作小组" v={asBool(b.partyMember) ? "是（标记）" : "否"} />
        <DetailRow k="青年大学习" v={`${asNum(b.youthStudyCount)} 期 · +${youthBonus.toFixed(2)}`} />
      </ReportCard>

      {/* C 星级宿舍 */}
      <ReportCard letter="C" label="星级宿舍" score={secScore("C")} max="2.5">
        <DetailRow k="宿舍星级" v={cStar > 0 ? `${cStar} 星级` : "未获星"} />
        <DetailRow k="文明宿舍" v={asBool(c.civilizedDorm) ? "是（+0.5）" : "否"} />
      </ReportCard>

      {/* D 文体活动 */}
      <ReportCard letter="D" label="文体活动" score={secScore("D")} max="5">
        {dItems.length === 0 ? (
          <div style={{ padding: "10px 0 4px", fontSize: 12.5, color: "var(--fg-3)" }}>暂无记录</div>
        ) : dItems.map((it, i) => {
          const score = dItemScore(it)
          const urls = dPhotos(it)
          return (
            <div key={i} style={{ padding: "6px 0", borderBottom: "1px dashed var(--border)" }}>
              <DetailRow
                k={`${i + 1}. ${asStr(it.name) || D_TYPE_LABEL[asStr(it.type)] || asStr(it.type) || "活动"}`}
                v={asStr(it.type) === "award"
                  ? `${D_LEVEL_LABEL[asStr(it.level)] || ""} · ${D_RANK_LABEL[asNum(it.rank)] || asStr(it.rankNote) || ""} · +${score.toFixed(2)}`
                  : `+${score.toFixed(2)}`}
              />
              <PhotoThumbs urls={urls} onView={i2 => { setViewer(urls.map((u, x) => ({ url: u, label: `佐证照片 ${x + 1}` }))); setViewerIdx(i2) }} />
            </div>
          )
        })}
      </ReportCard>

      {/* E 社会实践 */}
      <ReportCard letter="E" label="社会实践 / 公益" score={secScore("E")} max="5">
        <DetailRow k="分队队长 / 召集人" v={asBool(e.isCaptain) ? "是（+0.5）" : "否"} />
        <DetailRow k="优秀分队" v={asStr(e.teamAward) === "member" ? "成员（+1）" : asStr(e.teamAward) === "captain" ? "队长（+1.5）" : "无"} />
        <DetailRow k="校级积极分子" v={asBool(e.schoolLevelAward) ? "是（+2）" : "否"} />
        <DetailRow k="市级以上优秀志愿者" v={asBool(e.cityVolunteer) ? "是（+1）" : "否"} />
        <DetailRow k="志愿时长" v={`${asNum(e.volunteerHours)} 小时 · +${(asNum(e.volunteerHours) * 0.1).toFixed(2)}（封顶 3）`} />
        {eEvidence.length > 0 && (
          <div style={{ padding: "8px 0 2px" }}>
            <SubHead text="佐证照片" />
            <PhotoThumbs urls={eEvidence} onView={i => { setViewer(eEvidence.map((u, x) => ({ url: u, label: `佐证照片 ${x + 1}` }))); setViewerIdx(i) }} />
          </div>
        )}
      </ReportCard>

      {/* F 奖惩附加 */}
      <ReportCard letter="F" label="奖惩附加" score={secScore("F")} max="10">
        {f1.length > 0 && <SubHead text="F1 学生工作" />}
        {f1.map((it, i) => (
          <div key={i} style={{ padding: "4px 0", borderBottom: "1px dashed var(--border)" }}>
            <DetailRow k={`职位${i + 1}`} v={`${posLabel(asStr(it.position))} · ${asStr(it.duration) === "year" ? "一学年" : asStr(it.duration) === "sem" ? "一学期" : ""} · ${asStr(it.evaluation) === "excellent" ? "考评优秀" : asStr(it.evaluation) === "fail" ? "考评不合格" : "考评合格"}`} />
            <PhotoThumbs urls={fPhotos(it)} onView={i2 => { const urls = fPhotos(it); setViewer(urls.map((u, x) => ({ url: u, label: `佐证照片 ${x + 1}` }))); setViewerIdx(i2) }} />
          </div>
        ))}
        {f2.length > 0 && <SubHead text="F2 竞赛获奖" />}
        {f2.map((it, i) => (
          <div key={i} style={{ padding: "4px 0", borderBottom: "1px dashed var(--border)" }}>
            <DetailRow k={`项目${i + 1}`} v={`${asStr(it.name) || "竞赛"} · ${asStr(it.category)}类 · ${D_RANK_LABEL[asNum(it.rank)] || `第${asNum(it.rank)}`}${asBool(it.isTeam) ? ` · 团队第${asNum(it.position)}位` : ""}`} />
            <PhotoThumbs urls={fPhotos(it)} onView={i2 => { const urls = fPhotos(it); setViewer(urls.map((u, x) => ({ url: u, label: `佐证照片 ${x + 1}` }))); setViewerIdx(i2) }} />
          </div>
        ))}
        {f3.length > 0 && <SubHead text="F3 荣誉称号" />}
        {f3.map((it, i) => (
          <div key={i} style={{ padding: "4px 0", borderBottom: "1px dashed var(--border)" }}>
            <DetailRow k={`称号${i + 1}`} v={`${asStr(it.name) || "荣誉"} · ${F3_LEVEL_LABEL[asStr(it.level)] || ""}`} />
            <PhotoThumbs urls={fPhotos(it)} onView={i2 => { const urls = fPhotos(it); setViewer(urls.map((u, x) => ({ url: u, label: `佐证照片 ${x + 1}` }))); setViewerIdx(i2) }} />
          </div>
        ))}
        {f4.length > 0 && <SubHead text="F4 科研奖励" />}
        {f4.map((it, i) => (
          <div key={i} style={{ padding: "4px 0", borderBottom: "1px dashed var(--border)" }}>
            <DetailRow k={`成果${i + 1}`} v={`${F4_TYPE_LABEL[asStr(it.type)] || asStr(it.type)} · ${asStr(it.detail) || "—"}`} />
            <PhotoThumbs urls={fPhotos(it)} onView={i2 => { const urls = fPhotos(it); setViewer(urls.map((u, x) => ({ url: u, label: `佐证照片 ${x + 1}` }))); setViewerIdx(i2) }} />
          </div>
        ))}
        {f5.length > 0 && <SubHead text="F5 惩罚扣分" />}
        {f5.map((it, i) => (
          <DetailRow key={i} k={`处罚${i + 1}`} v={`${asStr(it.type)} × ${asNum(it.count)}`} danger />
        ))}
        {f1.length === 0 && f2.length === 0 && f3.length === 0 && f4.length === 0 && f5.length === 0 && (
          <div style={{ padding: "10px 0 4px", fontSize: 12.5, color: "var(--fg-3)" }}>暂无记录</div>
        )}
      </ReportCard>

      {/* 底部合计 */}
      <section style={{ background: "var(--surface)", borderRadius: 18, boxShadow: "var(--shadow-card)", padding: "20px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 4px 12px", borderBottom: "1px dashed var(--border)" }}>
          <span style={{ fontSize: 13, color: "var(--fg-2)", letterSpacing: ".06em" }}>学业 S + 品行 M</span>
          <span style={{ fontFamily: "var(--font-num)", fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{row.sScore.toFixed(2)} + {row.mScore.toFixed(2)}</span>
        </div>
        <div style={{ paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", letterSpacing: ".04em" }}>综测总分</span>
          <span key={`t-${row.totalScore.toFixed(2)}`} className="mob-num-pop" style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700, color: "var(--zc-t)" }}>
            {row.totalScore.toFixed(2)}
          </span>
        </div>
      </section>

      <div style={{ textAlign: "center", paddingTop: 18, fontSize: 10.5, color: "var(--fg-3)", letterSpacing: ".14em" }}>
        综合测评个人报表 · 数据以系统核算为准
      </div>

      {/* 照片查看器 */}
      {viewer !== null && <MobImageViewer images={viewer} index={viewerIdx} onClose={() => setViewer(null)} onIndexChange={setViewerIdx} />}
    </div>
  )
}
