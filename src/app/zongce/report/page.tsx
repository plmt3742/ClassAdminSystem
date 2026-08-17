"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft } from "lucide-react"
import { D_RANK_TABLE, POSITION_PRESETS } from "@/lib/zongce-utils"

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

// D 板块固定分项与职位映射（实时计算，不依赖存储值）
const D_TYPE_SCORES: Record<string, number> = {
  ceremony: 0.2, team_unranked: 0.3, performance: 0.3,
  rehearsal: 0.2, sports: 0.5, sports_unranked: 0.3,
}
function dItemScore(it: Record<string, unknown>): number {
  const type = asStr(it.type)
  if (type === "award") {
    const rank = asNum(it.rank)
    if (rank === 5) return asNum(it.score)
    const table = D_RANK_TABLE[asStr(it.level)] ?? D_RANK_TABLE.school ?? [2, 1.5, 1, 0.5]
    return table[Math.min(Math.max(rank, 1), 4) - 1] ?? 0
  }
  return D_TYPE_SCORES[type] ?? 0
}
function posLabel(p: string): string {
  const x = POSITION_PRESETS.find(y => y.type === p)
  return x ? x.label : p
}
function photoThumbs(urls: string[]) {
  if (urls.length === 0) return ""
  return urls.map((u, i) => `<a href="${u}" target="_blank" rel="noopener noreferrer"><img src="${u}" alt="佐证 ${i + 1}" style="width:88px;height:88px;object-fit:cover;border-radius:8px;border:1px solid #E5EAEF;margin:6px 6px 0 0;cursor:zoom-in;" /></a>`).join("")
}

const asNum = (v: unknown): number => (typeof v === "number" ? v : 0)
const asBool = (v: unknown): boolean => v === true
const asStr = (v: unknown): string => (typeof v === "string" ? v : "")
const asArr = (v: unknown): Record<string, unknown>[] =>
  (Array.isArray(v) ? v.filter(x => x && typeof x === "object") : []) as Record<string, unknown>[]

const serif = 'Georgia, "Times New Roman", "Noto Serif SC", serif'
const mono = '"JetBrains Mono", ui-monospace, monospace'

/** 桌面端 · 个人综测报表：报表文档风格，大留白呼吸感。 */
export default function DesktopReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [row, setRow] = useState<RankRow | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [ownSec, setOwnSec] = useState<Record<string, { data: Record<string, unknown>; evidence: string[] }>>({})

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
    fetch("/api/zongce/sections")
      .then(r => (r.ok ? r.json() : null))
      .then((d: { sections?: { section: string; data: string | null; evidence: string | null }[] } | null) => {
        const map: Record<string, { data: Record<string, unknown>; evidence: string[] }> = {}
        for (const s of d?.sections ?? []) {
          let parsed: Record<string, unknown> = {}
          try { parsed = JSON.parse(s.data || "{}") } catch { parsed = {} }
          let ev: string[] = []
          try { ev = JSON.parse(s.evidence || "[]") } catch { ev = [] }
          map[s.section] = { data: parsed, evidence: Array.isArray(ev) ? ev : [] }
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
      getPhotos: (it: Record<string, unknown>) => (Array.isArray(it.photos) ? (it.photos as string[]) : []),
    }
  }, [row, ownSec])

  if (status === "loading") return <p className="empty-state">加载中...</p>
  if (!session) return null

  if (!loaded || !row || !content) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 32px" }}>
        <button onClick={() => router.push("/zongce")} style={{ background: "none", border: "none", color: "#7A8A94", cursor: "pointer", fontSize: ".85rem" }}><ArrowLeft size={14} /> 返回综测看板</button>
        <p style={{ color: "#7A8A94", marginTop: 40, textAlign: "center" }}>暂无报表数据</p>
      </main>
    )
  }

  const { a, b, c, e, f, dItems, f1, f2, f3, f4, f5, secScore, failTotal, cStar, youthBonus, sEvidence, eEvidence, getPhotos } = content

  const Sec = ({ letter, label, score, max, children }: { letter: string; label: string; score: string; max?: string; children?: React.ReactNode }) => (
    <section style={{ background: "#fff", border: "1px solid #E5EAEF", borderRadius: 10, padding: "28px 30px", marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <span style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: letter === "S" ? "rgba(61,90,110,.09)" : "rgba(197,133,90,.1)",
          color: letter === "S" ? "#3D5A6E" : "#C5855A",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: mono, fontSize: 15, fontWeight: 700,
        }}>{letter}</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontFamily: serif, fontSize: 17, fontWeight: 700, color: "#1A1D22" }}>{label}</span>
          {max ? <span style={{ display: "block", fontFamily: mono, fontSize: 11, color: "#A0A8B2", marginTop: 4, letterSpacing: ".08em" }}>满分 {max} 分</span> : null}
        </span>
        <span style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: letter === "S" ? "#3D5A6E" : "#C5855A" }}>{score}</span>
      </div>
      {children ? <div style={{ borderTop: "1px dashed #E5EAEF", paddingTop: 6 }}>{children}</div> : null}
    </section>
  )

  const KV = ({ k, v, strong, danger }: { k: React.ReactNode; v: React.ReactNode; strong?: boolean; danger?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, padding: "10px 0", borderBottom: "1px dashed #EFF2F6" }}>
      <span style={{ fontSize: 13, color: "#8A93A0", flexShrink: 0 }}>{k}</span>
      <span style={{ fontSize: 13, fontWeight: strong ? 600 : 400, color: danger ? "#C4615A" : "#1A1D22", textAlign: "right", lineHeight: 1.5 }}>{v}</span>
    </div>
  )

  const Sub = ({ text }: { text: string }) => (
    <div style={{ fontFamily: mono, fontSize: 10.5, color: "#A0A8B2", letterSpacing: ".16em", margin: "16px 0 2px", textTransform: "uppercase" }}>{text}</div>
  )

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "44px 32px 80px" }}>
      <button onClick={() => router.push("/zongce")} style={{ background: "none", border: "none", color: "#7A8A94", cursor: "pointer", fontSize: ".85rem", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ArrowLeft size={14} /> 返回综测看板
      </button>

      {/* 报表头部 */}
      <div style={{ textAlign: "center", padding: "56px 16px 44px" }}>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".3em", color: "#A0A8B2", textTransform: "uppercase" }}>
          Personal Report · 2025-2026
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 34, fontWeight: 700, color: "#1A1D22", margin: "18px 0 0", letterSpacing: ".02em" }}>
          {row.name}
        </h1>
        <div style={{ fontFamily: mono, fontSize: 13, color: "#8A93A0", marginTop: 10, letterSpacing: ".08em" }}>
          {row.studentId} · GPA {row.gpa.toFixed(2)}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 36 }}>
          {[
            { label: "S 学业", v: row.sScore.toFixed(2), max: "130", color: "#3D5A6E" },
            { label: "M 品行", v: row.mScore.toFixed(2), max: "30", color: "#C5855A" },
            { label: "T 总分", v: row.totalScore.toFixed(2), max: "160", color: "#5A8C6F" },
          ].map(x => (
            <div key={x.label} style={{ textAlign: "center", minWidth: 96 }}>
              <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: x.color }}>{x.v}</div>
              <div style={{ fontFamily: mono, fontSize: 10.5, color: "#A0A8B2", marginTop: 6, letterSpacing: ".1em" }}>{x.label} / {x.max}</div>
            </div>
          ))}
        </div>
        {row.physicalTest !== null && row.physicalTest !== undefined && (
          <div style={{ marginTop: 26, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12.5, color: "#8A93A0", letterSpacing: ".06em" }}>体测</span>
            {row.physicalTest ? (
              <span style={{ padding: "4px 14px", borderRadius: 999, background: "rgba(62,142,99,.1)", color: "#3E8E63", fontSize: 12.5, fontWeight: 600 }}>过关</span>
            ) : (
              <span style={{ padding: "4px 14px", borderRadius: 999, background: "rgba(196,97,90,.1)", color: "#C4615A", fontSize: 12.5, fontWeight: 600 }}>未过关</span>
            )}
          </div>
        )}
      </div>

      {/* S */}
      <Sec letter="S" label="学习成绩" score={row.sScore.toFixed(2)} max="130">
        <KV k="学年 GPA" v={row.gpa.toFixed(2)} strong />
        <KV k="挂科情况" v={failTotal > 0 ? `挂科 ${failTotal} 门` : "无挂科"} danger={failTotal > 0} />
        {sEvidence.length > 0 && (
          <div style={{ padding: "8px 0 2px" }}>
            <Sub text="成绩截图" />
            <div dangerouslySetInnerHTML={{ __html: photoThumbs(sEvidence) }} />
          </div>
        )}
        {row.coursesDetail.length > 0 && (
          <>
            <Sub text="课程成绩明细" />
            {row.coursesDetail.map((cs, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, padding: "9px 0", borderBottom: "1px dashed #EFF2F6" }}>
                <span style={{ fontSize: 13, color: "#4A5463", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cs.name}
                  <span style={{ color: "#A0A8B2", fontSize: 11.5, fontFamily: mono }}> · {cs.semester === 1 ? "上" : "下"} · {cs.credits}学分</span>
                  {cs.repeat && <span style={{ color: "#C7924B", fontSize: 11.5 }}> · 重修</span>}
                </span>
                <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: cs.failed ? "#C4615A" : "#1A1D22", flexShrink: 0 }}>
                  {cs.score != null ? cs.score : cs.grade || "—"}
                  {cs.gpa != null ? <span style={{ color: "#A0A8B2", fontWeight: 400 }}> · {cs.gpa}</span> : null}
                </span>
              </div>
            ))}
          </>
        )}
      </Sec>

      <Sec letter="A" label="学风考勤" score={secScore("A")} max="5">
        <KV k="旷课" v={`${asNum(a.absences)} 次`} />
        <KV k="迟到 / 早退" v={`${asNum(a.tardies)} 次`} />
        <KV k="特殊情况请假" v={`${asNum(a.specialLeaves)} 次（不扣分）`} />
      </Sec>

      <Sec letter="B" label="集会政治学习" score={secScore("B")} max="2.5">
        <KV k="基础分" v="1.50" />
        <KV k="优秀团员" v={asBool(b.excellentMember) ? "是（标记）" : "否"} />
        <KV k="党支部工作小组" v={asBool(b.partyMember) ? "是（标记）" : "否"} />
        <KV k="青年大学习" v={`${asNum(b.youthStudyCount)} 期 · +${youthBonus.toFixed(2)}`} />
      </Sec>

      <Sec letter="C" label="星级宿舍" score={secScore("C")} max="2.5">
        <KV k="宿舍星级" v={cStar > 0 ? `${cStar} 星级` : "未获星"} />
        <KV k="文明宿舍" v={asBool(c.civilizedDorm) ? "是（+0.5）" : "否"} />
      </Sec>

      <Sec letter="D" label="文体活动" score={secScore("D")} max="5">
        {dItems.length === 0 ? (
          <div style={{ padding: "12px 0 4px", fontSize: 13, color: "#A0A8B2" }}>暂无记录</div>
        ) : dItems.map((it, i) => {
          const score = dItemScore(it)
          const urls = getPhotos(it)
          return (
            <div key={i} style={{ padding: "5px 0", borderBottom: "1px dashed #EFF2F6" }}>
              <KV k={`${i + 1}. ${asStr(it.name) || D_TYPE_LABEL[asStr(it.type)] || asStr(it.type) || "活动"}`}
                v={asStr(it.type) === "award"
                  ? `${D_LEVEL_LABEL[asStr(it.level)] || ""} · ${D_RANK_LABEL[asNum(it.rank)] || asStr(it.rankNote) || ""} · +${score.toFixed(2)}`
                  : `+${score.toFixed(2)}`} />
              {urls.length > 0 && <div dangerouslySetInnerHTML={{ __html: photoThumbs(urls) }} />}
            </div>
          )
        })}
      </Sec>

      <Sec letter="E" label="社会实践 / 公益" score={secScore("E")} max="5">
        <KV k="分队队长 / 召集人" v={asBool(e.isCaptain) ? "是（+0.5）" : "否"} />
        <KV k="优秀分队" v={asStr(e.teamAward) === "member" ? "成员（+1）" : asStr(e.teamAward) === "captain" ? "队长（+1.5）" : "无"} />
        <KV k="校级积极分子" v={asBool(e.schoolLevelAward) ? "是（+2）" : "否"} />
        <KV k="市级以上优秀志愿者" v={asBool(e.cityVolunteer) ? "是（+1）" : "否"} />
        <KV k="志愿时长" v={`${asNum(e.volunteerHours)} 小时 · +${(asNum(e.volunteerHours) * 0.1).toFixed(2)}（封顶 3）`} />
        {eEvidence.length > 0 && (
          <div style={{ padding: "8px 0 2px" }}>
            <Sub text="佐证照片" />
            <div dangerouslySetInnerHTML={{ __html: photoThumbs(eEvidence) }} />
          </div>
        )}
      </Sec>

      <Sec letter="F" label="奖惩附加" score={secScore("F")} max="10">
        {f1.length > 0 && <Sub text="F1 学生工作" />}
        {f1.map((it, i) => (
          <div key={i} style={{ padding: "4px 0", borderBottom: "1px dashed #EFF2F6" }}>
            <KV k={`职位${i + 1}`} v={`${posLabel(asStr(it.position))} · ${asStr(it.duration) === "year" ? "一学年" : asStr(it.duration) === "sem" ? "一学期" : ""} · ${asStr(it.evaluation) === "excellent" ? "考评优秀" : asStr(it.evaluation) === "fail" ? "考评不合格" : "考评合格"}`} />
            {getPhotos(it).length > 0 && <div dangerouslySetInnerHTML={{ __html: photoThumbs(getPhotos(it)) }} />}
          </div>
        ))}
        {f2.length > 0 && <Sub text="F2 竞赛获奖" />}
        {f2.map((it, i) => (
          <div key={i} style={{ padding: "4px 0", borderBottom: "1px dashed #EFF2F6" }}>
            <KV k={`项目${i + 1}`} v={`${asStr(it.name) || "竞赛"} · ${asStr(it.category)}类 · ${D_RANK_LABEL[asNum(it.rank)] || `第${asNum(it.rank)}`}${asBool(it.isTeam) ? ` · 团队第${asNum(it.position)}位` : ""}`} />
            {getPhotos(it).length > 0 && <div dangerouslySetInnerHTML={{ __html: photoThumbs(getPhotos(it)) }} />}
          </div>
        ))}
        {f3.length > 0 && <Sub text="F3 荣誉称号" />}
        {f3.map((it, i) => (
          <div key={i} style={{ padding: "4px 0", borderBottom: "1px dashed #EFF2F6" }}>
            <KV k={`称号${i + 1}`} v={`${asStr(it.name) || "荣誉"} · ${F3_LEVEL_LABEL[asStr(it.level)] || ""}`} />
            {getPhotos(it).length > 0 && <div dangerouslySetInnerHTML={{ __html: photoThumbs(getPhotos(it)) }} />}
          </div>
        ))}
        {f4.length > 0 && <Sub text="F4 科研奖励" />}
        {f4.map((it, i) => (
          <div key={i} style={{ padding: "4px 0", borderBottom: "1px dashed #EFF2F6" }}>
            <KV k={`成果${i + 1}`} v={`${F4_TYPE_LABEL[asStr(it.type)] || asStr(it.type)} · ${asStr(it.detail) || "—"}`} />
            {getPhotos(it).length > 0 && <div dangerouslySetInnerHTML={{ __html: photoThumbs(getPhotos(it)) }} />}
          </div>
        ))}
        {f5.length > 0 && <Sub text="F5 惩罚扣分" />}
        {f5.map((it, i) => (
          <KV key={i} k={`处罚${i + 1}`} v={`${asStr(it.type)} × ${asNum(it.count)}`} danger />
        ))}
        {f1.length === 0 && f2.length === 0 && f3.length === 0 && f4.length === 0 && f5.length === 0 && (
          <div style={{ padding: "12px 0 4px", fontSize: 13, color: "#A0A8B2" }}>暂无记录</div>
        )}
      </Sec>

      {/* 底部合计 */}
      <section style={{ background: "#fff", border: "1px solid #E5EAEF", borderRadius: 10, padding: "26px 30px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 4px 14px", borderBottom: "1px dashed #E5EAEF" }}>
          <span style={{ fontSize: 13.5, color: "#4A5463" }}>学业 S + 品行 M</span>
          <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 600, color: "#1A1D22" }}>{row.sScore.toFixed(2)} + {row.mScore.toFixed(2)}</span>
        </div>
        <div style={{ paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: "#1A1D22" }}>综测总分</span>
          <span style={{ fontFamily: serif, fontSize: 40, fontWeight: 700, color: "#5A8C6F" }}>{row.totalScore.toFixed(2)}</span>
        </div>
      </section>

      <div style={{ textAlign: "center", paddingTop: 26, fontFamily: mono, fontSize: 10.5, color: "#A0A8B2", letterSpacing: ".18em" }}>
        综合测评个人报表 · 数据以系统核算为准
      </div>
    </main>
  )
}
