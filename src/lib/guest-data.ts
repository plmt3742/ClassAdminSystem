/**
 * 游客模式 mock 数据生成器。
 * 游客会话（role = "guest"）下所有 API 返回演示数据：
 * 人名 → 小A/小B/小C/小D…，分数 → 固定合理的演示值（保持确定性，便于截图演示）。
 */

export const GUEST_NAMES = ["小A", "小B", "小C", "小D", "小E", "小F", "小G", "小H", "小I", "小J"]

/** 确定性伪随机（无需引入依赖）：由 seed 生成 0..1 的稳定值 */
export function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** 用学生序号生成固定学号（演示用，形如 2025404100xxx） */
export function guestStudentId(i: number): string {
  return `2025404100${String(100 + i).slice(-3)}`
}

/** 第 i 位游客的演示姓名 */
export function guestName(i: number): string {
  return GUEST_NAMES[i % GUEST_NAMES.length]
}

/** 演示综测分数（S/M/总分，S 25-32 / M 60-95 / 总分 85-127） */
export function guestSScore(i: number): number {
  return Math.round((26 + seeded(i * 3 + 1) * 6) * 100) / 100
}
export function guestMScore(i: number): number {
  return Math.round((60 + seeded(i * 7 + 2) * 35) * 100) / 100
}
export function guestTotalScore(i: number): number {
  return Math.round((guestSScore(i) + guestMScore(i)) * 100) / 100
}
export function guestGpa(i: number): number {
  return Math.round((2.8 + seeded(i * 13 + 5) * 1.2) * 100) / 100
}

/** 演示成员列表（与真实班级人数一致：45 人） */
export function guestMembers(count = 45): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => {
    const tags: string[] = []
    if (i === 0) tags.push("班长")
    if (i === 1) tags.push("副班长")
    if (i === 2) tags.push("团支书")
    if (i === 3) tags.push("学习委员")
    if (i === 4) tags.push("文体委员")
    return {
      id: `guest-${i + 1}`,
      uid: String(i + 1).padStart(4, "0"),
      studentId: guestStudentId(i),
      name: guestName(i),
      role: i === 0 ? "admin" : "student",
      tags,
      phone: null,
      createdAt: new Date("2025-09-01").toISOString(),
    }
  })
}

/** 演示公告列表 */
export function guestAnnouncements(): Record<string, unknown>[] {
  const now = Date.now()
  const mk = (daysAgo: number, title: string, content: string, pinned = false) => ({
    id: `guest-ann-${daysAgo}`,
    title,
    content,
    pinned,
    authorName: guestName(daysAgo),
    createdAt: new Date(now - daysAgo * 86400000).toISOString(),
  })
  return [
    mk(1, "欢迎使用班务管理系统", "这里是班级事务的统一管理平台：综测填报、活动报名、公告通知都在这里完成。", true),
    mk(3, "综测填报指南", "每位同学需在学年内完成 S/A/D/E/F 五大板块的综测填报，提交后由对应班委审核。"),
    mk(6, "班级活动预告", "本学期将组织多场文体活动与社会实践，具体安排以活动中心公告为准。"),
    mk(9, "数据同步说明", "系统数据每日 23:00 自动同步，请同学们及时保存填报内容。"),
  ]
}

/** 演示活动列表（含抽签结果） */
export function guestActivities(): Record<string, unknown>[] {
  return [
    {
      id: "guest-act-1",
      title: "班级运动会志愿服务",
      description: "运动会期间志愿者轮次抽签与委托管理演示数据。",
      status: "drawn",
      round: 2,
      eventTime: new Date(Date.now() + 7 * 86400000).toISOString(),
      location: "校田径场",
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      draws: [
        { id: "guest-draw-1", userId: "guest-1", status: "drawn", round: 1, delegateTo: null, delegateApproved: false, user: { id: "guest-1", name: "小A", studentId: guestStudentId(0) }, delegate: null },
        { id: "guest-draw-2", userId: "guest-2", status: "drawn", round: 1, delegateTo: null, delegateApproved: false, user: { id: "guest-2", name: "小B", studentId: guestStudentId(1) }, delegate: null },
        { id: "guest-draw-3", userId: "guest-3", status: "drawn", round: 2, delegateTo: null, delegateApproved: false, user: { id: "guest-3", name: "小C", studentId: guestStudentId(2) }, delegate: null },
      ],
      volunteers: [{ userId: "guest-4" }, { userId: "guest-5" }],
    },
    {
      id: "guest-act-2",
      title: "校园文化节文艺表演",
      description: "文艺表演报名与节目筹备。",
      status: "pending",
      round: 1,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      draws: [],
      volunteers: [],
    },
  ]
}

/** 演示时间线（activity-events） */
export function guestTimeline(): Record<string, unknown>[] {
  return [
    { id: "guest-ev-1", type: "activity_created", text: "创建了活动「班级运动会志愿服务」", time: new Date(Date.now() - 10 * 86400000).toISOString(), activityId: "guest-act-1", activityTitle: "班级运动会志愿服务", userName: "小A" },
    { id: "guest-ev-2", type: "student_drawn", text: "第 1 轮抽签完成，3 名同学参与", time: new Date(Date.now() - 8 * 86400000).toISOString(), activityId: "guest-act-1", activityTitle: "班级运动会志愿服务", userName: "小B", round: 1 },
    { id: "guest-ev-3", type: "volunteered", text: "小D 报名参加志愿活动", time: new Date(Date.now() - 6 * 86400000).toISOString(), activityId: "guest-act-1", activityTitle: "班级运动会志愿服务", userName: "小D" },
    { id: "guest-ev-4", type: "activity_created", text: "创建了活动「校园文化节文艺表演」", time: new Date(Date.now() - 5 * 86400000).toISOString(), activityId: "guest-act-2", activityTitle: "校园文化节文艺表演", userName: "小A" },
  ]
}

/** 演示在线数据 */
export function guestOnline() {
  const history = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, "0")}:00`,
    count: Math.round(3 + seeded(i * 5 + 1) * 12),
  }))
  return {
    online: 8,
    history,
    users: [
      { userName: "小A" },
      { userName: "小B" },
      { userName: "小C" },
      { userName: "小D" },
      { userName: "小E" },
    ],
  }
}

/** 演示综测看板（dashboard） */
export function guestDashboard(userName = "游客") {
  const s = guestSScore(0)
  const m = guestMScore(0)
  const total = s + m
  const sectionDefs: { key: string; label: string; max: number; reviewer: string }[] = [
    { key: "S", label: "学习成绩", max: 130, reviewer: "学习委员" },
    { key: "A", label: "学风考勤", max: 5, reviewer: "班长" },
    { key: "B", label: "集会政治学习", max: 2.5, reviewer: "团支书" },
    { key: "C", label: "星级宿舍", max: 2.5, reviewer: "生活委员" },
    { key: "D", label: "文体活动", max: 5, reviewer: "文体委员" },
    { key: "E", label: "社会实践 / 公益", max: 5, reviewer: "组织委员" },
    { key: "F", label: "奖惩附加", max: 10, reviewer: "班长" },
  ]
  const sections = sectionDefs.map((d, i) => ({
    section: d.key,
    label: d.label,
    max: d.max,
    reviewer: d.reviewer,
    icon: d.key,
    status: i < 5 ? "approved" : i === 5 ? "submitted" : "not_started",
    score: i < 5 ? Math.round((1.5 + seeded(i * 11 + 3) * 3) * 100) / 100 : 0,
    data: d.key === "S" ? { gpa: guestGpa(0) } : {},
    locked: false,
  }))
  return {
    sScore: s,
    mScore: m,
    totalScore: Math.round(total * 100) / 100,
    weightedGPA: guestGpa(0),
    sections,
    // 游客模式下不返回待审核项（审核页不对游客开放，避免死链接）
    pendingReviews: [],
    courseCount: 12,
    filledScoreCount: 10,
    allStudents: [],
    viewingUser: null,
    isAdmin: false,
    photoCount: 0,
    guest: true,
    guestName: userName,
  }
}

/** 演示班级排名 */
export function guestRanking(count = 45) {
  const rows = Array.from({ length: count }, (_, i) => {
    const s = guestSScore(i)
    const m = guestMScore(i)
    return {
      id: `guest-${i + 1}`,
      name: guestName(i),
      studentId: guestStudentId(i),
      physicalTest: i % 4 !== 0,
      gpa: guestGpa(i),
      sScore: s,
      mScore: m,
      totalScore: s + m,
      failedCount: i % 7 === 0 ? 1 : 0,
      failedPolicyCount: 0,
      repeatCount: i % 9 === 0 ? 1 : 0,
      approvedCount: 5 + (i % 3),
      totalSections: 7,
      filledCount: 6 + (i % 2),
      courseTotal: 12,
      sectionScores: [
        { section: "S", status: "approved", score: s },
        { section: "A", status: "approved", score: Math.round((3 + seeded(i * 5 + 2) * 2) * 100) / 100 },
        { section: "B", status: "approved", score: Math.round((1.5 + seeded(i * 7 + 4) * 1) * 100) / 100 },
        { section: "C", status: "approved", score: Math.round((1 + seeded(i * 11 + 6) * 1.5) * 100) / 100 },
        { section: "D", status: "approved", score: Math.round((2 + seeded(i * 13 + 8) * 3) * 100) / 100 },
        { section: "E", status: "approved", score: Math.round((2 + seeded(i * 17 + 10) * 3) * 100) / 100 },
        { section: "F", status: "approved", score: Math.round((2 + seeded(i * 19 + 12) * 6) * 100) / 100 },
      ],
      sectionDetails: {},
      coursesDetail: Array.from({ length: 6 }, (_, c) => ({
        name: ["高等数学", "大学英语", "程序设计基础", "大学物理", "线性代数", "形势与政策"][c],
        credits: [5, 4, 3, 4, 3, 2][c],
        semester: c < 3 ? 1 : 2,
        score: 62 + Math.round(seeded(i * 23 + c * 3 + 1) * 36),
        grade: null,
        gpa: Math.round((2.5 + seeded(i * 29 + c * 5 + 2) * 1.5) * 100) / 100,
        repeat: false,
        failed: false,
      })),
    }
  })
  rows.sort((a, b) => (b.totalScore as number) - (a.totalScore as number))
  const avg = rows.reduce((s, r) => s + (r.totalScore as number), 0) / rows.length
  return {
    rows,
    totalStudents: rows.length,
    avgTotal: Math.round(avg * 100) / 100,
    maxTotal: (rows[0]?.totalScore as number) ?? 0,
    totalFailed: rows.filter(r => r.failedCount > 0).length,
  }
}

/** 演示个人报表行 */
export function guestReportRow() {
  return guestRanking(45).rows[0]
}

/** 演示民主评议排行榜 */
export function guestCommitteeRanking() {
  const roles = ["班长", "副班长", "团支书", "学习委员", "文体委员", "生活委员", "组织委员", "宣传委员"]
  return {
    rows: roles.map((role, i) => ({
      name: guestName(i),
      role,
      count: 42,
      avg: Math.round((80 + seeded(i * 31 + 7) * 18) * 100) / 100,
    })),
  }
}

/** 演示某板块详情（review detail 等） */
export function guestSectionDetail(section: string, userName = "小A") {
  return {
    id: `guest-sec-${section}`,
    section,
    status: "submitted",
    score: Math.round((2 + seeded(section.charCodeAt(0) * 3 + 1) * 3) * 100) / 100,
    data: JSON.stringify({ items: [] }),
    evidence: "[]",
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
    user: { id: "guest-1", name: userName, studentId: guestStudentId(0) },
  }
}

/** 演示当前轮次/剩余名单 */
export function guestGlobalRound() {
  return {
    currentRound: 2,
    drawnCount: 12,
    remaining: [
      { id: "guest-13", name: "小C", studentId: guestStudentId(2) },
      { id: "guest-14", name: "小D", studentId: guestStudentId(3) },
      { id: "guest-15", name: "小E", studentId: guestStudentId(4) },
    ],
  }
}

/** 演示个人委托记录 */
export function guestDelegations() {
  return { incoming: [], outgoing: [], notifications: [], unreadCount: 0 }
}

/** 演示搜索结果 */
export function guestSearch(q: string) {
  const list = guestMembers(10)
  const s = (q || "").trim().toLowerCase()
  return {
    students: list.filter(m =>
      !s ||
      String(m.name).toLowerCase().includes(s) ||
      String(m.studentId).includes(s),
    ).slice(0, 8),
  }
}

/** 演示通知 */
export function guestNotifications() {
  return { notifications: [], unreadCount: 0 }
}
