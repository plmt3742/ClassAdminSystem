/**
 * 综测计算引擎 v2
 * 基于《计算机科学与技术学院本科生综合测评细则【试行】》(计算机【2024】2号)
 */

/** 百分制成绩 → 绩点 */
export function scoreToGPA(score: number): number {
  if (score >= 90) return Math.min(5.0, 4.0 + (score - 90) * 0.1)
  if (score >= 80) return 3.0 + (score - 80) * 0.1
  if (score >= 70) return 2.0 + (score - 70) * 0.1
  if (score >= 60) return 1.0 + (score - 60) * 0.1
  return 0
}

const GRADE_TO_GPA: Record<string, number> = {
  "优秀": 4.5, "良好": 3.5, "中等": 2.5, "及格": 1.5, "不及格": 0,
}

export function gradeToGPA(grade: string): number {
  return GRADE_TO_GPA[grade] ?? 0
}

export interface CourseInfo {
  id: string; name: string; credits: number; semester: number; isElective: boolean
}

export interface ScoreEntry {
  courseId: string; score?: number | null; grade?: string | null; gpa?: number | null
}

/** 学年平均学分绩点 */
export function calcWeightedGPA(courses: CourseInfo[], scores: ScoreEntry[]): number {
  let totalCredits = 0, totalWeighted = 0
  for (const course of courses) {
    if (course.isElective) continue
    const entry = scores.find(s => s.courseId === course.id)
    if (!entry) continue
    // 优先级与 api/zongce/scores PUT 保存逻辑一致: 已存/手动绩点 > 百分制换算 > 五级制换算
    // （手填绩点允许为 0：挂科课程教务系统绩点即为 0，以手填值为准）
    let gpa: number | null = null
    if (entry.gpa != null) gpa = entry.gpa
    else if (entry.score != null && entry.score > 0) gpa = scoreToGPA(entry.score)
    else if (entry.grade) gpa = gradeToGPA(entry.grade)
    if (gpa == null) continue
    totalWeighted += gpa * course.credits
    totalCredits += course.credits
  }
  return totalCredits > 0 ? totalWeighted / totalCredits : 0
}

/** S = GPA × 35 × 0.7 */
export function calcSScore(weightedGPA: number): number {
  return Math.round(weightedGPA * 35 * 0.7 * 100) / 100
}

// ============================================================
// Section-specific calculators
// ============================================================

/** A 学风考勤: 5满分, 旷课-1/次, 迟到-0.25/次 */
export function calcAScore(absences: number, tardies: number): number {
  return Math.max(0, 5 - absences * 1 - tardies * 0.25)
}

/** B 集会政治学习: 1.5起记, 青年大学习每3期+0.2, 上限2.5（由团支书评定；优秀团员/党支部成员仅勾选标记，不计分） */
export function calcBScore(data: {
  excellentMember?: boolean   // 优秀团员（仅标记）
  partyMember?: boolean       // 党支部工作小组成员（仅标记）
  youthStudyCount?: number    // 青年大学习完成期数
}): number {
  let score = 1.5 + Math.floor(Math.max(0, data.youthStudyCount || 0) / 3) * 0.2
  return Math.round(Math.min(2.5, score) * 100) / 100
}

/** C 星级宿舍: 五星2.5/四星2/三星1 + 扣分 + 文明宿舍+0.5, 上限2.5 */
export function calcCScore(data: {
  starLevel?: number
  penalties?: { type: string; count: number }[]
  civilizedDorm?: boolean
}): number {
  let score = 0
  if (data.starLevel === 5) score = 2.5
  else if (data.starLevel === 4) score = 2
  else if (data.starLevel === 3) score = 1
  if (data.penalties) {
    for (const p of data.penalties) {
      if (p.type === "noise" || p.type === "late") score -= p.count * 0.2
      else if (p.type === "appliance_shared") score -= p.count * 0.3
      else if (p.type === "appliance_personal") score -= p.count * 0.5
    }
  }
  if (data.civilizedDorm) score += 0.5
  return Math.max(0, Math.min(2.5, score))
}

/** D 文体活动获奖名次表：级别 × 名次（第1/2/3名，4-8名取末位） */
export const D_RANK_TABLE: Record<string, number[]> = {
  college: [1.5, 1, 0.5, 0],    // 院级
  school: [2, 1.5, 1, 0.5],     // 校级
  province: [2.5, 2, 1.5, 1],   // 省级
  national: [3, 2.5, 2, 1.5],   // 国家级
}

/** D 文体活动: 0起计, 上限5. 参与类固定加分, 获奖按级别×名次表；"其他"名次可由审核员手动确认加分（item.score 优先） */
export function calcDScore(items: { type: string; count?: number; rank?: number; level?: string; score?: number }[]): number {
  let score = 0
  for (const item of items) {
    const c = item.count || 1
    let base = 0
    switch (item.type) {
      case "ceremony": base = 0.2; break        // 大型活动(开闭幕式/方阵/颁奖典礼)
      case "team_unranked": base = 0.3; break   // 队伍代表参赛未获奖
      case "performance": base = 0.3; break     // 文艺表演
      case "rehearsal": base = 0.2; break       // 排练
      case "sports": base = 0.5; break          // 阳光体育系列活动
      case "sports_unranked": base = 0.3; break // 运动会参与未获奖
      case "award": {                           // 获奖（运动会/队伍等，按级别×名次）
        if (item.score != null && item.score > 0) { base = item.score; break } // 审核员手动确认分（"其他"名次）
        const table = D_RANK_TABLE[item.level || "school"] || D_RANK_TABLE.school
        const rank = item.rank || 4
        base = rank <= 3 ? table[rank - 1] : table[3]
        break
      }
    }
    score += base * c
  }
  return Math.round(Math.min(5, Math.max(0, score)) * 100) / 100
}

/** E 社会实践/公益: 队长0.5, 优秀分队成员1/队长1.5, 校级积极分子2, 市级以上优秀志愿者1, 志愿0.1/h封顶3, 上限5 */
export function calcEScore(data: {
  isCaptain?: boolean            // 社会实践分队队长/召集人
  teamAward?: string             // 分队获奖: none | member(优秀成员+1) | captain(优秀队长+1.5)
  schoolLevelAward?: boolean     // 校级社会实践积极分子 +2
  cityVolunteer?: boolean        // 市级以上优秀志愿者 +1
  volunteerHours?: number        // 两学期总志愿时长
}): number {
  let score = 0
  if (data.isCaptain) score += 0.5
  if (data.teamAward === "member") score += 1
  else if (data.teamAward === "captain") score += 1.5
  if (data.schoolLevelAward) score += 2
  if (data.cityVolunteer) score += 1
  if (data.volunteerHours) score += Math.min(3, data.volunteerHours * 0.1)
  return Math.round(Math.min(5, Math.max(0, score)) * 100) / 100
}

/** F2 竞赛等级分：类别 → [一等奖, 二等奖, 三等奖]（特等奖按一等奖，金奖/银奖/铜奖对应一二三等奖） */
export const F2_RANK_SCORES: Record<string, [number, number, number]> = {
  A: [6, 5.5, 5], B: [5, 4.5, 4], C: [4, 3.5, 3], D: [3, 2.5, 2], E: [2, 1.5, 1], F: [1.5, 1, 0.5],
}

/** F2 团队排位系数（合作者数 → 各排位系数） */
export const F2_TEAM_COEF: Record<number, number[]> = {
  2: [0.9, 0.85],
  3: [0.8, 0.75, 0.7],
  4: [0.7, 0.65, 0.6, 0.55],
  5: [0.6, 0.55, 0.5, 0.45, 0.4],
}
export const F2_TEAM_COEF_6 = [0.5, 0.5, 0.45, 0.4, 0.35, 0.2] // ≥6 人（第 6 位及以后 20%）

/** F3 荣誉称号分值 */
export const F3_HONOR_SCORES: Record<string, number> = { national: 3, province: 2.5, city: 2, school: 1 }

/** F5 惩罚扣分（累计不超过 5 分） */
export const F5_PENALTY_SCORES: Record<string, number> = {
  "留校察看": 5, "记过": 4, "严重警告": 3, "警告": 2, "通报批评": 1,
}

/** F 奖惩附加: F1学生工作 + F2竞赛 + F3荣誉 + F4科研 - F5惩罚, 上限10 */
export function calcFScore(data: {
  f1?: { position: string; duration?: string; evaluation?: string }[]
  f2?: { category: string; rank: number; isTeam?: boolean; teamSize?: number; position?: number }[]
  f3?: { level: string }[]
  f4?: { type: string; rank?: number; level?: string }[]
  f5?: { type: string; count?: number }[]
}): number {
  let score = 0

  // F1 学生工作：按预设职位分值 + 考评修正，最多 3 个职位
  const f1 = (data.f1 || []).slice(0, 3)
  for (const p of f1) {
    const preset = POSITION_PRESETS.find(x => x.type === p.position)
    if (!preset) continue
    let s = p.duration === "sem" ? preset.semScore : preset.yearScore
    if (p.evaluation === "excellent") s += 0.5
    else if (p.evaluation === "fail") s -= 0.5
    score += Math.max(0, s)
  }

  // F2 竞赛：等级分 × 排位系数（个人 100%）
  for (const c of data.f2 || []) {
    const base = (F2_RANK_SCORES[c.category] || [0, 0, 0])[Math.min(Math.max(c.rank, 1), 3) - 1] || 0
    if (!c.isTeam) { score += base; continue }
    const size = Math.min(Math.max(c.teamSize || 1, 1), 8)
    let coef = 0.2
    const pos = c.position ?? 0
    if (pos > 0) {
      // 兼容旧数据：有排位时按排位系数
      const p = Math.min(Math.max(pos, 1), size)
      if (size >= 6) coef = F2_TEAM_COEF_6[Math.min(p, 6) - 1] ?? 0.2
      else coef = (F2_TEAM_COEF[size] || [1])[p - 1] ?? 0.2
    } else {
      // 无排位（新流程只填团队人数）：按人数平均系数，团队成员同等加分
      let sum = 0
      if (size >= 6) sum = F2_TEAM_COEF_6.reduce((s, x) => s + x, 0) + (size - 6) * 0.2
      else sum = (F2_TEAM_COEF[size] || [1]).reduce((s, x) => s + x, 0)
      coef = Math.round((sum / size) * 1000) / 1000
    }
    score += base * coef
  }

  // F3 荣誉
  for (const h of data.f3 || []) score += F3_HONOR_SCORES[h.level] || 0

  // F4 科研
  let newspaperSum = 0
  for (const r of data.f4 || []) {
    switch (r.type) {
      case "newspaper": newspaperSum += 0.5; break
      case "journal": score += r.rank === 1 ? 2 : r.rank === 2 ? 0.8 : Math.max(0.2, 0.8 - ((r.rank || 3) - 2) * 0.2); break
      case "essay": score += ({ 1: 1, 2: 0.8, 3: 0.5, 4: 0.25 } as Record<number, number>)[r.rank || 4] ?? 0; break
      case "research": score += r.level === "province" ? 2.5 : 2; break
      case "patent": score += 2; break
    }
  }
  score += Math.min(1, newspaperSum) // 校报发表累计不超过 1 分

  // F5 惩罚（累计不超过 5 分）
  let penalty = 0
  for (const p of data.f5 || []) penalty += (F5_PENALTY_SCORES[p.type] || 0) * (p.count || 1)
  score -= Math.min(5, penalty)

  return Math.round(Math.min(10, Math.max(0, score)) * 100) / 100
}

export function calcMScore(sectionScores: Record<string, number>): number {
  const raw = ["A","B","C","D","E","F"].reduce((s,k) => s + (sectionScores[k]||0), 0)
  return Math.round(Math.min(raw, 30) * 100) / 100
}

export function calcTotalScore(s: number, m: number): number {
  return Math.round((s + m) * 100) / 100
}

// ============================================================
// Section metadata
// ============================================================

export const SECTION_META: Record<string, { label: string; max: number; reviewer: string; icon: string; rules: string }> = {
  S: { label:"学习成绩", max:0, reviewer:"学习委员", icon:"book",
    rules:"学年平均学分绩点 = Σ(课程绩点×学分) ÷ Σ学分（不含任选课）\nS = 平均学分绩点 × 35 × 70%" },
  A: { label:"学风考勤", max:5, reviewer:"班长", icon:"clipboard",
    rules:"填写个人考勤情况，系统自动计算得分\n记满分 5 分\n旷课一次扣 1 分\n迟到一次扣 0.25 分\n特殊情况请假（辅导员同意）不扣分" },
  B: { label:"集会政治学习", max:2.5, reviewer:"团支书", icon:"users",
    rules:"1.5 分起记，满分 2.5 分。\n青年大学习每累计 3 期 +0.2 分（可叠加，累计 15 期即可满分）。\n优秀团员、党支部工作小组成员仅作身份标记，不计分。\n本板块由团支书评定填写，无需本人填报" },
  C: { label:"星级宿舍", max:2.5, reviewer:"生活委员", icon:"home",
    rules:"五星级宿舍 2.5 分，四星级 2 分，三星级 1 分，未获星级 0 分。\n获评文明宿舍 +0.5 分。\n本板块由生活委员评定填写，无需本人填报" },
  D: { label:"文体活动", max:5, reviewer:"文体委员", icon:"music",
    rules:"文体活动满分 5 分，以 0 分起计。\n1. 参加学校一年一度的大型活动，校运会开/闭幕式，院/校运会方阵，校奖学金颁奖典礼：加 0.2 分/次。\n2. 各球队、辩论队或其他队伍代表学院（学校）参加比赛未获奖加 0.3 分/次，获奖按名次加分。\n3. 参加校、院文艺表演活动 0.3 分/次，参加过校、院文艺表演活动排练 0.2 分。\n4. 参加学校、学院举行的阳光体育系列活动 0.5 分/次。\n5. 参加校、院运动会，参与并获奖按名次加分，参与未获奖加 0.3 分/次。\n获奖名次（第1/2/3/4-8名）：院 1.5/1/0.5/0 · 校 2/1.5/1/0.5 · 省 2.5/2/1.5/1 · 国 3/2.5/2/1.5\n与 F 板块不重复加分。本板块由学生填写，文体委员审核。" },
  E: { label:"社会实践/公益", max:5, reviewer:"组织委员", icon:"heart",
    rules:"担任社会实践分队队长、召集人 +0.5 分\n优秀社会实践分队成员、镇区实践积极分子 +1 分；优秀分队队长或召集人 +1.5 分\n个人获校级社会实践积极分子称号 +2 分\n市级以上优秀志愿者 +1 分\n志愿时长每 1 小时 +0.1 分，最高不超过 3 分（需上传 i 志愿截图佐证）\n与 F 板块不重复加分。本板块由学生填写，组织委员审核。" },
  F: { label:"奖惩附加", max:10, reviewer:"班长", icon:"award",
    rules:"上限 10 分，包含五个部分：\nF1 学生工作：校/院/班/党/宿舍/社团/勤工助学职位（最多叠加 3 个职位；考评仅校院组织与班委适用：优秀 +0.5、不合格 -0.5）\nF2 竞赛获奖：A-F 类（A类一等 6 分起），特等奖按一等奖；团队按排位系数分配；同比赛只取最高分\nF3 荣誉称号：国家级 3 / 省级 2.5 / 市级 2 / 校级 1\nF4 科研奖励：校报文章（累计≤1）、期刊论文、征文/课题、专利\nF5 惩罚扣分：留校 5 / 记过 4 / 严重警告 3 / 警告 2 / 通报 1（累计≤5）\n注意：技能证书、培训证书（四六级、普通话、会计资格、驾驶证等）不加分；上一学年评奖评优所获奖项荣誉不可重复加分；与 D/E 板块不重复加分。\n本板块由学生填写，班长审核。" },
}

export const SECTION_ORDER = ["S","A","B","C","D","E","F"]

/** 当前已开放的板块（其余上锁；B/C 为学生只读查看，由对应班委评定） */
export const OPEN_SECTIONS = ["S", "A", "B", "C", "D", "E", "F"]

/** 综测填报截止开关：true = 全部板块只读（仅可查看已提交内容，不可修改/提交/撤回）。体测收集不受影响。 */
export const FORM_LOCKED = false

export const STATUS_LABEL: Record<string, string> = {
  not_started:"未填写", draft:"草稿", submitted:"待审核", approved:"已通过", returned:"退回修改",
}

// ============================================================
// F section: presets for UI
// ============================================================

export interface PositionPreset {
  label: string; type: string; category: string; yearScore: number; semScore: number
}

export const POSITION_PRESETS: PositionPreset[] = [
  { label:"校级第一负责人", type:"school_chief", category:"校级组织", yearScore:4, semScore:2 },
  { label:"校级其他负责人", type:"school_deputy", category:"校级组织", yearScore:3.5, semScore:1.7 },
  { label:"校级部门主要负责人", type:"school_dept_chief", category:"校级组织", yearScore:2.5, semScore:1.2 },
  { label:"校级部门其他负责人", type:"school_dept_deputy", category:"校级组织", yearScore:2.3, semScore:1.1 },
  { label:"校级干事", type:"school_staff", category:"校级组织", yearScore:1.5, semScore:0.7 },
  { label:"院级第一负责人", type:"college_chief", category:"院级组织", yearScore:3.8, semScore:1.9 },
  { label:"院级非第一负责人", type:"college_deputy", category:"院级组织", yearScore:3.5, semScore:1.7 },
  { label:"院级部门主要负责人", type:"college_dept_chief", category:"院级组织", yearScore:2.5, semScore:1.2 },
  { label:"院级部门其他负责人", type:"college_dept_deputy", category:"院级组织", yearScore:2.3, semScore:1.1 },
  { label:"院级干事", type:"college_staff", category:"院级组织", yearScore:1.5, semScore:0.7 },
  { label:"党支部第一负责人", type:"party_chief", category:"党支部", yearScore:2, semScore:1 },
  { label:"党支部其他负责人", type:"party_deputy", category:"党支部", yearScore:1.5, semScore:0.7 },
  { label:"班长/团支书/学习委员", type:"class_chief", category:"班集体", yearScore:2.5, semScore:1.2 },
  { label:"其他班委", type:"class_other", category:"班集体", yearScore:1.5, semScore:0.7 },
  { label:"宿舍长/社区导生", type:"dorm_leader", category:"宿舍", yearScore:0.8, semScore:0.4 },
  { label:"社团会长/副会长", type:"club_chief", category:"学生社团", yearScore:2.3, semScore:1.1 },
  { label:"社团部长/副部长", type:"club_dept", category:"学生社团", yearScore:1.5, semScore:0.7 },
  { label:"校内勤工助学（满90h）", type:"work_study", category:"勤工助学", yearScore:0, semScore:1.1 },
]

export const COMPETITION_LEVELS: Record<string, { label: string; score: number }> = {
  A:{ label:"A类", score:6 }, B:{ label:"B类", score:5 },
  C:{ label:"C类", score:4 }, D:{ label:"D类", score:3 },
  E:{ label:"E类（校级）", score:2 }, F:{ label:"F类（院级）", score:1.5 },
}
