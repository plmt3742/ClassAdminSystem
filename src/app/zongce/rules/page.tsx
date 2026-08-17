"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, BookOpen, Award, Trophy, Medal, Users, Home, Music, Heart, ClipboardCheck, FileText, AlertTriangle } from "lucide-react"

/* 综测细则参考页：依据《计算机科学与技术学院（网络空间安全学院）本科生综合测评细则【试行】》（计算机【2024】2号，2024年1月1日起试行） */
const S = {
  section: (title: string, children: React.ReactNode, icon?: React.ReactNode) => (
    <div className="card" style={{ background: "#fff", padding: "22px 26px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        {icon}
        <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>{title}</h2>
      </div>
      {children}
    </div>
  ),
  line: (text: string) => <div style={{ fontSize: ".8rem", color: "#556773", lineHeight: 1.9, marginBottom: 6 }}>{text}</div>,
  tbl: (heads: string[], rows: (string | number)[][], widths?: (string | number)[]) => (
    <div style={{ border: "1px solid #E8E3D9", borderRadius: 8, overflow: "hidden", margin: "10px 0 14px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".76rem" }}>
        <thead>
          <tr style={{ background: "#F9F8F5" }}>
            {heads.map((h, i) => <th key={i} style={{ padding: "8px 12px", fontWeight: 600, color: "#3D5A6E", textAlign: i === 0 ? "left" : "center", width: widths?.[i], borderBottom: "2px solid #E8E3D9" }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} style={{ borderTop: "1px solid #F1F0EC" }}>
              {r.map((c, ci) => <td key={ci} style={{ padding: "7px 12px", textAlign: ci === 0 ? "left" : "center", color: ci === 0 ? "#2B3A42" : "#556773", fontFamily: ci === 0 ? "inherit" : "'JetBrains Mono',monospace" }}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}

export default function ZongceRulesPage() {
  const router = useRouter()

  // ===== 移动版（设计稿 rules.html · 现有细则文本，≤640px 显示） =====
  const mono: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--color-accent-hover)" }
  const dim: React.CSSProperties = { color: "var(--color-muted)", fontSize: 11 }
  const ruleCard: React.CSSProperties = {
    background: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderLeft: "3px solid var(--color-accent)", borderRadius: 6, padding: "13px 14px",
  }
  const ruleLet: React.CSSProperties = {
    width: 26, height: 26, borderRadius: 6, flex: "none",
    background: "var(--color-accent-subtle)", color: "var(--color-accent)",
    fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  }
  const D_TABLE = [
    ["级别", "一等", "二等", "三等", "参与"],
    ["院", "1.5", "1", "0.5", "0"],
    ["校", "2", "1.5", "1", "0.5"],
    ["省", "2.5", "2", "1.5", "1"],
    ["国", "3", "2.5", "2", "1.5"],
  ]
  const mobileView = (
    <div className="m-page-root">
      <header className="m-topbar">
        <Link className="m-back" href="/zongce" aria-label="返回综测"><ArrowLeft size={18} /></Link>
        <span className="m-title">综测细则<small>RULES</small></span>
        <span className="m-year">2025-2026</span>
      </header>

      <section style={{ padding: "18px 16px 0" }}>
        <span style={{
          display: "flex", alignItems: "center", gap: 9,
          fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700,
          letterSpacing: ".18em", textTransform: "uppercase", color: "var(--color-muted)",
        }}>细则速查</span>

        {/* S 学习成绩 */}
        <div style={{ ...ruleCard, marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={ruleLet}>S</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 700 }}>学习成绩</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".1em", flex: "none" }}>GPA 换算</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-fg-secondary)", lineHeight: 1.75 }}>
            按学年 GPA 换算，公式 <span style={mono}>S = GPA × 35 × 70%</span>；GPA 以教务系统为准，学习委员负责汇总核对。
          </div>
        </div>

        {/* A 学风考勤 */}
        <div style={{ ...ruleCard, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={ruleLet}>A</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 700 }}>学风考勤</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".1em", flex: "none" }}>上限 5</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-fg-secondary)", lineHeight: 1.75 }}>
            旷课 <span style={mono}>-1.0</span> / 次 · 迟到、早退 <span style={mono}>-0.25</span> / 次；以课堂考勤记录为准，由班长负责核减。
          </div>
        </div>

        {/* B 集会政治学习 */}
        <div style={{ ...ruleCard, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={ruleLet}>B</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 700 }}>集会政治学习</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".1em", flex: "none" }}>上限 2.5</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-fg-secondary)", lineHeight: 1.75 }}>
            <span style={mono}>1.5</span> 起记；青年大学习按 <span style={mono}>3 期 +0.2</span> 累计；上限 <span style={mono}>2.5</span>，由团支书评定。
          </div>
        </div>

        {/* C 星级宿舍 */}
        <div style={{ ...ruleCard, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={ruleLet}>C</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 700 }}>星级宿舍</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".1em", flex: "none" }}>上限 2.5</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-fg-secondary)", lineHeight: 1.75 }}>
            五星 <span style={mono}>2.5</span> · 四星 <span style={mono}>2</span> · 三星 <span style={mono}>1</span>；文明宿舍另加 <span style={mono}>+0.5</span>，以宿管评定为准。
          </div>
        </div>

        {/* D 文体活动 */}
        <div style={{ ...ruleCard, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={ruleLet}>D</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 700 }}>文体活动</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".1em", flex: "none" }}>上限 5</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-fg-secondary)", lineHeight: 1.75 }}>按名次计分，同一项目取最高名次：</div>
          <div style={{ marginTop: 9, border: "1px solid var(--color-border)", borderRadius: 4, overflow: "hidden" }}>
            {D_TABLE.map((row, ri) => (
              <div key={ri} style={{ display: "grid", gridTemplateColumns: "44px repeat(4, 1fr)", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>
                {row.map((cell, ci) => (
                  <span key={ci} style={{
                    padding: "5px 6px", textAlign: ci === 0 ? "left" : "center", borderTop: ri === 0 ? "none" : "1px solid var(--color-border)",
                    background: ri === 0 ? "#F2F5F9" : ci === 0 ? "#F7F9FB" : "transparent",
                    color: ri === 0 ? "var(--color-fg-secondary)" : ci === 0 ? "var(--color-accent-hover)" : "inherit",
                    fontWeight: ri === 0 || ci === 0 ? 700 : 400,
                  }}>{cell}</span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* E 社会实践公益 */}
        <div style={{ ...ruleCard, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={ruleLet}>E</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 700 }}>社会实践公益</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".1em", flex: "none" }}>上限 3</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-fg-secondary)", lineHeight: 1.75 }}>
            志愿时长 <span style={mono}>0.1 / 小时</span>，封顶 <span style={mono}>3</span>；以志愿汇 / 志愿云记录为准，组织委员负责核对。
          </div>
        </div>

        {/* F 奖惩附加 */}
        <div style={{ ...ruleCard, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={ruleLet}>F</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 700 }}>奖惩附加</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".1em", flex: "none" }}>上限 10</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-fg-secondary)", lineHeight: 1.75 }}>
            F1 表彰奖励 · F2 荣誉称号 · F3 学科竞赛 · F4 违规违纪扣分 · F5 其他奖惩；<span style={dim}>须附佐证材料，上限 10 分。</span>
          </div>
        </div>
      </section>

      <div className="m-foot" style={{ textAlign: "center", padding: "22px 16px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-muted-light)", letterSpacing: ".08em" }}>
        以上为现行细则 · 如有调整以最新通知为准<br /><b style={{ color: "var(--color-muted)", fontWeight: 600 }}>综测细则</b> · 2025-2026 学年
      </div>
    </div>
  )

  return (
    <>
    {mobileView}
    <div className="rules-desktop">
    <main className="zc-wrap" style={{ maxWidth: 860 }}>
      <button className="btn-ghost" onClick={() => router.push("/zongce")} style={{ marginBottom: 20 }}>
        <ArrowLeft size={14} /> 返回综测
      </button>
      <div style={{ marginBottom: 20 }}>
        <div className="eyebrow">参考文档</div>
        <h1 className="display" style={{ display: "block" }}>综测评定细则（全文参考）</h1>
        <div style={{ fontSize: ".72rem", color: "#7A8A94", marginTop: 6, lineHeight: 1.8 }}>
          依据《计算机科学与技术学院（网络空间安全学院）本科生综合测评细则【试行】》（计算机【2024】2号），2024 年 1 月 1 日起试行
        </div>
      </div>

      {S.section("一、总则与公式", <>
        {S.line("① 学年平均学分绩点 ＝ Σ（课程成绩绩点×课程学分）÷ Σ课程学分。课程成绩绩点折算方法详见《学生手册》43 页。")}
        {S.line("② 综合测评总分（T）＝ 学习成绩得分（S）＋ 品行表现得分（M）。")}
        {S.line("③ 学习成绩得分（S）＝ 学年平均学分绩点 × 35 × 70％（任选课不计入学习成绩）。")}
        {S.line("④ 品行表现得分（M）＝ A ＋ B ＋ C ＋ D ＋ E ＋ F，品行表现分满 30 分，超出不计。")}
        {S.line("⑤ “校”指东莞理工学院，“院”指计算机科学与技术学院（网络空间安全学院）。以上成绩和品行表现分均针对上一学年（不涉及本学年）。")}
        {S.tbl(["百分制成绩", "绩点", "五级制", "绩点"], [
          ["90-100", "4.0-5.0（90→4.0，91→4.1…100→5.0）", "优秀", "4.5"],
          ["80-90", "3.0-4.0", "良好", "3.5"],
          ["70-80", "2.0-3.0", "中等", "2.5"],
          ["60-70", "1.0-2.0", "合格（及格）", "1.5"],
          ["60 以下", "0", "不及格", "0"],
        ], ["20%", "40%", "20%", "20%"])}
      </>, <BookOpen size={17} style={{ color: "#3D5A6E" }} />)}

      {S.section("二、S 学习成绩（审核：学习委员）", <>
        {S.line("以考试成绩为依据，即：本学年平均学分绩点 × 35 × 70%。注：任选课不计算在学习成绩里。")}
        {S.line("每学年初完成上一学年成绩登记并统计出此项分数。")}
      </>, <BookOpen size={17} style={{ color: "#3D5A6E" }} />)}

      {S.section("三、A 学风考勤（满分 5 分，审核：班长）", <>
        {S.line("1. 旷课 1 次扣 1 分。")}
        {S.line("2. 迟到 1 次扣 0.25 分。")}
        {S.line("3. 特殊情况请假不扣分，但需得到辅导员同意。")}
        {S.line("做好考勤记录，每节课后由任课老师签名，每月初把考勤表及有关请假条交院（系）办教学秘书处。")}
      </>, <ClipboardCheck size={17} style={{ color: "#3D5A6E" }} />)}

      {S.section("四、B 集会政治学习（满分 2.5 分，审核：团支书）", <>
        {S.line("1. 此项 1.5 分起记，2.5 分满分。")}
        {S.line("2. 累计 3 次参加“青年大学习”主题团课加 0.2 分，以此类推。")}
        {S.line("3. 学校或院系的党团评议大会、团日活动，以及团学代表大会、学风建设主题班会、班干部培训会议、升旗仪式、新生入学教育等集会无故缺席 1 次扣 0.5 分，特殊情况请假不扣分（需辅导员同意）。")}
        {S.line("注：参加党校、团校培训不加分。")}
      </>, <Users size={17} style={{ color: "#3D5A6E" }} />)}

      {S.section("五、C 星级宿舍评比（满分 2.5 分，审核：生活委员）", <>
        {S.line("1. 星级宿舍加分：五星级宿舍 2.5 分，四星级 2 分，三星级 1 分（以自律会公布的星级宿舍评比结果为准）。")}
        {S.line("2. 宿舍扣分：通报批评（喧闹、不按时熄灯等）宿舍每人扣 0.2 分；晚归个人扣 0.2 分；违规电器集体拥有每人扣 0.3 分、个人拥有扣 0.5 分。")}
        {S.line("3. 文明宿舍加分：获评文明宿舍全体宿舍成员各加 0.5 分。")}
      </>, <Home size={17} style={{ color: "#3D5A6E" }} />)}

      {S.section("六、D 文体活动（满分 5 分，审核：文体委员）", <>
        {S.line("1. 参加学校一年一度的大型活动，校运会开/闭幕式，院/校运会方阵，校奖学金颁奖典礼：加 0.2 分/次。")}
        {S.line("2. 各球队、辩论队或其他队伍代表学院（学校）参加比赛未获奖加 0.3 分/次，获奖按名次加分。")}
        {S.line("3. 参加校、院文艺表演活动 0.3 分/次，参加过校、院文艺表演活动排练 0.2 分。")}
        {S.line("4. 参加学校、学院举行的阳光体育系列活动 0.5 分/次。")}
        {S.line("5. 参加校、院运动会，参与并获奖按名次加分，参与未获奖加 0.3 分/次。")}
        {S.tbl(["名次", "院级", "校级", "省级", "国家级"], [
          ["第一名", "1.5", "2", "2.5", "3"],
          ["第二名", "1", "1.5", "2", "2.5"],
          ["第三名", "0.5", "1", "1.5", "2"],
          ["第四-八名", "不加分", "0.5", "1", "1.5"],
        ], ["20%", "20%", "20%", "20%", "20%"])}
        {S.line("注：“文体活动”与“奖惩附加”这两项不重复加分。")}
      </>, <Music size={17} style={{ color: "#3D5A6E" }} />)}

      {S.section("七、E 社会实践、公益劳动（满分 5 分，审核：组织委员）", <>
        {S.line("1. 任暑假社会实践分队队长、召集人加 0.5 分。")}
        {S.line("2. 优秀社会实践分队的成员、镇区实践积极分子加 1 分；优秀社会实践分队的队长或召集人加 1.5 分；个人获校级社会实践积极分子称号加 2 分。")}
        {S.line("3. 参加志愿活动，志愿时长每 1 小时加 0.1 分，最高不能超过 3 分。")}
        {S.line("注：“社会实践、公益活动”与“奖惩附加”这两项不重复加分。")}
      </>, <Heart size={17} style={{ color: "#3D5A6E" }} />)}

      {S.section("八、F1 奖惩附加 · 学生工作加分（满分 10 分，审核：班长）", <>
        {S.line("兼任多职者可叠加，但不超过 3 个职位。辩论队、志愿队、球队等队伍不加分，若有出队参加比赛或任务按 D、E 项相应条目加分。")}
        {S.tbl(["组织级别", "职位", "一学年", "一学期"], [
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
        ], ["18%", "42%", "20%", "20%"])}
        {S.line("考评机制（仅校/院组织与班委适用）：组织可在基础分上按干事/干部一学年表现情况进行考评，获评优秀者原标准分数上加 0.5 分，获评合格者得到原标准分，考评不合格者在原标准分数上减 0.5 分。优秀、合格、不合格比例为总人数 30%、50%、20%，报送结果需在全院公示。")}
        {S.line("班委考评：全班给班委进行不记名投票（班委本身不投票），评选结果为班委人数的 30% 优秀、50% 合格、20% 不合格。")}
        {S.line("勤工助学：参与校内勤工助学岗位（不含临时岗），公益时长一学期达 90 小时，且薪资低于满薪的一半的同学均可获得学生干部加分，按学期计加 1.1 分，需提供薪资证明、具体上班时长且需用工单位指导老师签字盖章。")}
        {S.line("宿舍长/导生如获“优秀宿舍长”“优秀导生”称号，按荣誉称号类加分。会员、干事（社团）不加分。")}
      </>, <Users size={17} style={{ color: "#3D5A6E" }} />)}

      {S.section("九、F2 奖惩附加 · 竞赛获奖", <>
        {S.line("1. 所有竞赛加分类型以文件【莞工〔2023〕59号】《东莞理工学院大学生学科竞赛管理办法（修订）》为准。A/B/C 类以《学科竞赛项目分类目录》为准，D 类以学院 D 类目录为准，E/F 类为除以上比赛外的校级、院级比赛。")}
        {S.tbl(["类别", "一等奖", "二等奖", "三等奖", "备注"], [
          ["A 类", "6", "5.5", "5", "其他依次减少 0.5"],
          ["B 类", "5", "4.5", "4", "其他依次减少 0.5"],
          ["C 类", "4", "3.5", "3", "其他依次减少 0.5"],
          ["D 类", "3", "2.5", "2", "其他依次减少 0.5"],
          ["E 类", "2", "1.5", "1", "往后不加分"],
          ["F 类", "1.5", "1", "0.5", "往后不加分"],
        ], ["15%", "17%", "17%", "17%", "34%"])}
        {S.line("2. 获得金奖（牌）、银奖（牌）、铜奖（牌）分别按一等奖、二等奖、三等奖进行计分；如比赛设有特等奖，则按照特等奖对应一等奖的奖项等级给予计分，以此类推。")}
        {S.line("3. 同个比赛加分不可累加，只取最高分（如在某比赛中获省级一等奖和国家级一等奖则只加国家级一等奖的分）；参加多个比赛，分数可叠加。")}
        {S.tbl(["合作者数", "第1位", "第2位", "第3位", "第4位", "第5位", "第6位及以后"], [
          ["2 人", "90%", "85%", "—", "—", "—", "—"],
          ["3 人", "80%", "75%", "70%", "—", "—", "—"],
          ["4 人", "70%", "65%", "60%", "55%", "—", "—"],
          ["5 人", "60%", "55%", "50%", "45%", "40%", "—"],
          ["≥6 人", "50%", "50%", "45%", "40%", "35%", "其余合作者 20%"],
        ], ["14%", "14%", "14%", "14%", "14%", "14%", "16%"])}
        {S.line("集体竞赛项目合作者排位、合作者数按照比赛获奖证书为准，若获奖证书排位不区分先后，由项目团队自行确定作者排位。加分计算公式：Σ 某项竞赛获奖赋分标准 × 获奖分值分配数。")}
      </>, <Trophy size={17} style={{ color: "#3D5A6E" }} />)}

      {S.section("十、F3 荣誉称号", <>
        {S.line("① 国家荣誉称号加 3 分，省级 2.5 分，市级 2 分。")}
        {S.line("② 学校优秀党员、优秀共青团员（干）、优秀志愿者、优秀学生骨干、优秀宿舍长等校级荣誉称号加 1 分。")}
      </>, <Medal size={17} style={{ color: "#3D5A6E" }} />)}

      {S.section("十一、F4 科研奖励", <>
        {S.line("① 向报社投稿并在学校（学报）上发表得奖：0.5 分（累计加分不超过 1 分）。")}
        {S.line("② 向东莞理工学院学报或校外其他学术期刊上发表论文：第一作者（含独著）2 分；第二作者 0.8 分（往后的按 0.2 分递减）。")}
        {S.line("③ 学校、学院征文比赛、课题调研获奖作品或个人：一等奖 1 分，二等奖 0.8 分，三等奖 0.5 分，优秀奖 0.25 分。")}
        {S.line("④ 课题调研（由老师组织开展）：市厅级获奖（主要成员加 2 分，其他成员由带队老师打分）；省级获奖（主要成员加 2.5 分，其他成员由带队老师打分）。")}
        {S.line("⑤ 专利奖：获得专利证明的，一项加 2 分，不重复加分。")}
        {S.line("注：以上加分项需提供电子版证明，无证明不加分。")}
      </>, <Award size={17} style={{ color: "#3D5A6E" }} />)}

      {S.section("十二、F5 惩罚扣分", <>
        {S.line("1. 受校留校察看处分的，扣 5 分/人次。")}
        {S.line("2. 受校记过处分的，扣 4 分/人次。")}
        {S.line("3. 受严重警告处分的，扣 3 分/人次。")}
        {S.line("4. 受警告处分的，扣 2 分/人次。")}
        {S.line("5. 被院级及以上通报批评的，扣 1 分/人次。")}
        {S.line("注意：兼得者累计扣分，但不大于 5 分；集体受罚其成员每人扣该等级分数；受校级党、团、行政处罚的不得参与任何奖学金评比。")}
      </>, <AlertTriangle size={17} style={{ color: "#C4615A" }} />)}

      {S.section("十三、注意事项与流程", <>
        {S.line("1. 技能证书、培训证书（例如大学四六级、普通话、会计资格、驾驶证等类型）不加分。")}
        {S.line("2. 上一学年评奖评优所获的所有奖项与荣誉称号（如优秀大学生、优秀学生干部）都不可用于加分。")}
        {S.line("3. 各班须由班委会在该班级成员中成立评估小组，由 5-8 名本班学生或老师组成，小组成员应包含班长、团支书、学习委员等主要班委（班主任最好参与），且至少包含一名党员（没有党员的班级要求有发展对象或入党积极分子）和一名无担任班干部的同学。如发现虚报作假行为要追究评估小组的责任。")}
        {S.line("4. 评估小组负责核实和统计结果，每位同学必须配合评估小组的工作，并在公示期间核对信息签署通过。校级以上奖励的必须出示证明。")}
        {S.line("5. 本细则自 2024 年 1 月 1 日开始试行，本细则与上级文件不一致的，以上级文件为准；最终解释权归属学院评奖评优委员会。")}
      </>, <FileText size={17} style={{ color: "#3D5A6E" }} />)}

      {S.section("十四、综测常见问题", <>
        {S.line("【时间范围】上一学年，如 2025-2026 学年综测的时间就是 2025.9.1 - 2026.9.1。")}
        {S.line("【课程范围】本学年开设的必修课和限选课必须算上（补考/重修的不算，0 学分课程如形势与政策不计入；形策不算挂科）；公选课不纳入测评科目。必修课和限选课数量太少时，可由班级委员会讨论制定计入综测的专业选修课（需公正公平公开、尽量保证每人计入课程相同或总学分相同）。")}
        {S.line("【挂科数目】按科目计算：初试挂科、补考挂科、重修挂科都算；同一科目多次挂科只算 1 门；只要有挂科记录，即使本学年补考/重修通过也算挂科；上一学年学的课程在本学年补考没过也计入本学年挂科数。")}
        {S.line("【缓考】综测材料上交前无法取得缓考成绩的，该科目暂不参与综测，其他科目正常参与，需在综测简表备注注明哪科缓考。")}
        {S.line("【转专业】学年第一学期末转专业的同学：综测在现班级进行，没有修过的课程不参与测评（同缓考），需在简表备注原因；学年第二学期末转专业的同学：综测在原来班级进行。")}
        {S.line("【获奖名额】人数向下取整。如全班 35 人、参评 29 人，一等奖名额 29×5%=1.45 → 1 名；只有全班全部参评才有最大名额（35 人全参评获奖名额 8 人，仅 29 人参评则 7 人）。")}
      </>, <FileText size={17} style={{ color: "#3D5A6E" }} />)}

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button className="btn-ghost" onClick={() => router.push("/zongce")} style={{ fontSize: ".75rem" }}>← 返回综测看板</button>
      </div>
    </main>
    </div>
    </>
  )
}
