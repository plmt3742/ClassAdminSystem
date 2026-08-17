/**
 * 班委民主评议 · 名单与职务配置
 *
 * ⚠️ 安全说明：请将下方姓名替换为你所在班级的真实班委名单。
 * 本仓库示例使用占位姓名，避免公开真实班级成员信息。
 * 按姓名关联 User 表（用户导入后以 students.json 姓名为准）。
 */

export interface CommitteeMember {
  name: string
  role: string
}

export const COMMITTEE_MEMBERS: CommitteeMember[] = [
  { name: "班长姓名", role: "班长 · 副团支书" },
  { name: "团支书姓名", role: "团支书" },
  { name: "学习委员姓名", role: "学习委员" },
  { name: "副班长姓名", role: "副班长" },
  { name: "生活委员姓名", role: "生活委员" },
  { name: "文体委员姓名", role: "文体委员" },
  { name: "组织委员姓名", role: "组织委员 · 志愿队长" },
  { name: "心理委员姓名", role: "心理委员" },
  { name: "宣传委员姓名", role: "宣传委员" },
]

/** 当前学年（评分数据按学年隔离） */
export const DEFAULT_YEAR = "2025-2026"

/** 评分范围 */
export const RATING_MIN = 0
export const RATING_MAX = 100
