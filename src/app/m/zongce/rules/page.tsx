"use client"

import { useState } from "react"
import {
  ChevronDown, BookOpen, ClipboardCheck, Users, Home, Music, Heart,
  Award, Trophy, Medal, FileText, AlertTriangle,
} from "lucide-react"
import MobTopBar from "../../_components/MobTopBar"

/* 综测细则：依据《计算机科学与技术学院（网络空间安全学院）本科生综合测评细则【试行】》（计算机【2024】2号，2024年1月1日起试行） */

type Block =
  | { type: "line"; text: string }
  | { type: "table"; heads: string[]; rows: (string | number)[][] }

interface RuleSection {
  id: string
  title: string
  icon: typeof BookOpen
  blocks: Block[]
}

const SECTIONS: RuleSection[] = [
  {
    id: "s1",
    title: "一、总则与公式",
    icon: BookOpen,
    blocks: [
      { type: "line", text: "① 学年平均学分绩点 ＝ Σ（课程成绩绩点×课程学分）÷ Σ课程学分。课程成绩绩点折算方法详见《学生手册》43 页。" },
      { type: "line", text: "② 综合测评总分（T）＝ 学习成绩得分（S）＋ 品行表现得分（M）。" },
      { type: "line", text: "③ 学习成绩得分（S）＝ 学年平均学分绩点 × 35 × 70％（任选课不计入学习成绩）。" },
      { type: "line", text: "④ 品行表现得分（M）＝ A ＋ B ＋ C ＋ D ＋ E ＋ F，品行表现分满 30 分，超出不计。" },
      { type: "line", text: "⑤ “校”指东莞理工学院，“院”指计算机科学与技术学院（网络空间安全学院）。以上成绩和品行表现分均针对上一学年（不涉及本学年）。" },
      {
        type: "table",
        heads: ["百分制成绩", "绩点", "五级制", "绩点"],
        rows: [
          ["90-100", "4.0-5.0（90→4.0，91→4.1…100→5.0）", "优秀", "4.5"],
          ["80-90", "3.0-4.0", "良好", "3.5"],
          ["70-80", "2.0-3.0", "中等", "2.5"],
          ["60-70", "1.0-2.0", "合格（及格）", "1.5"],
          ["60 以下", "0", "不及格", "0"],
        ],
      },
    ],
  },
  {
    id: "s2",
    title: "二、S 学习成绩（审核：学习委员）",
    icon: BookOpen,
    blocks: [
      { type: "line", text: "以考试成绩为依据，即：本学年平均学分绩点 × 35 × 70%。注：任选课不计算在学习成绩里。" },
      { type: "line", text: "每学年初完成上一学年成绩登记并统计出此项分数。" },
    ],
  },
  {
    id: "s3",
    title: "三、A 学风考勤（满分 5 分，审核：班长）",
    icon: ClipboardCheck,
    blocks: [
      { type: "line", text: "1. 旷课 1 次扣 1 分。" },
      { type: "line", text: "2. 迟到 1 次扣 0.25 分。" },
      { type: "line", text: "3. 特殊情况请假不扣分，但需得到辅导员同意。" },
      { type: "line", text: "做好考勤记录，每节课后由任课老师签名，每月初把考勤表及有关请假条交院（系）办教学秘书处。" },
    ],
  },
  {
    id: "s4",
    title: "四、B 集会政治学习（满分 2.5 分，审核：团支书）",
    icon: Users,
    blocks: [
      { type: "line", text: "1. 此项 1.5 分起记，2.5 分满分。" },
      { type: "line", text: "2. 累计 3 次参加“青年大学习”主题团课加 0.2 分，以此类推。" },
      { type: "line", text: "3. 学校或院系的党团评议大会、团日活动，以及团学代表大会、学风建设主题班会、班干部培训会议、升旗仪式、新生入学教育等集会无故缺席 1 次扣 0.5 分，特殊情况请假不扣分（需辅导员同意）。" },
      { type: "line", text: "注：参加党校、团校培训不加分。" },
    ],
  },
  {
    id: "s5",
    title: "五、C 星级宿舍评比（满分 2.5 分，审核：生活委员）",
    icon: Home,
    blocks: [
      { type: "line", text: "1. 星级宿舍加分：五星级宿舍 2.5 分，四星级 2 分，三星级 1 分（以自律会公布的星级宿舍评比结果为准）。" },
      { type: "line", text: "2. 宿舍扣分：通报批评（喧闹、不按时熄灯等）宿舍每人扣 0.2 分；晚归个人扣 0.2 分；违规电器集体拥有每人扣 0.3 分、个人拥有扣 0.5 分。" },
      { type: "line", text: "3. 文明宿舍加分：获评文明宿舍全体宿舍成员各加 0.5 分。" },
    ],
  },
  {
    id: "s6",
    title: "六、D 文体活动（满分 5 分，审核：文体委员）",
    icon: Music,
    blocks: [
      { type: "line", text: "1. 参加学校一年一度的大型活动，校运会开/闭幕式，院/校运会方阵，校奖学金颁奖典礼：加 0.2 分/次。" },
      { type: "line", text: "2. 各球队、辩论队或其他队伍代表学院（学校）参加比赛未获奖加 0.3 分/次，获奖按名次加分。" },
      { type: "line", text: "3. 参加校、院文艺表演活动 0.3 分/次，参加过校、院文艺表演活动排练 0.2 分。" },
      { type: "line", text: "4. 参加学校、学院举行的阳光体育系列活动 0.5 分/次。" },
      { type: "line", text: "5. 参加校、院运动会，参与并获奖按名次加分，参与未获奖加 0.3 分/次。" },
      {
        type: "table",
        heads: ["名次", "院级", "校级", "省级", "国家级"],
        rows: [
          ["第一名", "1.5", "2", "2.5", "3"],
          ["第二名", "1", "1.5", "2", "2.5"],
          ["第三名", "0.5", "1", "1.5", "2"],
          ["第四-八名", "不加分", "0.5", "1", "1.5"],
        ],
      },
      { type: "line", text: "注：“文体活动”与“奖惩附加”这两项不重复加分。" },
    ],
  },
  {
    id: "s7",
    title: "七、E 社会实践、公益劳动（满分 5 分，审核：组织委员）",
    icon: Heart,
    blocks: [
      { type: "line", text: "1. 任暑假社会实践分队队长、召集人加 0.5 分。" },
      { type: "line", text: "2. 优秀社会实践分队的成员、镇区实践积极分子加 1 分；优秀社会实践分队的队长或召集人加 1.5 分；个人获校级社会实践积极分子称号加 2 分。" },
      { type: "line", text: "3. 参加志愿活动，志愿时长每 1 小时加 0.1 分，最高不能超过 3 分。" },
      { type: "line", text: "注：“社会实践、公益活动”与“奖惩附加”这两项不重复加分。" },
    ],
  },
  {
    id: "s8",
    title: "八、F1 奖惩附加 · 学生工作加分（满分 10 分，审核：班长）",
    icon: Users,
    blocks: [
      { type: "line", text: "兼任多职者可叠加，但不超过 3 个职位。辩论队、志愿队、球队等队伍不加分，若有出队参加比赛或任务按 D、E 项相应条目加分。" },
      {
        type: "table",
        heads: ["组织级别", "职位", "一学年", "一学期"],
        rows: [
          ["校级组织", "第一负责人", "4", "2"],
          ["校级组织", "其他负责人", "3.5", "1.7"],
          ["校级组织", "部门主要负责人", "2.5", "1.2"],
          ["校级组织", "部门其他负责人", "2.3", "1.1"],
          ["校级组织", "干事", "1.5", "0.7"],
          ["院级组织", "第一负责人", "3.8", "1.9"],
          ["院级组织", "非第一负责人", "3.5", "1.7"],
          ["院级组织", "部门主要负责人", "2.5", "1.2"],
          ["院级组织", "部门其他负责人", "2.3", "1.1"],
          ["院级组织", "干事", "1.5", "0.7"],
          ["党支部", "工作小组第一负责人", "2", "1"],
          ["党支部", "工作小组其他负责人", "1.5", "0.7"],
          ["班集体", "班长、团支书、学习委员", "2.5", "1.2"],
          ["班集体", "其他班委", "1.5", "0.7"],
          ["宿舍", "宿舍长、社区导生", "0.8", "0.4"],
          ["学生社团", "会长、副会长", "2.3", "1.1"],
          ["学生社团", "部长、副部长等", "1.5", "0.7"],
          ["勤工助学", "按学期计（满90h等条件）", "—", "1.1"],
        ],
      },
      { type: "line", text: "考评机制（仅校/院组织与班委适用）：组织可在基础分上按干事/干部一学年表现情况进行考评，获评优秀者原标准分数上加 0.5 分，获评合格者得到原标准分，考评不合格者在原标准分数上减 0.5 分。优秀、合格、不合格比例为总人数 30%、50%、20%，报送结果需在全院公示。" },
      { type: "line", text: "班委考评：全班给班委进行不记名投票（班委本身不投票），评选结果为班委人数的 30% 优秀、50% 合格、20% 不合格。" },
      { type: "line", text: "勤工助学：参与校内勤工助学岗位（不含临时岗），公益时长一学期达 90 小时，且薪资低于满薪的一半的同学均可获得学生干部加分，按学期计加 1.1 分，需提供薪资证明、具体上班时长且需用工单位指导老师签字盖章。" },
      { type: "line", text: "宿舍长/导生如获“优秀宿舍长”“优秀导生”称号，按荣誉称号类加分。会员、干事（社团）不加分。" },
    ],
  },
  {
    id: "s9",
    title: "九、F2 奖惩附加 · 竞赛获奖",
    icon: Trophy,
    blocks: [
      { type: "line", text: "1. 所有竞赛加分类型以文件【莞工〔2023〕59号】《东莞理工学院大学生学科竞赛管理办法（修订）》为准。A/B/C 类以《学科竞赛项目分类目录》为准，D 类以学院 D 类目录为准，E/F 类为除以上比赛外的校级、院级比赛。" },
      {
        type: "table",
        heads: ["类别", "一等奖", "二等奖", "三等奖", "备注"],
        rows: [
          ["A 类", "6", "5.5", "5", "其他依次减少 0.5"],
          ["B 类", "5", "4.5", "4", "其他依次减少 0.5"],
          ["C 类", "4", "3.5", "3", "其他依次减少 0.5"],
          ["D 类", "3", "2.5", "2", "其他依次减少 0.5"],
          ["E 类", "2", "1.5", "1", "往后不加分"],
          ["F 类", "1.5", "1", "0.5", "往后不加分"],
        ],
      },
      { type: "line", text: "2. 获得金奖（牌）、银奖（牌）、铜奖（牌）分别按一等奖、二等奖、三等奖进行计分；如比赛设有特等奖，则按照特等奖对应一等奖的奖项等级给予计分，以此类推。" },
      { type: "line", text: "3. 同个比赛加分不可累加，只取最高分（如在某比赛中获省级一等奖和国家级一等奖则只加国家级一等奖的分）；参加多个比赛，分数可叠加。" },
      {
        type: "table",
        heads: ["合作者数", "第1位", "第2位", "第3位", "第4位", "第5位", "第6位及以后"],
        rows: [
          ["2 人", "90%", "85%", "—", "—", "—", "—"],
          ["3 人", "80%", "75%", "70%", "—", "—", "—"],
          ["4 人", "70%", "65%", "60%", "55%", "—", "—"],
          ["5 人", "60%", "55%", "50%", "45%", "40%", "—"],
          ["≥6 人", "50%", "50%", "45%", "40%", "35%", "其余合作者 20%"],
        ],
      },
      { type: "line", text: "集体竞赛项目合作者排位、合作者数按照比赛获奖证书为准，若获奖证书排位不区分先后，由项目团队自行确定作者排位。加分计算公式：Σ 某项竞赛获奖赋分标准 × 获奖分值分配数。" },
    ],
  },
  {
    id: "s10",
    title: "十、F3 荣誉称号",
    icon: Medal,
    blocks: [
      { type: "line", text: "① 国家荣誉称号加 3 分，省级 2.5 分，市级 2 分。" },
      { type: "line", text: "② 学校优秀党员、优秀共青团员（干）、优秀志愿者、优秀学生骨干、优秀宿舍长等校级荣誉称号加 1 分。" },
    ],
  },
  {
    id: "s11",
    title: "十一、F4 科研奖励",
    icon: Award,
    blocks: [
      { type: "line", text: "① 向报社投稿并在学校（学报）上发表得奖：0.5 分（累计加分不超过 1 分）。" },
      { type: "line", text: "② 向东莞理工学院学报或校外其他学术期刊上发表论文：第一作者（含独著）2 分；第二作者 0.8 分（往后的按 0.2 分递减）。" },
      { type: "line", text: "③ 学校、学院征文比赛、课题调研获奖作品或个人：一等奖 1 分，二等奖 0.8 分，三等奖 0.5 分，优秀奖 0.25 分。" },
      { type: "line", text: "④ 课题调研（由老师组织开展）：市厅级获奖（主要成员加 2 分，其他成员由带队老师打分）；省级获奖（主要成员加 2.5 分，其他成员由带队老师打分）。" },
      { type: "line", text: "⑤ 专利奖：获得专利证明的，一项加 2 分，不重复加分。" },
      { type: "line", text: "注：以上加分项需提供电子版证明，无证明不加分。" },
    ],
  },
  {
    id: "s12",
    title: "十二、F5 惩罚扣分",
    icon: AlertTriangle,
    blocks: [
      { type: "line", text: "1. 受校留校察看处分的，扣 5 分/人次。" },
      { type: "line", text: "2. 受校记过处分的，扣 4 分/人次。" },
      { type: "line", text: "3. 受严重警告处分的，扣 3 分/人次。" },
      { type: "line", text: "4. 受警告处分的，扣 2 分/人次。" },
      { type: "line", text: "5. 被院级及以上通报批评的，扣 1 分/人次。" },
      { type: "line", text: "注意：兼得者累计扣分，但不大于 5 分；集体受罚其成员每人扣该等级分数；受校级党、团、行政处罚的不得参与任何奖学金评比。" },
    ],
  },
  {
    id: "s13",
    title: "十三、注意事项与流程",
    icon: FileText,
    blocks: [
      { type: "line", text: "1. 技能证书、培训证书（例如大学四六级、普通话、会计资格、驾驶证等类型）不加分。" },
      { type: "line", text: "2. 上一学年评奖评优所获的所有奖项与荣誉称号（如优秀大学生、优秀学生干部）都不可用于加分。" },
      { type: "line", text: "3. 各班须由班委会在该班级成员中成立评估小组，由 5-8 名本班学生或老师组成，小组成员应包含班长、团支书、学习委员等主要班委（班主任最好参与），且至少包含一名党员（没有党员的班级要求有发展对象或入党积极分子）和一名无担任班干部的同学。如发现虚报作假行为要追究评估小组的责任。" },
      { type: "line", text: "4. 评估小组负责核实和统计结果，每位同学必须配合评估小组的工作，并在公示期间核对信息签署通过。校级以上奖励的必须出示证明。" },
      { type: "line", text: "5. 本细则自 2024 年 1 月 1 日开始试行，本细则与上级文件不一致的，以上级文件为准；最终解释权归属学院评奖评优委员会。" },
    ],
  },
  {
    id: "s14",
    title: "十四、综测常见问题",
    icon: FileText,
    blocks: [
      { type: "line", text: "【时间范围】上一学年，如 2025-2026 学年综测的时间就是 2025.9.1 - 2026.9.1。" },
      { type: "line", text: "【课程范围】本学年开设的必修课和限选课必须算上（补考/重修的不算，0 学分课程如形势与政策不计入；形策不算挂科）；公选课不纳入测评科目。必修课和限选课数量太少时，可由班级委员会讨论制定计入综测的专业选修课（需公正公平公开、尽量保证每人计入课程相同或总学分相同）。" },
      { type: "line", text: "【挂科数目】按科目计算：初试挂科、补考挂科、重修挂科都算；同一科目多次挂科只算 1 门；只要有挂科记录，即使本学年补考/重修通过也算挂科；上一学年学的课程在本学年补考没过也计入本学年挂科数。" },
      { type: "line", text: "【缓考】综测材料上交前无法取得缓考成绩的，该科目暂不参与综测，其他科目正常参与，需在综测简表备注注明哪科缓考。" },
      { type: "line", text: "【转专业】学年第一学期末转专业的同学：综测在现班级进行，没有修过的课程不参与测评（同缓考），需在简表备注原因；学年第二学期末转专业的同学：综测在原来班级进行。" },
      { type: "line", text: "【获奖名额】人数向下取整。如全班 35 人、参评 29 人，一等奖名额 29×5%=1.45 → 1 名；只有全班全部参评才有最大名额（35 人全参评获奖名额 8 人，仅 29 人参评则 7 人）。" },
    ],
  },
]

const YEAR = "2025-2026"

export default function MobileZongceRulesPage() {
  const [openId, setOpenId] = useState<string | null>("s1")

  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id))

  return (
    <div className="mob-page" style={{ paddingBottom: 24 }}>
      <MobTopBar back title="综测细则" />

      <div style={{ padding: "4px 2px 0" }}>
        <div style={{ fontSize: 12, color: "var(--fg-3)", letterSpacing: "0.06em", lineHeight: 1.7 }}>
          依据《计算机科学与技术学院（网络空间安全学院）本科生综合测评细则【试行】》（计算机【2024】2号），2024 年 1 月 1 日起试行
        </div>
      </div>

      {SECTIONS.map(sec => {
        const IconComp = sec.icon
        const open = openId === sec.id
        return (
          <div key={sec.id} style={{ background: "var(--surface)", borderRadius: 16, boxShadow: "var(--shadow-card)", overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => toggle(sec.id)}
              aria-expanded={open}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", textAlign: "left" }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", flex: "none" }}>
                <IconComp size={16} />
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>{sec.title}</span>
              <ChevronDown size={18} style={{ color: "var(--fg-3)", flex: "none", transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms var(--mob-ease)" }} />
            </button>

            {open && (
              <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                <div style={{ paddingTop: 12 }}>
                  {sec.blocks.map((b, i) => {
                    if (b.type === "line") {
                      return (
                        <div key={i} style={{ fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.9, marginBottom: 8 }}>{b.text}</div>
                      )
                    }
                    return (
                      <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", margin: "8px 0 14px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                          <thead>
                            <tr style={{ background: "var(--surface-2)" }}>
                              {b.heads.map((h, hi) => (
                                <th key={hi} style={{ padding: "8px 8px", fontWeight: 700, color: "var(--primary)", textAlign: hi === 0 ? "left" : "center", borderBottom: "1px solid var(--border-strong)" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {b.rows.map((r, ri) => (
                              <tr key={ri} style={{ borderTop: ri === 0 ? "none" : "1px solid var(--border)" }}>
                                {r.map((c, ci) => (
                                  <td key={ci} style={{ padding: "7px 8px", textAlign: ci === 0 ? "left" : "center", color: ci === 0 ? "var(--fg)" : "var(--fg-2)", fontFamily: ci === 0 ? "inherit" : "var(--font-num)", fontSize: ci === 0 ? 13 : 12 }}>{c}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <div style={{ textAlign: "center", padding: "10px 16px 0", fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.04em" }}>
        以上为现行细则 · 如有调整以最新通知为准
      </div>
    </div>
  )
}
