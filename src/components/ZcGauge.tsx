"use client"

// 综测一体仪表盘 V2: 左侧深蓝总分块 + 右侧粗条形对比（S/M/T 带刻度格）
// 红线: 纯色, 无渐变, 无 Emoji
import AnimatedNumber from "./AnimatedNumber"

interface GaugeProps {
  sScore: number
  mScore: number
  totalScore: number
  gpa: number
  filled: number
  total: number
  sActive: boolean   // S 是否有有效数据
  mActive: boolean   // M 是否已开始填写
}

// 等级评定（按总分）
function getGrade(total: number) {
  if (total <= 0) return null
  if (total >= 110) return { label: "卓越", cls: "g-s" }
  if (total >= 90) return { label: "优秀", cls: "g-a" }
  if (total >= 70) return { label: "良好", cls: "g-b" }
  if (total >= 50) return { label: "合格", cls: "g-c" }
  return { label: "待完善", cls: "g-d" }
}

// 粗条形（带 4 格刻度）
function GaugeBar({ pct, tone, active }: { pct: number; tone: "s" | "m" | "t"; active: boolean }) {
  return (
    <span className={`btrack ${tone}`}>
      <i className={tone} style={{ width: `${pct * 100}%` }} />
      {active && <span className="ticks"><span /><span /><span /><span /></span>}
    </span>
  )
}

export default function ZcGauge(props: GaugeProps) {
  const { sScore, mScore, totalScore, gpa, filled, total, sActive, mActive } = props
  const tActive = sActive || mActive

  const sP = sActive ? Math.min(sScore / 100, 1) : 0
  const mP = mActive ? Math.min(mScore / 30, 1) : 0
  const tP = tActive ? Math.min(totalScore / 130, 1) : 0
  const grade = getGrade(totalScore)

  return (
    <div className="zc-gauge-wrap">
      {/* 左侧: 深蓝总分块 */}
      <div className="zc-gauge-total">
        <span className="lbl">综合素质总分</span>
        <div className="val">{tActive ? <AnimatedNumber value={totalScore} /> : "--"}</div>
        {grade && <span className={`zc-grade ${grade.cls}`}>{grade.label}</span>}
        <div className="sub">
          S {sActive ? sScore.toFixed(2) : "--"} + M {mActive ? mScore.toFixed(2) : "--"}
          <br />上限 130 · GPA {gpa > 0 ? gpa.toFixed(2) : "--"}
        </div>
      </div>

      {/* 右侧: 三行粗条形 */}
      <div className="zc-gauge-bars">
        <div className="brow">
          <div className="bhead">
            <div className="bname">学习 S</div>
            <div className="bsub">GPA {gpa > 0 ? gpa.toFixed(2) : "--"} · {filled}/{total} 门</div>
          </div>
          <GaugeBar pct={sP} tone="s" active={sActive} />
          <div className="bval">
            <div className="num">{sActive ? <AnimatedNumber value={sScore} /> : "--"}</div>
            <div className="max">/ 100</div>
          </div>
        </div>
        <div className="brow">
          <div className="bhead">
            <div className="bname">品行 M</div>
            <div className="bsub">A-F 六板块综合</div>
          </div>
          <GaugeBar pct={mP} tone="m" active={mActive} />
          <div className="bval">
            <div className="num">{mActive ? <AnimatedNumber value={mScore} showZero /> : "--"}</div>
            <div className="max">/ 30</div>
          </div>
        </div>
        <div className="brow">
          <div className="bhead">
            <div className="bname">总分 T</div>
            <div className="bsub">学业 + 品行综合</div>
          </div>
          <GaugeBar pct={tP} tone="t" active={tActive} />
          <div className="bval">
            <div className="num">{tActive ? <AnimatedNumber value={totalScore} /> : "--"}</div>
            <div className="max">/ 130</div>
          </div>
        </div>
      </div>
    </div>
  )
}
