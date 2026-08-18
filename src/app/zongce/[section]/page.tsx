"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Save, Send, Upload, User, Calendar, X, Lock, Undo2, Users, Home,
  PartyPopper, Dumbbell, Music, Clapperboard, Zap, Medal, Trophy, ChevronLeft, ChevronRight, Heart, Check,
  FileText, BookOpen, ClipboardCheck, Plus, Trash2, Star, Clock, FlaskConical, ShieldAlert,
} from "lucide-react"
import {
  calcWeightedGPA, calcSScore, calcAScore, calcBScore, calcCScore, calcDScore, calcEScore, calcFScore,
  scoreToGPA, gradeToGPA,
  F2_RANK_SCORES, F3_HONOR_SCORES, F5_PENALTY_SCORES, POSITION_PRESETS,
  SECTION_META, OPEN_SECTIONS, D_RANK_TABLE, FORM_LOCKED,
} from "@/lib/zongce-utils"

export default function SectionPage() {
  const params = useParams()
  const router = useRouter()
  const sectionKey = (params.section as string || "S").toUpperCase()
  const meta = SECTION_META[sectionKey]

  if (!meta) {
    return (
      <main className="zs-wrap">
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
        <div className="card" style={{ textAlign: "center", padding: "60px 40px", background: "#fff" }}>
          <p style={{ color: "#7A8A94" }}>无效的板块</p>
        </div>
      </main>
    )
  }

  if (!OPEN_SECTIONS.includes(sectionKey)) {
    return (
      <main className="zs-wrap">
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
        <div className="card" style={{ textAlign: "center", padding: "60px 40px", background: "#fff" }}>
          <Lock size={32} style={{ color: "#A8B4BD", marginBottom: 12 }} />
          <h2 style={{ marginBottom: 8 }}>{meta.label} · 暂未开放</h2>
          <p style={{ color: "#7A8A94", fontSize: ".88rem" }}>该板块正在开发中，敬请期待</p>
        </div>
      </main>
    )
  }

  return (
    <>
      <MobileSectionForm sectionKey={sectionKey} />
      <div className="section-desktop">
        {FORM_LOCKED && (
          <div style={{ marginBottom: 16, padding: "12px 18px", borderRadius: 6, border: "1px solid rgba(196,97,90,.35)", background: "rgba(196,97,90,.08)", color: "#C4615A", fontSize: ".88rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <Lock size={15} /> 综测填报已截止，本板块仅可查看，不可修改或提交
          </div>
        )}
        {sectionKey === "A" ? <SectionAForm /> : sectionKey === "B" ? <BView /> : sectionKey === "C" ? <CView /> : sectionKey === "D" ? <DForm /> : sectionKey === "E" ? <EForm /> : sectionKey === "F" ? <FForm /> : <SScoreForm />}
      </div>
    </>
  )
}

// ============================================================
// 移动版综测表单（设计稿 zongce-s/a/d/e/f.html · 真实 API）
// ============================================================
// f-* 前缀样式：延续 design-demos/mobile-app/mobile.css 冷色 tokens（映射到 globals.css --color-*）
const MOBILE_F_CSS = `
.f-input {
  width: 100%; height: 38px; padding: 0 10px;
  border: 1.5px solid #E3E7EB; border-radius: 8px;
  background: var(--color-surface); color: var(--color-fg);
  font-family: var(--font-mono); font-size: 14px; text-align: center;
  outline: none; appearance: none;
  transition: border-color .18s, box-shadow .18s;
}
.f-input:focus { border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(59,107,138,.12); }
.f-input::placeholder { color: var(--color-muted-light); font-size: 12px; }
.f-input:disabled { opacity: .55; }
.f-input.num { width: 72px; flex: none; }

.f-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 8px; padding: 14px 16px; margin: 12px 16px 0;
}
.f-card-title {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--font-display); font-size: 14px; font-weight: 700; color: var(--color-fg);
}
.f-card-title svg { width: 15px; height: 15px; color: var(--color-accent); stroke-width: 1.8; flex: none; }
.f-card-title .sec {
  font-family: var(--font-mono); font-size: 8.5px; color: var(--color-muted);
  font-weight: 400; letter-spacing: .1em; margin-left: auto;
}
.f-card-sub {
  font-family: var(--font-mono); font-size: 9px; color: var(--color-muted-light);
  letter-spacing: .08em; margin-top: 4px; margin-bottom: 6px;
}

.f-rule {
  display: flex; gap: 10px; align-items: flex-start;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-left: 2px solid var(--color-accent); border-radius: 8px;
  margin: 12px 16px 0; padding: 11px 13px;
}
.f-rule svg { width: 15px; height: 15px; color: var(--color-accent); flex: none; margin-top: 2px; }
.f-rule-txt { font-size: 12px; color: var(--color-fg-secondary); line-height: 1.6; }
.f-rule-txt b { color: var(--color-fg); font-weight: 600; }
.f-locked {
  display: flex; align-items: center; gap: 8px;
  margin: 10px 16px 0;
  padding: 10px 12px;
  border: 1px solid rgba(196,97,90,.35);
  border-radius: 8px;
  background: rgba(196,97,90,.08);
  color: #C4615A;
  font-size: 12.5px;
  font-weight: 600;
}
.f-locked svg { flex: none; }
.f-rule-txt .mono { font-family: var(--font-mono); font-size: 11px; color: var(--color-accent-hover); font-weight: 700; }

.f-field { padding: 9px 0; }
.f-field .lb { display: block; font-size: 12.5px; color: var(--color-fg-secondary); margin-bottom: 6px; }
.f-field .lb .mono { font-family: var(--font-mono); font-size: 9px; color: var(--color-muted); margin-left: 6px; letter-spacing: .05em; }
.f-hint { font-family: var(--font-mono); font-size: 9.5px; color: var(--color-muted); letter-spacing: .03em; padding-top: 4px; }

.f-scroll { max-height: 400px; overflow-y: auto; margin-top: 2px; }
.f-course { display: flex; align-items: center; gap: 8px; padding: 9px 0; border-bottom: 1px solid var(--color-border); }
.f-course:last-child { border-bottom: none; }
.f-course .nm { flex: 1; min-width: 0; font-size: 12.5px; color: var(--color-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-course .cr { font-family: var(--font-mono); font-size: 10px; color: var(--color-muted); flex: none; }
.f-course .score { width: 58px; height: 34px; flex: none; font-size: 12px; padding: 0 4px; }
.f-course .gpa { width: 50px; height: 34px; flex: none; font-size: 12px; padding: 0 4px; }
.f-rep {
  width: 34px; height: 34px; flex: none; border-radius: 8px;
  border: 1.5px solid var(--color-border-strong); background: var(--color-surface);
  color: var(--color-muted); font-family: var(--font-mono); font-size: 9px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.f-rep.on { background: #FDF5EA; border-color: #C7924B; color: #C7924B; }
.f-select {
  height: 34px; border: 1.5px solid #E3E7EB; border-radius: 8px;
  background: var(--color-surface); color: var(--color-fg);
  font-family: var(--font-mono); font-size: 11px; text-align: center;
  padding: 0 8px; outline: none; flex: none;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238A93A0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 7px center; background-size: 10px;
  padding-right: 22px;
}

.f-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
.f-row:last-child { border-bottom: none; }
.f-lab { flex: 1; min-width: 0; font-size: 13px; color: var(--color-fg); line-height: 1.45; }
.f-lab small { display: block; font-family: var(--font-mono); font-size: 9px; color: var(--color-muted); letter-spacing: .05em; margin-top: 2px; }
.f-note { font-family: var(--font-mono); font-size: 9.5px; color: var(--color-muted-light); letter-spacing: .03em; }

.f-switch { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--color-border); }
.f-switch:last-child { border-bottom: none; }
.f-switch .txt { flex: 1; min-width: 0; font-size: 13px; color: var(--color-fg); line-height: 1.45; }
.f-switch .txt .mono { font-family: var(--font-mono); font-size: 10px; color: var(--color-muted); display: block; letter-spacing: .03em; }
.f-switch .val { font-family: var(--font-mono); font-size: 11px; color: var(--color-accent-hover); flex: none; font-weight: 700; }

.f-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.f-chip {
  min-height: 38px; padding: 6px 14px; border-radius: 999px;
  border: 1.5px solid var(--color-border-strong); background: var(--color-surface);
  font-size: 12.5px; color: var(--color-fg-secondary); cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-ui);
  transition: background .18s, border-color .18s, color .18s;
}
.f-chip .mono { font-family: var(--font-mono); font-size: 10.5px; color: var(--color-muted); }
.f-chip.on { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
.f-chip.on .mono { color: rgba(255,255,255,.82); }
.f-chip:active { transform: scale(.97); }
.f-chip.sw { width: 56px; justify-content: center; font-size: 12px; }
.f-chip:disabled { opacity: .5; cursor: not-allowed; }

.f-item { padding: 11px 0; border-bottom: 1px solid var(--color-border); }
.f-item:last-child { border-bottom: none; }
.f-item-head { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.f-item-name { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; color: var(--color-fg); line-height: 1.45; }
.f-tag {
  font-family: var(--font-mono); font-size: 8.5px; color: var(--color-muted);
  border: 1px solid var(--color-border); border-radius: 999px; padding: 1px 8px; letter-spacing: .04em; flex: none;
}
.f-del {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: none; background: none;
  color: var(--color-muted-light); border-radius: 6px; flex: none; cursor: pointer;
}
.f-del svg { width: 15px; height: 15px; }
.f-del:active { background: var(--color-danger-bg); color: var(--color-danger); }
.f-item-foot { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.f-sub { flex: 1; min-width: 0; text-align: right; font-family: var(--font-mono); font-size: 12px; color: var(--color-muted); }
.f-sub b { color: var(--color-accent-hover); font-size: 14px; font-weight: 700; }
.f-sub.minus b { color: var(--color-danger); }

.f-add {
  width: 100%; min-height: 42px; margin-top: 10px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  border: 1.5px dashed var(--color-border-strong); border-radius: 8px;
  background: transparent; color: var(--color-muted);
  font-size: 13px; font-family: var(--font-ui); cursor: pointer;
  transition: border-color .18s, color .18s, background .18s;
}
.f-add svg { width: 15px; height: 15px; }
.f-add:active { border-color: var(--color-accent); color: var(--color-accent); background: var(--color-accent-subtle); }

.f-upload {
  border: 1.5px dashed var(--color-border-strong); border-radius: 8px;
  min-height: 92px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  color: var(--color-muted); font-size: 12px; cursor: pointer; padding: 14px;
  transition: border-color .18s, color .18s;
}
.f-upload svg { width: 22px; height: 22px; color: var(--color-muted-light); }
.f-upload:active { border-color: var(--color-accent); color: var(--color-accent); }
.f-upload small { font-family: var(--font-mono); font-size: 9px; color: var(--color-muted-light); letter-spacing: .05em; }
.f-thumbs { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
.f-thumb { width: 72px; flex: none; }
.f-thumb .pic {
  width: 72px; height: 72px; border-radius: 8px;
  background: #EEF1F5; border: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: center; color: var(--color-muted-light);
  overflow: hidden; position: relative;
}
.f-thumb .pic img { width: 100%; height: 100%; object-fit: cover; }
.f-thumb .pic .x {
  position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; border-radius: 50%;
  background: rgba(196,97,90,.9); color: #fff;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.f-thumb .nm {
  font-family: var(--font-mono); font-size: 7.5px; color: var(--color-muted);
  letter-spacing: .02em; margin-top: 4px; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; width: 72px; text-align: center;
}
.f-thumb .st { font-family: var(--font-mono); font-size: 7.5px; color: var(--color-success); letter-spacing: .04em; text-align: center; margin-top: 1px; }

.f-score { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.f-score .k { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .14em; color: var(--color-muted); text-transform: uppercase; }
.f-score .k .ln { display: block; font-family: var(--font-mono); font-size: 9px; color: var(--color-muted-light); letter-spacing: .03em; text-transform: none; margin-top: 5px; font-weight: 400; }
.f-score .v { font-family: var(--font-mono); font-size: 26px; font-weight: 700; color: var(--color-accent-hover); }
.f-score .v .max { font-size: 11px; color: var(--color-muted); font-weight: 400; }
.f-big { text-align: center; padding: 20px 16px; }
.f-big .k { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .16em; color: var(--color-muted); text-transform: uppercase; }
.f-big .v { font-family: var(--font-mono); font-size: 38px; font-weight: 700; color: var(--color-accent-hover); line-height: 1.15; margin-top: 6px; }
.f-big .v .max { font-size: 13px; color: var(--color-muted); font-weight: 400; }
.f-big .sub { font-family: var(--font-mono); font-size: 9.5px; color: var(--color-muted-light); letter-spacing: .08em; margin-top: 6px; }

.f-error {
  margin: 12px 16px 0; padding: 10px 13px; border-radius: 8px;
  border: 1px solid rgba(196,97,90,.4); background: #FDF3F2;
  color: #C4615A; font-size: 12px; line-height: 1.6;
}
.f-returned {
  margin: 12px 16px 0; padding: 11px 13px; border-radius: 8px;
  border: 1px solid rgba(196,97,90,.4); background: #FDF3F2;
  color: #C4615A; font-size: 12px; line-height: 1.6;
}
.f-returned-note { color: #8A4B45; font-size: 11.5px; margin-top: 4px; }

.f-foot {
  font-family: var(--font-mono); font-size: 9px; color: var(--color-muted-light);
  letter-spacing: .08em; text-align: center; padding: 20px 16px 8px; line-height: 1.7;
}
.f-foot b { color: var(--color-muted); font-weight: 700; }

.f-actions {
  position: fixed; left: 50%; transform: translateX(-50%);
  bottom: calc(56px + env(safe-area-inset-bottom));
  width: 100%; max-width: 480px;
  padding: 10px 16px;
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border-top: 1px solid var(--color-border);
  display: flex; flex-direction: column; gap: 8px; align-items: stretch; z-index: 150;
}
.f-auto {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  font-family: var(--font-mono); font-size: 9.5px; color: var(--color-muted); letter-spacing: .05em;
}
.f-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-success); flex: none; animation: f-pulse 2.6s ease-in-out infinite; }
.f-actions .btn-primary { width: 100%; min-height: 44px; font-size: 13.5px; }
.f-actions .f-ghost {
  flex: none; border: none; background: none; padding: 4px 6px;
  color: var(--color-muted); font-size: 12px; font-family: var(--font-ui); cursor: pointer;
  display: inline-flex; align-items: center; gap: 4px;
}
.f-actions .f-ghost:active { color: var(--color-accent); }
@keyframes f-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
`

// 移动版规则说明（延续设计稿 zongce-s/a/d/e/f.html 的一句话规则条）
const MOBILE_RULE: Record<string, string> = {
  S: "S = 平均学分绩点 × 35 × 70%，不含任选课；手填教务数值优先。",
  A: "满分 5 分；旷课一次扣 1 分，迟到一次扣 0.25 分；特殊情况请假（辅导员同意）不扣分。",
  B: "本板块由团支书评定填写，学生只读。1.5 分起记；青年大学习每 3 期 +0.2 分；优秀团员、党支部成员仅作标记。",
  C: "本板块由生活委员评定填写，学生只读。五星 2.5 / 四星 2 / 三星 1 分；获评文明宿舍 +0.5 分。",
  D: "满分 5 分；大型活动 +0.2/次、队伍参赛未获奖 +0.3、文艺表演 +0.3、排练 +0.2、阳光体育 +0.5、运动会参与未获奖 +0.3；获奖按 级别 × 名次 计分。",
  E: "满分 5 分；队长/召集人 +0.5、校级积极分子 +2、市级以上优秀志愿者 +1、优秀分队成员 +1 / 队长 +1.5；志愿时长 0.1/小时 封顶 3 分。",
  F: "上限 10 分；F1 学生工作 + F2 竞赛 + F3 荣誉 + F4 科研 − F5 惩罚。",
}

// 移动版表单框架：顶栏 + 规则条 + 内容 + 固定底栏（自动保存状态 + 提交审核）
function MFrame(props: {
  sectionKey: string
  children: React.ReactNode
  autoSave?: "idle" | "saving" | "saved" | "error"
  saving?: boolean
  currentStatus?: string
  reviewNote?: string
  error?: string
  onSubmit?: () => void
  onWithdraw?: () => void
}) {
  const router = useRouter()
  const meta = SECTION_META[props.sectionKey]
  const isLocked = FORM_LOCKED || props.currentStatus === "approved"
  const isSubmitted = props.currentStatus === "submitted"
  const autoTxt = FORM_LOCKED
    ? "综测填报已截止，内容仅供查看"
    : props.autoSave === "saving" ? "正在自动保存…"
      : props.autoSave === "saved" ? "已自动保存 · 草稿"
        : props.autoSave === "error" ? "自动保存失败"
          : "自动保存 · 草稿"
  return (
    <div className="m-page-root">
      <header className="m-topbar">
        <button className="m-back" onClick={() => router.push("/zongce")} aria-label="返回综测"><ArrowLeft size={18} /></button>
        <span className="m-title">{meta.label}<small>SECTION {props.sectionKey}</small></span>
        <span className="m-year">2025-2026</span>
      </header>

      {FORM_LOCKED && (
        <div className="f-locked fx-item" style={{ "--i": 0 } as React.CSSProperties}>
          <Lock size={14} /> 综测填报已截止，本板块仅可查看，不可修改或提交
        </div>
      )}

      <div className="f-rule fx-item" style={{ "--i": 0 } as React.CSSProperties}>
        <FileText size={15} />
        <div className="f-rule-txt">{MOBILE_RULE[props.sectionKey] || meta.rules.split("\n")[0]}</div>
      </div>

      {props.error && <div className="f-error fx-item" style={{ "--i": 1 } as React.CSSProperties}>{props.error}</div>}
      {props.currentStatus === "returned" && (
        <div className="f-returned fx-item" style={{ "--i": 1 } as React.CSSProperties}>
          退回修改，请修正后重新提交
          {props.reviewNote && <div className="f-returned-note">退回原因：{props.reviewNote}</div>}
        </div>
      )}

      {props.children}

      <div style={{ height: 176 }} />
      <div className="f-foot">综测 {props.sectionKey} 板块由 {meta.reviewer} 审核 · 数据每日 23:00 同步<br /><b>{meta.label}</b> · 2025-2026 学年</div>

      {props.onSubmit && (
        <div className="f-actions">
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", minHeight: 16 }}>
            <span className="f-auto"><i className="f-dot" />{autoTxt}</span>
            {isSubmitted && props.onWithdraw && (
              <button className="f-ghost" type="button" onClick={props.onWithdraw}><Undo2 size={13} /> 撤回修改</button>
            )}
          </div>
          <button className="btn-primary" type="button" onClick={props.onSubmit} disabled={isLocked || isSubmitted || props.saving}>
            {isLocked ? <>已通过审核</> : isSubmitted ? <>已提交 · 待审核</> : <><Send size={14} /> 提交审核</>}
          </button>
        </div>
      )}
    </div>
  )
}

// 移动版分派：S/A/B/C/D/E/F 各自表单（B/C 只读视图）
function MobileSectionForm({ sectionKey }: { sectionKey: string }) {
  return (
    <>
      <style>{MOBILE_F_CSS}</style>
      {sectionKey === "A" ? <MobileAForm />
        : sectionKey === "B" ? <MobileBView />
        : sectionKey === "C" ? <MobileCView />
        : sectionKey === "D" ? <MobileDForm />
        : sectionKey === "E" ? <MobileEForm />
        : sectionKey === "F" ? <MobileFForm />
        : <MobileSScoreForm />}
    </>
  )
}

const MOBILE_LOADING = (
  <div className="m-page-root">
    <header className="m-topbar">
      <span className="m-title">综测表单<small>LOADING</small></span>
      <span className="m-year">2025-2026</span>
    </header>
    <p style={{ textAlign: "center", padding: 60, color: "var(--color-muted)", fontSize: 13 }}>加载中...</p>
  </div>
)

// ============================================================
// 移动版 A 学风考勤（设计稿 zongce-a.html）
// ============================================================
function MobileAForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [absences, setAbsences] = useState(0)
  const [tardies, setTardies] = useState(0)
  const [specialLeaves, setSpecialLeaves] = useState(0)
  const [currentStatus, setCurrentStatus] = useState("not_started")
  const [reviewNote, setReviewNote] = useState("")
  const [autoSave, setAutoSave] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const initializedRef = useRef(false)
  const savingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLocked = currentStatus === "approved"
  const score = calcAScore(absences, tardies)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "A")
      if (existing) {
        setCurrentStatus(existing.status)
        setReviewNote(existing.reviewNote || "")
        try {
          const p = JSON.parse(existing.data || "{}")
          setAbsences(Number(p.absences) || 0)
          setTardies(Number(p.tardies) || 0)
          setSpecialLeaves(Number(p.specialLeaves) || 0)
        } catch { /* ignore */ }
      }
      setLoading(false)
      initializedRef.current = true
    }).catch(() => setLoading(false))
  }, [status])

  useEffect(() => {
    if (!initializedRef.current) return
    if (isLocked || currentStatus === "submitted") return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void saveDraft() }, 700)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [absences, tardies, specialLeaves])

  async function saveDraft() {
    if (savingRef.current) return
    savingRef.current = true
    setAutoSave("saving")
    try {
      const res = await fetch("/api/zongce/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "A", status: "draft", data: { absences, tardies, specialLeaves } }),
      })
      if (!res.ok) throw new Error("保存失败")
      setAutoSave("saved")
      refreshStatus()
    } catch { setAutoSave("error") } finally { savingRef.current = false }
  }

  const refreshStatus = () => {
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "A")
      if (existing) { setCurrentStatus(existing.status); setReviewNote(existing.reviewNote || "") }
    }).catch(() => {})
  }

  async function submit() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaving(true); setError("")
    const res = await fetch("/api/zongce/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "A", status: "submitted", data: { absences, tardies, specialLeaves } }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || "提交失败"); setSaving(false); return
    }
    router.push("/zongce")
  }

  async function withdraw() {
    setSaving(true)
    const res = await fetch("/api/zongce/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "A", status: "draft", data: { absences, tardies, specialLeaves } }),
    })
    if (res.ok) refreshStatus()
    setSaving(false)
  }

  if (status === "loading" || loading) return MOBILE_LOADING
  if (!session) return null

  return (
    <MFrame sectionKey="A" currentStatus={currentStatus} reviewNote={reviewNote} autoSave={autoSave} saving={saving} error={error} onSubmit={submit} onWithdraw={withdraw}>
      <div className="f-card fx-item" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="f-card-title"><ClipboardCheck size={15} /> 考勤记录</div>
        <div className="f-card-sub">以班级考勤台账为准 · 未发生则保持 0</div>
        <div className="f-row">
          <span className="f-lab">旷课次数<small>缺勤累计 · 每次 −1 分</small></span>
          <input className="f-input num" type="number" min={0} step={1} inputMode="numeric" value={absences} disabled={isLocked}
            onChange={e => setAbsences(Math.max(0, Number(e.target.value) || 0))} />
        </div>
        <div className="f-row">
          <span className="f-lab">迟到次数<small>迟到 / 早退累计 · 每次 −0.25 分</small></span>
          <input className="f-input num" type="number" min={0} step={1} inputMode="numeric" value={tardies} disabled={isLocked}
            onChange={e => setTardies(Math.max(0, Number(e.target.value) || 0))} />
        </div>
        <div className="f-row">
          <span className="f-lab">特殊情况请假<small>辅导员同意 · 不扣分</small></span>
          <input className="f-input num" type="number" min={0} step={1} inputMode="numeric" value={specialLeaves} disabled={isLocked}
            onChange={e => setSpecialLeaves(Math.max(0, Number(e.target.value) || 0))} />
        </div>
      </div>
      <div className="f-card f-big fx-item" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="k">当前得分</div>
        <div className="v">{score.toFixed(2)}<span className="max"> / 5</span></div>
        <div className="sub">
          {absences === 0 && tardies === 0
            ? "5 − 旷课×1 − 迟到×0.25"
            : `扣 ${(absences + tardies * 0.25).toFixed(2)} · 旷课 ${absences}×1 · 迟到 ${tardies}×0.25`}
        </div>
      </div>
      <div className="f-note fx-item" style={{ "--i": 3, padding: "10px 16px 0" } as React.CSSProperties}>请假不计入扣分 · 数据以辅导员考勤记录为准</div>
    </MFrame>
  )
}

// ============================================================
// 移动版 S 学习成绩（设计稿 zongce-s.html）
// ============================================================
function MobileSScoreForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<any[]>([])
  const [scores, setScores] = useState<any[]>([])
  const [gpaForm, setGpaForm] = useState({ sem1: "", sem2: "", year: "", total: "" })
  const [evidence, setEvidence] = useState<string[]>([])
  const [currentStatus, setCurrentStatus] = useState("not_started")
  const [reviewNote, setReviewNote] = useState("")
  const [autoSave, setAutoSave] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const initializedRef = useRef(false)
  const savingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLocked = currentStatus === "approved"

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/init", { method: "POST" }).catch(() => {}).then(() => loadData())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  async function loadData() {
    try {
      setLoading(true)
      const [cRes, sRes] = await Promise.all([fetch("/api/zongce/courses"), fetch("/api/zongce/sections")])
      const cData = await cRes.json(); const sData = await sRes.json()
      const courseList = cData.courses || []; const existingScores = sData.courseScores || []
      const merged = courseList.map((c: any) => {
        const found = existingScores.find((s: any) => s.courseId === c.id)
        return found || { courseId: c.id, course: c, score: null, grade: null, gpa: null, repeat: false }
      })
      setCourses(courseList); setScores(merged)
      const existing = (sData.sections || []).find((s: any) => s.section === "S")
      if (existing) {
        setCurrentStatus(existing.status)
        setReviewNote(existing.reviewNote || "")
        try { setEvidence(JSON.parse(existing.evidence || "[]")) } catch { setEvidence([]) }
        try {
          const d = JSON.parse(existing.data || "{}")
          setGpaForm({
            sem1: d.sem1Gpa != null && d.sem1Gpa !== "" ? String(d.sem1Gpa) : "",
            sem2: d.sem2Gpa != null && d.sem2Gpa !== "" ? String(d.sem2Gpa) : "",
            year: d.yearGpa != null && d.yearGpa !== "" ? String(d.yearGpa) : "",
            total: d.totalScore != null && d.totalScore !== "" ? String(d.totalScore) : "",
          })
        } catch { /* ignore */ }
      }
      setLoading(false)
      initializedRef.current = true
    } catch (e: any) { setError(e.message || "加载失败"); setLoading(false) }
  }

  function updateScore(cid: string, f: string, v: any) { setScores(p => p.map(s => s.courseId === cid ? { ...s, [f]: v ?? null } : s)) }

  useEffect(() => {
    if (!initializedRef.current) return
    if (isLocked || currentStatus === "submitted") return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void saveDraft() }, 800)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, gpaForm, evidence])

  async function saveDraft() {
    if (savingRef.current) return
    savingRef.current = true
    setAutoSave("saving")
    try {
      const changed = scores.filter((s: any) => s.score != null || s.gpa != null || s.grade)
      const [r1, r2] = await Promise.all([
        fetch("/api/zongce/scores", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scores: changed.map((s: any) => ({ courseId: s.courseId, score: s.score, grade: s.grade, gpa: s.gpa, repeat: s.repeat })) }) }),
        fetch("/api/zongce/sections", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section: "S", status: "draft", evidence, data: { sem1Gpa: gpaForm.sem1, sem2Gpa: gpaForm.sem2, yearGpa: gpaForm.year, totalScore: gpaForm.total } }) }),
      ])
      if (!r1.ok || !r2.ok) throw new Error("保存失败")
      setAutoSave("saved")
      refreshStatus()
    } catch { setAutoSave("error") } finally { savingRef.current = false }
  }

  const refreshStatus = () => {
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "S")
      if (existing) { setCurrentStatus(existing.status); setReviewNote(existing.reviewNote || "") }
    }).catch(() => {})
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) { alert("请上传图片文件"); return }
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      if (compressed.size > 5 * 1024 * 1024) { alert("图片处理后仍超过 5MB，请更换更小的图片"); return }
      const fd = new FormData(); fd.append("file", compressed)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || "上传失败"); return }
      setEvidence(prev => [...prev, d.url])
    } catch (err) { alert(err instanceof Error ? err.message : "上传失败，请重试") }
    finally { setUploading(false) }
  }

  async function submit() {
    if (timerRef.current) clearTimeout(timerRef.current)
    const missing = courses.filter(c => {
      const s = scores.find(x => x.courseId === c.id)
      const hasScore = s && (s.score != null || s.grade || s.gpa != null)
      return !hasScore
    })
    if (missing.length > 0) {
      setError(`还有 ${missing.length} 门课程未填写成绩（${missing.map(c => c.name).slice(0, 3).join("、")}${missing.length > 3 ? " 等" : ""}），请全部填完后再提交`)
      return
    }
    setError(""); setSaving(true)
    const changed = scores.filter((s: any) => s.score != null || s.gpa != null || s.grade)
    await fetch("/api/zongce/scores", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scores: changed.map((s: any) => ({ courseId: s.courseId, score: s.score, grade: s.grade, gpa: s.gpa, repeat: s.repeat })) }) })
    const res = await fetch("/api/zongce/sections", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section: "S", status: "submitted", evidence, data: { sem1Gpa: gpaForm.sem1, sem2Gpa: gpaForm.sem2, yearGpa: gpaForm.year, totalScore: gpaForm.total } }) })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || "提交失败"); setSaving(false); return
    }
    router.push("/zongce")
  }

  async function withdraw() {
    setSaving(true)
    await fetch("/api/zongce/sections", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section: "S", status: "draft", evidence, data: { sem1Gpa: gpaForm.sem1, sem2Gpa: gpaForm.sem2, yearGpa: gpaForm.year, totalScore: gpaForm.total } }) }).catch(() => {})
    refreshStatus()
    setSaving(false)
  }

  if (status === "loading" || loading) return MOBILE_LOADING
  if (error && courses.length === 0) return MOBILE_LOADING
  if (!session) return null

  const sem1 = scores.filter((s: any) => s.course?.semester === 1)
  const sem2 = scores.filter((s: any) => s.course?.semester === 2)
  const courseMeta = courses.map(c => ({ id: c.id, name: c.name, credits: c.credits, semester: c.semester, isElective: c.isElective }))
  const scoreMeta = scores.map(s => ({ courseId: s.courseId, score: s.score, grade: s.grade, gpa: s.gpa }))
  const wGPA = calcWeightedGPA(courseMeta, scoreMeta)
  const sScore = calcSScore(wGPA)
  const effYearGpa = gpaForm.year !== "" && Number(gpaForm.year) >= 0 ? Number(gpaForm.year) : wGPA
  const effTotal = gpaForm.total !== "" && Number(gpaForm.total) >= 0 ? Number(gpaForm.total) : sScore
  const filled = scores.filter((s: any) => s.score != null || s.grade != null || s.gpa != null).length

  const courseRow = (s: any) => {
    const c = s.course
    const isGrade = c && ["军事技能", "AI辅助程序设计实践"].includes(c.name)
    return (
      <div key={s.courseId} className="f-course">
        <span className="nm">{c?.name || s.courseId}</span>
        <span className="cr">{c?.credits} 学分</span>
        {isGrade ? (
          <select className="f-select" value={s.grade || ""} disabled={isLocked}
            onChange={e => updateScore(s.courseId, "grade", e.target.value || null)}>
            <option value="">—</option>
            {GRADE_OPTIONS.map(g => <option key={g.v} value={g.v}>{g.v}</option>)}
          </select>
        ) : (
          <input className="f-input score" type="number" min={0} max={100} step={0.5} inputMode="decimal" placeholder="0"
            value={s.score ?? ""} disabled={isLocked}
            onChange={e => {
              const v = e.target.value ? Number(e.target.value) : null
              setScores(p => p.map(x => {
                if (x.courseId !== s.courseId) return x
                // 填百分制时自动换算绩点（未手填绩点才覆盖）
                const autoGpa = v != null && v > 0 ? Math.round(scoreToGPA(v) * 100) / 100 : null
                return { ...x, score: v, gpa: x.gpa != null ? x.gpa : autoGpa }
              }))
            }} />
        )}
        <input className="f-input gpa" type="number" step={0.1} min={0} max={5} inputMode="decimal" placeholder="−"
          value={s.gpa ?? (s.score != null && s.score > 0 ? Math.round(scoreToGPA(s.score) * 100) / 100 : "")} disabled={isLocked}
          onChange={e => updateScore(s.courseId, "gpa", e.target.value ? Number(e.target.value) : null)} />
        <button type="button" className={`f-rep${s.repeat ? " on" : ""}`} disabled={isLocked || currentStatus === "submitted"}
          onClick={() => {
            const rep = !s.repeat
            setScores(p => p.map(x => {
              if (x.courseId !== s.courseId) return x
              if (rep) return { ...x, repeat: true, gpa: x.gpa != null ? x.gpa : 0 }
              return { ...x, repeat: false, ...(x.gpa === 0 && x.score == null && !x.grade ? { gpa: null } : {}) }
            }))
          }}>重修</button>
      </div>
    )
  }

  return (
    <MFrame sectionKey="S" currentStatus={currentStatus} reviewNote={reviewNote} autoSave={autoSave} saving={saving} error={error} onSubmit={submit} onWithdraw={withdraw}>
      <div className="f-card fx-item" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="f-card-title"><BookOpen size={15} /> 学年汇总</div>
        <div className="f-card-sub">{courses.length} 门课程 · 不含任选课</div>
        <div className="f-field">
          <label className="lb" htmlFor="m-s-gpa">学年平均绩点 GPA<span className="mono">0 - 5</span></label>
          <input className="f-input" id="m-s-gpa" type="number" min={0} max={5} step={0.01} inputMode="decimal"
            placeholder={wGPA > 0 ? wGPA.toFixed(2) : "3.62"} value={gpaForm.year} disabled={isLocked}
            onChange={e => setGpaForm(f => ({ ...f, year: e.target.value }))} />
        </div>
        <div className="f-field">
          <label className="lb" htmlFor="m-s-total">学年综测成绩总分<span className="mono">S · 自动计算</span></label>
          <input className="f-input" id="m-s-total" type="number" min={0} step={0.01} inputMode="decimal"
            placeholder={sScore > 0 ? sScore.toFixed(2) : "自动计算"} value={gpaForm.total} disabled={isLocked}
            onChange={e => setGpaForm(f => ({ ...f, total: e.target.value }))} />
        </div>
        <div className="f-hint">
          {gpaForm.year === "" ? "输入 GPA 后自动计算总分" : `GPA ${Number(gpaForm.year).toFixed(2)} × 35 × 70% ≈ ${(Number(gpaForm.year) * 35 * 0.7).toFixed(2)}`}
        </div>
      </div>

      {[1, 2].map(sem => {
        const list = sem === 1 ? sem1 : sem2
        if (list.length === 0) return null
        return (
          <div key={sem} className="f-card fx-item" style={{ "--i": sem + 1 } as React.CSSProperties}>
            <div className="f-card-title"><BookOpen size={15} /> 第{sem === 1 ? "一" : "二"}学期课程</div>
            <div className="f-card-sub">百分制 + 五级制 · 共 {list.length} 门课程</div>
            <div className="f-scroll">{list.map(courseRow)}</div>
          </div>
        )
      })}
      {courses.length === 0 && (
        <div className="f-card fx-item" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="f-note" style={{ textAlign: "center", padding: "22px 0" }}>暂未配置课程</div>
        </div>
      )}

      {!isLocked && (
        <div className="f-card fx-item" style={{ "--i": 4 } as React.CSSProperties}>
          <div className="f-card-title"><Upload size={15} /> 佐证照片</div>
          <div className="f-card-sub">成绩截图 · 压缩后自动上传</div>
          {evidence.length === 0 ? (
            <label className="f-upload">
              <Upload size={22} />{uploading ? "上传中…" : "上传佐证照片"}
              <small>JPG / PNG · 单张不超过 5MB</small>
              <input type="file" accept="image/*" className="zs-file-hide" disabled={uploading || isLocked} onChange={handleUpload} />
            </label>
          ) : (
            <div className="f-thumbs">
              {evidence.map((url, i) => (
                <div key={i} className="f-thumb">
                  <div className="pic">
                    <img src={url} alt={`佐证 ${i + 1}`} />
                    {!isLocked && <span className="x" onClick={() => setEvidence(evidence.filter((_, j) => j !== i))}><X size={10} /></span>}
                  </div>
                  <div className="nm">佐证 {i + 1}</div>
                  <div className="st">已上传</div>
                </div>
              ))}
              {!isLocked && (
                <label className="f-thumb" style={{ cursor: "pointer" }}>
                  <div className="pic" style={{ border: "2px dashed var(--color-border-strong)", background: "var(--color-surface)" }}>
                    <Upload size={20} />
                  </div>
                  <div className="nm">继续上传</div>
                  <input type="file" accept="image/*" className="zs-file-hide" disabled={uploading} onChange={handleUpload} />
                </label>
              )}
            </div>
          )}
        </div>
      )}

      <div className="f-card fx-item" style={{ "--i": 5 } as React.CSSProperties}>
        <div className="f-score">
          <div className="k">当前得分<span className="ln">已填 {filled}/{courses.length} 门 · 学年 GPA {effYearGpa > 0 ? effYearGpa.toFixed(2) : "--"}</span></div>
          <div className="v">{effTotal > 0 ? effTotal.toFixed(2) : "--"}<span className="max"> / 满分</span></div>
        </div>
      </div>
    </MFrame>
  )
}

// ============================================================
// 移动版 D 文体活动（设计稿 zongce-d.html）
// ============================================================
interface MobileDItem {
  key: string; type: string; name: string; date: string; level: string; rank: number; rankNote: string; photos: string[]; score?: number
}
const D_TYPE_SHORT: Record<string, string> = {
  ceremony: "大型活动", team_unranked: "队伍参赛", performance: "文艺表演",
  rehearsal: "排练", sports: "阳光体育", sports_unranked: "运动会参与", award: "获奖",
}

function MobileDForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<MobileDItem[]>([])
  const [currentStatus, setCurrentStatus] = useState("not_started")
  const [reviewNote, setReviewNote] = useState("")
  const [autoSave, setAutoSave] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const initializedRef = useRef(false)
  const savingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLocked = currentStatus === "approved"
  const totalScore = calcDScore(items.map(({ key, ...rest }) => rest))

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "D")
      if (existing) {
        setCurrentStatus(existing.status)
        setReviewNote(existing.reviewNote || "")
        try {
          const parsed = JSON.parse(existing.data || "{}")
          if (Array.isArray(parsed.items)) {
            setItems(parsed.items.map((it: any, i: number) => ({
              key: `k${Date.now()}-${i}`,
              type: it.type || "ceremony",
              name: it.name || "",
              date: it.date || "",
              level: it.level || "school",
              rank: Number(it.rank) || 1,
              rankNote: it.rankNote || "",
              photos: Array.isArray(it.photos) ? it.photos : [],
              score: it.score != null ? Number(it.score) : undefined,
            })))
          }
        } catch { /* ignore */ }
      }
      setLoading(false)
      initializedRef.current = true
    }).catch(() => setLoading(false))
  }, [status])

  useEffect(() => {
    if (!initializedRef.current) return
    if (isLocked || currentStatus === "submitted") return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void saveDraft() }, 700)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  async function saveDraft() {
    if (savingRef.current) return
    savingRef.current = true
    setAutoSave("saving")
    try {
      const res = await fetch("/api/zongce/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "D", status: "draft", data: { items: items.map(({ key, ...rest }) => rest) } }),
      })
      if (!res.ok) throw new Error("保存失败")
      setAutoSave("saved")
      refreshStatus()
    } catch { setAutoSave("error") } finally { savingRef.current = false }
  }

  const refreshStatus = () => {
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "D")
      if (existing) { setCurrentStatus(existing.status); setReviewNote(existing.reviewNote || "") }
    }).catch(() => {})
  }

  async function submit() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaving(true); setError("")
    const res = await fetch("/api/zongce/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "D", status: "submitted", data: { items: items.map(({ key, ...rest }) => rest) } }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || "提交失败"); setSaving(false); return
    }
    router.push("/zongce")
  }

  async function withdraw() {
    setSaving(true)
    const res = await fetch("/api/zongce/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "D", status: "draft", data: { items: items.map(({ key, ...rest }) => rest) } }),
    })
    if (res.ok) refreshStatus()
    setSaving(false)
  }

  async function handleItemUpload(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) { alert("请上传图片文件"); return }
    try {
      const compressed = await compressImage(file)
      if (compressed.size > 5 * 1024 * 1024) { alert("图片处理后仍超过 5MB，请更换更小的图片"); return }
      const fd = new FormData(); fd.append("file", compressed)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || "上传失败"); return }
      setItems(prev => prev.map(it => it.key === key ? { ...it, photos: [...(it.photos || []), d.url] } : it))
    } catch (err) { alert(err instanceof Error ? err.message : "上传失败，请重试") }
  }

  const updateItem = (key: string, patch: Partial<MobileDItem>) => {
    setItems(prev => prev.map(it => it.key === key ? { ...it, ...patch } : it))
  }

  const itemScore = (it: MobileDItem): number => {
    if (it.type === "award") {
      if (it.rank === 5) return it.score ?? 0
      return D_RANK_TABLE[it.level]?.[Math.min(Math.max(it.rank, 1), 4) - 1] ?? 0
    }
    return D_TYPES.find(t => t.v === it.type)?.score ?? 0
  }

  const awardTxt = (it: MobileDItem) => {
    if (it.rank === 5) return "其他 · " + (it.rankNote || "未注明")
    return (D_LEVELS.find(l => l.v === it.level)?.label || "") + " · " + (D_RANKS.find(r => r.v === it.rank)?.label || "")
  }

  if (status === "loading" || loading) return MOBILE_LOADING
  if (!session) return null

  return (
    <MFrame sectionKey="D" currentStatus={currentStatus} reviewNote={reviewNote} autoSave={autoSave} saving={saving} error={error} onSubmit={submit} onWithdraw={withdraw}>
      <div className="f-card fx-item" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="f-card-title"><Music size={15} /> 参与项目</div>
        <div className="f-card-sub">按实际参与填写 · 小计实时累加 · 满分 5 分</div>
        {items.length === 0 && <div className="f-note" style={{ textAlign: "center", padding: "22px 0 12px" }}>暂无项目 · 点击下方「添加项目」开始填写</div>}
        {items.map(it => (
          <div key={it.key} className="f-item">
            <div className="f-item-head">
              <span className="f-item-name">{it.name || D_TYPE_SHORT[it.type] || it.type}</span>
              <span className="f-tag">{D_TYPE_SHORT[it.type] || it.type}{it.type === "award" ? " · " + awardTxt(it) : ""}</span>
              {!isLocked && (
                <button type="button" className="f-del" aria-label="删除该项目" onClick={() => setItems(prev => prev.filter(x => x.key !== it.key))}><Trash2 size={15} /></button>
              )}
            </div>
            <div className="f-chips">
              {D_TYPES.map(t => (
                <button key={t.v} type="button" disabled={isLocked}
                  className={`f-chip${it.type === t.v ? " on" : ""}`}
                  onClick={() => updateItem(it.key, { type: t.v })}>
                  {t.label.split("（")[0]}
                </button>
              ))}
            </div>
            <div className="f-item-foot">
              <input className="f-input" placeholder="活动名称（如：校运会开幕式）" value={it.name} disabled={isLocked}
                onChange={e => updateItem(it.key, { name: e.target.value })}
                style={{ flex: 1, fontSize: 12.5, textAlign: "left" }} />
            </div>
            {it.type === "award" && (
              <>
                <div className="f-chips">
                  {D_LEVELS.map(l => (
                    <button key={l.v} type="button" disabled={isLocked}
                      className={`f-chip${it.level === l.v ? " on" : ""}`}
                      onClick={() => updateItem(it.key, { level: l.v })}>{l.label}</button>
                  ))}
                </div>
                <div className="f-chips">
                  {D_RANKS.map(r => (
                    <button key={r.v} type="button" disabled={isLocked}
                      className={`f-chip${it.rank === r.v ? " on" : ""}`}
                      onClick={() => updateItem(it.key, { rank: r.v })}>{r.label}</button>
                  ))}
                </div>
                {it.rank === 5 && (
                  <input className="f-input" placeholder="请注明具体奖项（如：特等奖）" value={it.rankNote} disabled={isLocked}
                    onChange={e => updateItem(it.key, { rankNote: e.target.value })}
                    style={{ marginTop: 8, fontSize: 12.5, textAlign: "left" }} />
                )}
              </>
            )}
            <div className="f-item-foot">
              <span className="f-note">
                {it.type === "award" && it.rank === 5
                  ? (it.score != null && it.score > 0 ? `审核确认 +${it.score.toFixed(2)}` : "其他名次 · 待审核确认")
                  : `+${itemScore(it).toFixed(2)} 分`}
              </span>
              <span className="f-sub">
                {it.type === "award" && it.rank === 5
                  ? (it.score != null && it.score > 0 ? `+ ${it.score.toFixed(2)}` : "待确认")
                  : <>= <b>+{itemScore(it).toFixed(2)}</b></>}
              </span>
            </div>
            <div className="f-thumbs">
              {(it.photos || []).map(url => (
                <div key={url} className="f-thumb">
                  <div className="pic">
                    <img src={url} alt="证明" />
                    {!isLocked && <span className="x" onClick={() => setItems(prev => prev.map(x => x.key === it.key ? { ...x, photos: (x.photos || []).filter(p => p !== url) } : x))}><X size={10} /></span>}
                  </div>
                  <div className="nm">证明</div>
                  <div className="st">已上传</div>
                </div>
              ))}
              {!isLocked && (
                <label className="f-thumb" style={{ cursor: "pointer" }}>
                  <div className="pic" style={{ border: "2px dashed var(--color-border-strong)", background: "var(--color-surface)" }}>
                    <Upload size={20} />
                  </div>
                  <div className="nm">上传证明</div>
                  <input type="file" accept="image/*" className="zs-file-hide" onChange={e => handleItemUpload(it.key, e)} />
                </label>
              )}
            </div>
          </div>
        ))}
        {!isLocked && (
          <button type="button" className="f-add" onClick={() => setItems(prev => [...prev, { key: "k" + Date.now() + "-" + Math.random().toString(36).slice(2, 7), type: "ceremony", name: "", date: "", level: "school", rank: 1, rankNote: "", photos: [] }])}>
            <Plus size={15} /> 添加项目
          </button>
        )}
      </div>

      <div className="f-card fx-item" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="f-score">
          <div className="k">当前得分<span className="ln">{items.length} 个项目 · 小计 {totalScore.toFixed(2)}</span></div>
          <div className="v">{totalScore.toFixed(2)}<span className="max"> / 5</span></div>
        </div>
      </div>
    </MFrame>
  )
}

// ============================================================
// 移动版 E 社会实践公益（设计稿 zongce-e.html）
// ============================================================
function MobileEForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ isCaptain: false, teamAward: "none", schoolLevelAward: false, cityVolunteer: false, volunteerHours: 0 })
  const [evidence, setEvidence] = useState<string[]>([])
  const [currentStatus, setCurrentStatus] = useState("not_started")
  const [reviewNote, setReviewNote] = useState("")
  const [autoSave, setAutoSave] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const initializedRef = useRef(false)
  const savingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLocked = currentStatus === "approved"
  const score = calcEScore(form)
  const hourBonus = Math.min(3, form.volunteerHours * 0.1)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "E")
      if (existing) {
        setCurrentStatus(existing.status)
        setReviewNote(existing.reviewNote || "")
        try { setEvidence(JSON.parse(existing.evidence || "[]")) } catch { setEvidence([]) }
        try {
          const p = JSON.parse(existing.data || "{}")
          setForm({
            isCaptain: !!p.isCaptain,
            teamAward: p.teamAward || "none",
            schoolLevelAward: !!p.schoolLevelAward,
            cityVolunteer: !!p.cityVolunteer,
            volunteerHours: Number(p.volunteerHours) || 0,
          })
        } catch { /* ignore */ }
      }
      setLoading(false)
      initializedRef.current = true
    }).catch(() => setLoading(false))
  }, [status])

  useEffect(() => {
    if (!initializedRef.current) return
    if (isLocked || currentStatus === "submitted") return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void saveDraft() }, 700)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, evidence])

  async function saveDraft() {
    if (savingRef.current) return
    savingRef.current = true
    setAutoSave("saving")
    try {
      const res = await fetch("/api/zongce/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "E", status: "draft", evidence, data: form }),
      })
      if (!res.ok) throw new Error("保存失败")
      setAutoSave("saved")
      refreshStatus()
    } catch { setAutoSave("error") } finally { savingRef.current = false }
  }

  const refreshStatus = () => {
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "E")
      if (existing) { setCurrentStatus(existing.status); setReviewNote(existing.reviewNote || "") }
    }).catch(() => {})
  }

  async function submit() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaving(true); setError("")
    const res = await fetch("/api/zongce/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "E", status: "submitted", evidence, data: form }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || "提交失败"); setSaving(false); return
    }
    router.push("/zongce")
  }

  async function withdraw() {
    setSaving(true)
    const res = await fetch("/api/zongce/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "E", status: "draft", evidence, data: form }),
    })
    if (res.ok) refreshStatus()
    setSaving(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) { alert("请上传图片文件"); return }
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      if (compressed.size > 5 * 1024 * 1024) { alert("图片处理后仍超过 5MB，请更换更小的图片"); return }
      const fd = new FormData(); fd.append("file", compressed)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || "上传失败"); return }
      setEvidence(prev => [...prev, d.url])
    } catch (err) { alert(err instanceof Error ? err.message : "上传失败，请重试") }
    finally { setUploading(false) }
  }

  if (status === "loading" || loading) return MOBILE_LOADING
  if (!session) return null

  const parts: string[] = []
  if (form.isCaptain) parts.push("队长 +0.5")
  if (form.teamAward === "member") parts.push("优秀成员 +1")
  if (form.teamAward === "captain") parts.push("优秀队长 +1.5")
  if (form.schoolLevelAward) parts.push("校级积极分子 +2")
  if (form.cityVolunteer) parts.push("优秀志愿者 +1")
  const breakTxt = parts.length ? parts.join(" · ") + ` · 志愿 +${hourBonus.toFixed(2)}` : "尚未选择 · 0.00"

  return (
    <MFrame sectionKey="E" currentStatus={currentStatus} reviewNote={reviewNote} autoSave={autoSave} saving={saving} error={error} onSubmit={submit} onWithdraw={withdraw}>
      <div className="f-card fx-item" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="f-card-title"><Heart size={15} /> 参与情况</div>
        <div className="f-card-sub">按实际情况开 / 关 · 可多选</div>
        <div className="f-switch">
          <span className="txt">担任社会实践分队队长 / 召集人<span className="mono">按学年内任职</span></span>
          <span className="val">+0.5</span>
          <button type="button" disabled={isLocked} className={`f-chip sw${form.isCaptain ? " on" : ""}`}
            onClick={() => setForm(f => ({ ...f, isCaptain: !f.isCaptain }))}>{form.isCaptain ? "开" : "关"}</button>
        </div>
        <div className="f-switch">
          <span className="txt">个人获校级社会实践积极分子<span className="mono">以表彰文件为准</span></span>
          <span className="val">+2</span>
          <button type="button" disabled={isLocked} className={`f-chip sw${form.schoolLevelAward ? " on" : ""}`}
            onClick={() => setForm(f => ({ ...f, schoolLevelAward: !f.schoolLevelAward }))}>{form.schoolLevelAward ? "开" : "关"}</button>
        </div>
        <div className="f-switch">
          <span className="txt">市级以上优秀志愿者<span className="mono">需上传 i 志愿截图佐证</span></span>
          <span className="val">+1</span>
          <button type="button" disabled={isLocked} className={`f-chip sw${form.cityVolunteer ? " on" : ""}`}
            onClick={() => setForm(f => ({ ...f, cityVolunteer: !f.cityVolunteer }))}>{form.cityVolunteer ? "开" : "关"}</button>
        </div>
      </div>

      <div className="f-card fx-item" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="f-card-title"><Medal size={15} /> 分队获奖</div>
        <div className="f-card-sub">单选 · 默认无</div>
        <div className="f-chips">
          <button type="button" disabled={isLocked} className={`f-chip${form.teamAward === "none" ? " on" : ""}`}
            onClick={() => setForm(f => ({ ...f, teamAward: "none" }))}>无</button>
          <button type="button" disabled={isLocked} className={`f-chip${form.teamAward === "member" ? " on" : ""}`}
            onClick={() => setForm(f => ({ ...f, teamAward: "member" }))}>优秀分队成员<span className="mono">+1</span></button>
          <button type="button" disabled={isLocked} className={`f-chip${form.teamAward === "captain" ? " on" : ""}`}
            onClick={() => setForm(f => ({ ...f, teamAward: "captain" }))}>优秀分队队长或召集人<span className="mono">+1.5</span></button>
        </div>
      </div>

      <div className="f-card fx-item" style={{ "--i": 3 } as React.CSSProperties}>
        <div className="f-card-title"><Clock size={15} /> 志愿时长</div>
        <div className="f-card-sub">两学期总时长 · i 志愿平台记录为准</div>
        <div className="f-row">
          <span className="f-lab">志愿时长（小时）<small>0.1 分 / 小时 · 封顶 3 分</small></span>
          <input className="f-input num" type="number" min={0} step={0.5} inputMode="decimal" value={form.volunteerHours} disabled={isLocked}
            onChange={e => setForm(f => ({ ...f, volunteerHours: Math.max(0, Math.round(Number(e.target.value) || 0)) }))}
            style={{ width: 96 }} />
        </div>
        <div className="f-hint">{form.volunteerHours.toFixed(1)} 小时 × 0.1 = +{hourBonus.toFixed(2)}（封顶 3）</div>
      </div>

      <div className="f-card fx-item" style={{ "--i": 4 } as React.CSSProperties}>
        <div className="f-card-title"><Upload size={15} /> 佐证照片</div>
        <div className="f-card-sub">i 志愿截图 · 志愿服务证明</div>
        {evidence.length === 0 ? (
          <label className="f-upload">
            <Upload size={22} />{uploading ? "上传中…" : "上传佐证照片（压缩后自动上传）"}
            <small>i 志愿截图 · 单张不超过 5MB</small>
            <input type="file" accept="image/*" className="zs-file-hide" disabled={uploading || isLocked} onChange={handleUpload} />
          </label>
        ) : (
          <div className="f-thumbs">
            {evidence.map((url, i) => (
              <div key={i} className="f-thumb">
                <div className="pic">
                  <img src={url} alt={`佐证 ${i + 1}`} />
                  {!isLocked && <span className="x" onClick={() => setEvidence(evidence.filter((_, j) => j !== i))}><X size={10} /></span>}
                </div>
                <div className="nm">佐证 {i + 1}</div>
                <div className="st">已上传</div>
              </div>
            ))}
            {!isLocked && (
              <label className="f-thumb" style={{ cursor: "pointer" }}>
                <div className="pic" style={{ border: "2px dashed var(--color-border-strong)", background: "var(--color-surface)" }}>
                  <Upload size={20} />
                </div>
                <div className="nm">继续上传</div>
                <input type="file" accept="image/*" className="zs-file-hide" disabled={uploading} onChange={handleUpload} />
              </label>
            )}
          </div>
        )}
      </div>

      <div className="f-card fx-item" style={{ "--i": 5 } as React.CSSProperties}>
        <div className="f-score">
          <div className="k">当前得分<span className="ln">{breakTxt}</span></div>
          <div className="v">{score.toFixed(2)}<span className="max"> / 5</span></div>
        </div>
      </div>
    </MFrame>
  )
}

// ============================================================
// 移动版 F 奖惩附加（设计稿 zongce-f.html · F1-F5 五组 chips）
// ============================================================
interface MobileF1Item { key: string; position: string; duration: string; evaluation: string; photos: string[] }
interface MobileF2Item { key: string; name: string; category: string; rank: number; isTeam: boolean; teamSize: number; position: number; photos: string[] }
interface MobileF3Item { key: string; level: string; name: string; photos: string[] }
interface MobileF4Item { key: string; type: string; detail: string; rank: number; level: string; photos: string[] }
interface MobileF5Item { key: string; type: string; count: number }
const F4_SHORT: Record<string, string> = { newspaper: "校报文章", journal: "期刊论文", essay: "征文/课题", research: "课题调研", patent: "专利" }

function MobileFForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [f1, setF1] = useState<MobileF1Item[]>([])
  const [f2, setF2] = useState<MobileF2Item[]>([])
  const [f3, setF3] = useState<MobileF3Item[]>([])
  const [f4, setF4] = useState<MobileF4Item[]>([])
  const [f5, setF5] = useState<MobileF5Item[]>([])
  const [currentStatus, setCurrentStatus] = useState("not_started")
  const [reviewNote, setReviewNote] = useState("")
  const [autoSave, setAutoSave] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const initializedRef = useRef(false)
  const savingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLocked = currentStatus === "approved"
  const strip = {
    f1: f1.map(({ key, photos, ...rest }) => rest),
    f2: f2.map(({ key, photos, ...rest }) => rest),
    f3: f3.map(({ key, photos, ...rest }) => rest),
    f4: f4.map(({ key, photos, ...rest }) => rest),
    f5: f5.map(({ key, ...rest }) => rest),
  }
  const score = calcFScore(strip)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "F")
      if (existing) {
        setCurrentStatus(existing.status)
        setReviewNote(existing.reviewNote || "")
        try {
          const p = JSON.parse(existing.data || "{}")
          const map = (arr: any[]) => arr.map((it: any) => ({ key: kf(), ...it }))
          setF1(map(p.f1 || [])); setF2(map(p.f2 || [])); setF3(map(p.f3 || [])); setF4(map(p.f4 || [])); setF5(map(p.f5 || []))
        } catch { /* ignore */ }
      }
      setLoading(false)
      initializedRef.current = true
    }).catch(() => setLoading(false))
  }, [status])

  useEffect(() => {
    if (!initializedRef.current) return
    if (isLocked || currentStatus === "submitted") return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void saveDraft() }, 700)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f1, f2, f3, f4, f5])

  async function saveDraft() {
    if (savingRef.current) return
    savingRef.current = true
    setAutoSave("saving")
    try {
      const res = await fetch("/api/zongce/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "F", status: "draft",
          data: { f1: f1.map(({ key, ...rest }) => rest), f2: f2.map(({ key, ...rest }) => rest), f3: f3.map(({ key, ...rest }) => rest), f4: f4.map(({ key, ...rest }) => rest), f5: f5.map(({ key, ...rest }) => rest) },
        }),
      })
      if (!res.ok) throw new Error("保存失败")
      setAutoSave("saved")
      refreshStatus()
    } catch { setAutoSave("error") } finally { savingRef.current = false }
  }

  const refreshStatus = () => {
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "F")
      if (existing) { setCurrentStatus(existing.status); setReviewNote(existing.reviewNote || "") }
    }).catch(() => {})
  }

  async function submit() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaving(true); setError("")
    const res = await fetch("/api/zongce/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "F", status: "submitted",
        data: { f1: f1.map(({ key, ...rest }) => rest), f2: f2.map(({ key, ...rest }) => rest), f3: f3.map(({ key, ...rest }) => rest), f4: f4.map(({ key, ...rest }) => rest), f5: f5.map(({ key, ...rest }) => rest) },
      }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || "提交失败"); setSaving(false); return
    }
    router.push("/zongce")
  }

  async function withdraw() {
    setSaving(true)
    const res = await fetch("/api/zongce/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "F", status: "draft",
        data: { f1: f1.map(({ key, ...rest }) => rest), f2: f2.map(({ key, ...rest }) => rest), f3: f3.map(({ key, ...rest }) => rest), f4: f4.map(({ key, ...rest }) => rest), f5: f5.map(({ key, ...rest }) => rest) },
      }),
    })
    if (res.ok) refreshStatus()
    setSaving(false)
  }

  const f1Groups = useMemo(() => {    const g: { category: string; options: { type: string; label: string; year: number; sem: number }[] }[] = []
    for (const p of POSITION_PRESETS) {
      let grp = g.find(x => x.category === p.category)
      if (!grp) { grp = { category: p.category, options: [] }; g.push(grp) }
      grp.options.push({ type: p.type, label: p.label, year: p.yearScore, sem: p.semScore })
    }
    return g
  }, [])

  const f1ItemScore = (it: MobileF1Item) => {
    const p = POSITION_PRESETS.find(x => x.type === it.position)
    if (!p) return 0
    let s = it.duration === "sem" ? p.semScore : p.yearScore
    if (it.evaluation === "excellent") s += 0.5
    else if (it.evaluation === "fail") s -= 0.5
    return Math.max(0, s)
  }
  const f2ItemScore = (it: MobileF2Item) => {
    const r = it.rank === 0 ? 1 : it.rank
    const base = F2_RANK_SCORES[it.category]?.[Math.min(Math.max(r, 1), 3) - 1] ?? 0
    if (!it.isTeam) return base
    const size = Math.min(Math.max(it.teamSize, 1), 8)
    const pos = Math.min(Math.max(it.position, 1), size)
    let coef = 0.2
    if (size >= 6) coef = [0.5, 0.5, 0.45, 0.4, 0.35, 0.2][Math.min(pos, 6) - 1] ?? 0.2
    else coef = ({ 2: [0.9, 0.85], 3: [0.8, 0.75, 0.7], 4: [0.7, 0.65, 0.6, 0.55], 5: [0.6, 0.55, 0.5, 0.45, 0.4] } as Record<number, number[]>)[size]?.[pos - 1] ?? 0.2
    return base * coef
  }
  const f1Sum = calcFScore({ f1: strip.f1 })
  const f2Sum = calcFScore({ f2: strip.f2 })
  const f3Sum = calcFScore({ f3: strip.f3 })
  const f4Sum = calcFScore({ f4: strip.f4 })
  let f5Sum = 0
  for (const p of f5) f5Sum += (F5_PENALTY_SCORES[p.type] || 0) * (p.count || 1)
  f5Sum = Math.min(5, f5Sum)

  if (status === "loading" || loading) return MOBILE_LOADING
  if (!session) return null

  return (
    <MFrame sectionKey="F" currentStatus={currentStatus} reviewNote={reviewNote} autoSave={autoSave} saving={saving} error={error} onSubmit={submit} onWithdraw={withdraw}>
      {/* F1 学生工作 */}
      <div className="f-card fx-item" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="f-card-title"><User size={15} /> F1 学生工作<span className="sec">+</span></div>
        <div className="f-card-sub">学干任职 · 最多叠加 3 个职位</div>
        {f1.length === 0 && <div className="f-note" style={{ textAlign: "center", padding: "22px 0 12px" }}>暂无职位记录</div>}
        {f1.map(it => {
          const pos = POSITION_PRESETS.find(x => x.type === it.position)
          const cat = pos?.category || ""
          const grp = f1Groups.find(g => g.category === cat)
          return (
            <div key={it.key} className="f-item">
              <div className="f-item-head">
                <span className="f-item-name">{pos?.label || "未选职位"}</span>
                <span className="f-tag">F1 · 学年</span>
                {!isLocked && (
                  <button type="button" className="f-del" aria-label="删除该职位" onClick={() => setF1(prev => prev.filter(x => x.key !== it.key))}><Trash2 size={15} /></button>
                )}
              </div>
              <div className="f-chips">
                {f1Groups.map(g => (
                  <button key={g.category} type="button" disabled={isLocked}
                    className={`f-chip${cat === g.category ? " on" : ""}`}
                    onClick={() => setF1(prev => prev.map(x => x.key === it.key ? { ...x, position: g.options[0]?.type || "", duration: g.category === "勤工助学" ? "sem" : x.duration } : x))}>
                    {g.category}
                  </button>
                ))}
              </div>
              {grp && (
                <div className="f-chips">
                  {grp.options.map(o => (
                    <button key={o.type} type="button" disabled={isLocked}
                      className={`f-chip${it.position === o.type ? " on" : ""}`}
                      onClick={() => setF1(prev => prev.map(x => x.key === it.key ? { ...x, position: o.type } : x))}>{o.label}</button>
                  ))}
                </div>
              )}
              <div className="f-chips">
                {cat === "勤工助学" ? (
                  <span className="f-chip on">按学期计 1.1 分</span>
                ) : (
                  <>
                    <button type="button" disabled={isLocked} className={`f-chip${it.duration === "year" ? " on" : ""}`}
                      onClick={() => setF1(prev => prev.map(x => x.key === it.key ? { ...x, duration: "year" } : x))}>一学年</button>
                    <button type="button" disabled={isLocked} className={`f-chip${it.duration === "sem" ? " on" : ""}`}
                      onClick={() => setF1(prev => prev.map(x => x.key === it.key ? { ...x, duration: "sem" } : x))}>一学期</button>
                  </>
                )}
                {F1_EVAL_CATEGORIES.includes(cat) && (
                  <>
                    <button type="button" disabled={isLocked} className={`f-chip${it.evaluation === "pass" ? " on" : ""}`}
                      onClick={() => setF1(prev => prev.map(x => x.key === it.key ? { ...x, evaluation: "pass" } : x))}>考评合格</button>
                    <button type="button" disabled={isLocked} className={`f-chip${it.evaluation === "excellent" ? " on" : ""}`}
                      onClick={() => setF1(prev => prev.map(x => x.key === it.key ? { ...x, evaluation: "excellent" } : x))}>考评优秀 +0.5</button>
                    <button type="button" disabled={isLocked} className={`f-chip${it.evaluation === "fail" ? " on" : ""}`}
                      onClick={() => setF1(prev => prev.map(x => x.key === it.key ? { ...x, evaluation: "fail" } : x))}>考评不合格 −0.5</button>
                  </>
                )}
              </div>
              <div className="f-item-foot">
                <span className="f-note">{cat}{it.duration === "sem" ? " · 一学期" : " · 一学年"}</span>
                <span className="f-sub">+ <b>{f1ItemScore(it).toFixed(2)}</b></span>
              </div>
            </div>
          )
        })}
        {!isLocked && (
          <button type="button" className="f-add" onClick={() => setF1(prev => [...prev, { key: kf(), position: "", duration: "year", evaluation: "pass", photos: [] }])}>
            <Plus size={15} /> 添加职位
          </button>
        )}
      </div>

      {/* F2 竞赛 */}
      <div className="f-card fx-item" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="f-card-title"><Trophy size={15} /> F2 竞赛<span className="sec">+</span></div>
        <div className="f-card-sub">学科竞赛获奖 · 类别 × 名次 × 个人/团队</div>
        {f2.length === 0 && <div className="f-note" style={{ textAlign: "center", padding: "22px 0 12px" }}>暂无竞赛记录</div>}
        {f2.map(it => (
          <div key={it.key} className="f-item">
            <div className="f-item-head">
              <span className="f-item-name">{it.name || "竞赛项目"}</span>
              <span className="f-tag">F2 · 竞赛</span>
              {!isLocked && (
                <button type="button" className="f-del" aria-label="删除该项目" onClick={() => setF2(prev => prev.filter(x => x.key !== it.key))}><Trash2 size={15} /></button>
              )}
            </div>
            <div className="f-item-foot">
              <input className="f-input" placeholder="竞赛名称（如：数学建模）" value={it.name} disabled={isLocked}
                onChange={e => setF2(prev => prev.map(x => x.key === it.key ? { ...x, name: e.target.value } : x))}
                style={{ flex: 1, fontSize: 12.5, textAlign: "left" }} />
            </div>
            <div className="f-chips">
              {F2_CATEGORIES.map(c => (
                <button key={c.v} type="button" disabled={isLocked} className={`f-chip${it.category === c.v ? " on" : ""}`}
                  onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, category: c.v } : x))}>{c.label}</button>
              ))}
            </div>
            <div className="f-chips">
              <button type="button" disabled={isLocked} className={`f-chip${it.rank === 0 ? " on" : ""}`}
                onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, rank: 0 } : x))}>特等奖<span className="mono">按一等</span></button>
              {[1, 2, 3].map(r => (
                <button key={r} type="button" disabled={isLocked} className={`f-chip${it.rank === r ? " on" : ""}`}
                  onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, rank: r } : x))}>
                  {({ 1: "一等奖", 2: "二等奖", 3: "三等奖" } as Record<number, string>)[r]}
                </button>
              ))}
            </div>
            <div className="f-chips">
              <button type="button" disabled={isLocked} className={`f-chip${!it.isTeam ? " on" : ""}`}
                onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, isTeam: false } : x))}>个人</button>
              <button type="button" disabled={isLocked} className={`f-chip${it.isTeam ? " on" : ""}`}
                onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, isTeam: true } : x))}>团队</button>
            </div>
            {it.isTeam && (
              <>
                <div className="f-chips">
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button key={n} type="button" disabled={isLocked} className={`f-chip${it.teamSize === n ? " on" : ""}`}
                      onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, teamSize: n } : x))}>{n} 人</button>
                  ))}
                </div>
                <div className="f-chips">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button key={n} type="button" disabled={isLocked} className={`f-chip${it.position === n ? " on" : ""}`}
                      onClick={() => setF2(prev => prev.map(x => x.key === it.key ? { ...x, position: n } : x))}>第 {n} 位</button>
                  ))}
                </div>
              </>
            )}
            <div className="f-item-foot">
              <span className="f-note">同一比赛只取最高分</span>
              <span className="f-sub">+ <b>{f2ItemScore(it).toFixed(2)}</b></span>
            </div>
          </div>
        ))}
        {!isLocked && (
          <button type="button" className="f-add" onClick={() => setF2(prev => [...prev, { key: kf(), name: "", category: "A", rank: 1, isTeam: false, teamSize: 1, position: 1, photos: [] }])}>
            <Plus size={15} /> 添加竞赛
          </button>
        )}
      </div>

      {/* F3 荣誉 */}
      <div className="f-card fx-item" style={{ "--i": 3 } as React.CSSProperties}>
        <div className="f-card-title"><Medal size={15} /> F3 荣誉<span className="sec">+</span></div>
        <div className="f-card-sub">荣誉称号 · 国家 3 / 省 2.5 / 市 2 / 校 1</div>
        {f3.length === 0 && <div className="f-note" style={{ textAlign: "center", padding: "22px 0 12px" }}>暂无荣誉称号</div>}
        {f3.map(it => (
          <div key={it.key} className="f-item">
            <div className="f-item-head">
              <span className="f-item-name">{it.name || "荣誉称号"}</span>
              <span className="f-tag">F3 · 荣誉</span>
              {!isLocked && (
                <button type="button" className="f-del" aria-label="删除该称号" onClick={() => setF3(prev => prev.filter(x => x.key !== it.key))}><Trash2 size={15} /></button>
              )}
            </div>
            <div className="f-chips">
              {F3_LEVELS.map(l => (
                <button key={l.v} type="button" disabled={isLocked} className={`f-chip${it.level === l.v ? " on" : ""}`}
                  onClick={() => setF3(prev => prev.map(x => x.key === it.key ? { ...x, level: l.v } : x))}>{l.label}</button>
              ))}
            </div>
            <div className="f-item-foot">
              <input className="f-input" placeholder="称号名称（如：优秀志愿者）" value={it.name} disabled={isLocked}
                onChange={e => setF3(prev => prev.map(x => x.key === it.key ? { ...x, name: e.target.value } : x))}
                style={{ flex: 1, fontSize: 12.5, textAlign: "left" }} />
            </div>
          </div>
        ))}
        {!isLocked && (
          <button type="button" className="f-add" onClick={() => setF3(prev => [...prev, { key: kf(), level: "school", name: "", photos: [] }])}>
            <Plus size={15} /> 添加称号
          </button>
        )}
      </div>

      {/* F4 科研 */}
      <div className="f-card fx-item" style={{ "--i": 4 } as React.CSSProperties}>
        <div className="f-card-title"><FlaskConical size={15} /> F4 科研<span className="sec">+</span></div>
        <div className="f-card-sub">校报 / 论文 / 征文 / 课题 / 专利</div>
        {f4.length === 0 && <div className="f-note" style={{ textAlign: "center", padding: "22px 0 12px" }}>暂无科研成果</div>}
        {f4.map(it => (
          <div key={it.key} className="f-item">
            <div className="f-item-head">
              <span className="f-item-name">{F4_SHORT[it.type] || ""}</span>
              <span className="f-tag">F4 · 科研</span>
              {!isLocked && (
                <button type="button" className="f-del" aria-label="删除该成果" onClick={() => setF4(prev => prev.filter(x => x.key !== it.key))}><Trash2 size={15} /></button>
              )}
            </div>
            <div className="f-chips">
              {F4_TYPES.map(t => (
                <button key={t.v} type="button" disabled={isLocked} className={`f-chip${it.type === t.v ? " on" : ""}`}
                  onClick={() => setF4(prev => prev.map(x => x.key === it.key ? { ...x, type: t.v } : x))}>{F4_SHORT[t.v]}</button>
              ))}
            </div>
            {it.type === "journal" && (
              <div className="f-chips">
                {F4_JOURNAL_RANK_OPTS.map(o => (
                  <button key={o.v} type="button" disabled={isLocked} className={`f-chip${String(it.rank) === o.v ? " on" : ""}`}
                    onClick={() => setF4(prev => prev.map(x => x.key === it.key ? { ...x, rank: Number(o.v) } : x))}>{o.label}</button>
                ))}
              </div>
            )}
            {it.type === "essay" && (
              <div className="f-chips">
                {F4_ESSAY_RANK_OPTS.map(o => (
                  <button key={o.v} type="button" disabled={isLocked} className={`f-chip${String(it.rank) === o.v ? " on" : ""}`}
                    onClick={() => setF4(prev => prev.map(x => x.key === it.key ? { ...x, rank: Number(o.v) } : x))}>{o.label}</button>
                ))}
              </div>
            )}
            {it.type === "research" && (
              <div className="f-chips">
                {F4_RESEARCH_LEVEL_OPTS.map(o => (
                  <button key={o.v} type="button" disabled={isLocked} className={`f-chip${it.level === o.v ? " on" : ""}`}
                    onClick={() => setF4(prev => prev.map(x => x.key === it.key ? { ...x, level: o.v } : x))}>{o.label}</button>
                ))}
              </div>
            )}
            <div className="f-item-foot">
              <input className="f-input" placeholder={it.type === "patent" ? "专利名称/专利号" : "名称/说明"} value={it.detail} disabled={isLocked}
                onChange={e => setF4(prev => prev.map(x => x.key === it.key ? { ...x, detail: e.target.value } : x))}
                style={{ flex: 1, fontSize: 12.5, textAlign: "left" }} />
            </div>
          </div>
        ))}
        {!isLocked && (
          <button type="button" className="f-add" onClick={() => setF4(prev => [...prev, { key: kf(), type: "newspaper", detail: "", rank: 1, level: "city", photos: [] }])}>
            <Plus size={15} /> 添加成果
          </button>
        )}
      </div>

      {/* F5 惩罚 */}
      <div className="f-card fx-item" style={{ "--i": 5 } as React.CSSProperties}>
        <div className="f-card-title"><ShieldAlert size={15} /> F5 惩罚<span className="sec">−</span></div>
        <div className="f-card-sub">处分记录 · 累计扣分不超过 5 分</div>
        {f5.length === 0 && <div className="f-note" style={{ textAlign: "center", padding: "22px 0 12px" }}>无处分记录</div>}
        {f5.map(it => (
          <div key={it.key} className="f-item">
            <div className="f-item-head">
              <span className="f-item-name">{it.type}</span>
              <span className="f-tag">F5 · 惩罚</span>
              {!isLocked && (
                <button type="button" className="f-del" aria-label="删除该处分" onClick={() => setF5(prev => prev.filter(x => x.key !== it.key))}><Trash2 size={15} /></button>
              )}
            </div>
            <div className="f-chips">
              {F5_TYPES.map(t => (
                <button key={t} type="button" disabled={isLocked} className={`f-chip${it.type === t ? " on" : ""}`}
                  onClick={() => setF5(prev => prev.map(x => x.key === it.key ? { ...x, type: t } : x))}>{t}<span className="mono">−{F5_PENALTY_SCORES[t]}</span></button>
              ))}
            </div>
            <div className="f-item-foot">
              <span className="f-note">累计扣分不超过 5 分</span>
              <input className="f-input num" type="number" min={1} max={5} value={it.count} disabled={isLocked}
                onChange={e => setF5(prev => prev.map(x => x.key === it.key ? { ...x, count: Math.max(1, Math.min(5, Number(e.target.value) || 1)) } : x))}
                style={{ width: 56 }} aria-label="次数" />
              <span className="f-sub minus">− <b>{(F5_PENALTY_SCORES[it.type] || 0) * it.count}</b></span>
            </div>
          </div>
        ))}
        {!isLocked && (
          <button type="button" className="f-add" onClick={() => setF5(prev => [...prev, { key: kf(), type: "警告", count: 1 }])}>
            <Plus size={15} /> 添加处分
          </button>
        )}
      </div>

      {/* 得分预览 */}
      <div className="f-card fx-item" style={{ "--i": 6 } as React.CSSProperties}>
        <div className="f-score">
          <div className="k">当前得分<span className="ln">F1 +{f1Sum.toFixed(2)} · F2 +{f2Sum.toFixed(2)} · F3 +{f3Sum.toFixed(2)} · F4 +{f4Sum.toFixed(2)} · F5 −{f5Sum.toFixed(2)}</span></div>
          <div className="v">{score.toFixed(2)}<span className="max"> / 10</span></div>
        </div>
      </div>
    </MFrame>
  )
}

// ============================================================
// 移动版 B / C 只读视图（班委评定 · 学生查看）
// ============================================================
function MobileBView() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ excellentMember: boolean; partyMember: boolean; youthStudyCount: number } | null>(null)
  const [secStatus, setSecStatus] = useState("not_started")

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "B")
      if (existing) {
        setSecStatus(existing.status)
        try {
          const parsed = JSON.parse(existing.data || "{}")
          setData({ excellentMember: !!parsed.excellentMember, partyMember: !!parsed.partyMember, youthStudyCount: Number(parsed.youthStudyCount) || 0 })
        } catch { setData(null) }
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [status])

  if (status === "loading" || loading) return MOBILE_LOADING
  if (!session) return null

  const filled = data !== null && secStatus !== "not_started"
  const score = calcBScore(data || {})
  const youthBonus = Math.floor((data?.youthStudyCount || 0) / 3) * 0.2

  return (
    <MFrame sectionKey="B">
      {!filled ? (
        <div className="f-card fx-item" style={{ "--i": 1 } as React.CSSProperties}>
          <div style={{ textAlign: "center", padding: "36px 10px" }}>
            <Users size={26} style={{ color: "var(--color-muted-light)", marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>团支书尚未评定</div>
            <div className="f-note" style={{ fontSize: 11 }}>本板块由团支书统一评定填写，完成后可在此查看得分明细</div>
          </div>
        </div>
      ) : (
        <>
          <div className="f-card fx-item" style={{ "--i": 1 } as React.CSSProperties}>
            <div className="f-card-title"><Users size={15} /> 我的得分明细<span className="sec">已评定</span></div>
            <div className="f-row"><span className="f-lab">基础分</span><span className="f-note" style={{ color: "var(--color-accent-hover)", fontWeight: 700 }}>+1.50</span></div>
            <div className="f-row">
              <span className="f-lab">优秀团员{data?.excellentMember && <span className="f-tag" style={{ marginLeft: 6, borderColor: "#C7924B", color: "#B8783F" }}>已勾选</span>}</span>
              <span className="f-note">标记</span>
            </div>
            <div className="f-row">
              <span className="f-lab">党支部工作小组成员{data?.partyMember && <span className="f-tag" style={{ marginLeft: 6, borderColor: "var(--color-accent)", color: "var(--color-accent)" }}>已勾选</span>}</span>
              <span className="f-note">标记</span>
            </div>
            <div className="f-row">
              <span className="f-lab">青年大学习 · 完成 {data?.youthStudyCount || 0} 期<small>每 3 期 +0.2 分</small></span>
              <span className="f-note" style={{ color: youthBonus > 0 ? "var(--color-accent-hover)" : "var(--color-muted-light)", fontWeight: 700 }}>+{youthBonus.toFixed(2)}</span>
            </div>
          </div>
          <div className="f-card f-big fx-item" style={{ "--i": 2 } as React.CSSProperties}>
            <div className="k">B 得分</div>
            <div className="v">{score.toFixed(2)}<span className="max"> / 2.5</span></div>
            <div className="sub">1.5 + 青年大学习 {Math.floor((data?.youthStudyCount || 0) / 3)} 组 × 0.2</div>
          </div>
          <div className="f-note fx-item" style={{ "--i": 3, padding: "10px 16px 0" } as React.CSSProperties}>如有疑问，请联系团支书核实</div>
        </>
      )}
    </MFrame>
  )
}

function MobileCView() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ starLevel: number; civilizedDorm: boolean } | null>(null)
  const [secStatus, setSecStatus] = useState("not_started")

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "C")
      if (existing) {
        setSecStatus(existing.status)
        try {
          const parsed = JSON.parse(existing.data || "{}")
          setData({ starLevel: Number(parsed.starLevel) || 0, civilizedDorm: !!parsed.civilizedDorm })
        } catch { setData(null) }
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [status])

  if (status === "loading" || loading) return MOBILE_LOADING
  if (!session) return null

  const filled = data !== null && secStatus !== "not_started"
  const score = calcCScore(data || {})
  const star = STAR_LEVELS[data?.starLevel ?? 0] || STAR_LEVELS[0]

  return (
    <MFrame sectionKey="C">
      {!filled ? (
        <div className="f-card fx-item" style={{ "--i": 1 } as React.CSSProperties}>
          <div style={{ textAlign: "center", padding: "36px 10px" }}>
            <Home size={26} style={{ color: "var(--color-muted-light)", marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>生活委员尚未评定</div>
            <div className="f-note" style={{ fontSize: 11 }}>本板块由生活委员统一评定填写，完成后可在此查看您的宿舍星级得分</div>
          </div>
        </div>
      ) : (
        <>
          <div className="f-card fx-item" style={{ "--i": 1 } as React.CSSProperties}>
            <div style={{ textAlign: "center", padding: "8px 0 6px" }}>
              <div style={{ display: "flex", gap: 3, justifyContent: "center", marginBottom: 10, color: star.color }}>
                {[0, 1, 2, 3, 4].map(i => <Star key={i} size={26} fill={i < (data?.starLevel || 0) ? star.color : "transparent"} strokeWidth={1.8} />)}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: star.color }}>{star.label}</div>
              <div className="f-note" style={{ marginTop: 4 }}>评定得分：{score.toFixed(2)} / 2.5 分</div>
              {data?.civilizedDorm && (
                <span className="f-chip on" style={{ marginTop: 10, cursor: "default" }}>文明宿舍 +0.5</span>
              )}
            </div>
          </div>
          <div className="f-card fx-item" style={{ "--i": 2 } as React.CSSProperties}>
            <div className="f-card-title"><Home size={15} /> 得分明细<span className="sec">已评定</span></div>
            <div className="f-row">
              <span className="f-lab">宿舍星级（{star.label}）</span>
              <span className="f-note" style={{ color: data?.starLevel ? "var(--color-accent-hover)" : "var(--color-muted-light)", fontWeight: 700 }}>
                +{(data?.starLevel === 5 ? 2.5 : data?.starLevel === 4 ? 2 : data?.starLevel === 3 ? 1 : 0).toFixed(2)}
              </span>
            </div>
            <div className="f-row">
              <span className="f-lab">文明宿舍{data?.civilizedDorm && <span className="f-tag" style={{ marginLeft: 6, borderColor: "var(--color-success)", color: "var(--color-success)" }}>获评</span>}</span>
              <span className="f-note" style={{ color: data?.civilizedDorm ? "var(--color-success)" : "var(--color-muted-light)", fontWeight: 700 }}>
                {data?.civilizedDorm ? "+0.50" : "+0.00"}
              </span>
            </div>
          </div>
          <div className="f-card f-big fx-item" style={{ "--i": 3 } as React.CSSProperties}>
            <div className="k">C 得分</div>
            <div className="v">{score.toFixed(2)}<span className="max"> / 2.5</span></div>
            <div className="sub">{star.desc}{data?.civilizedDorm ? " + 0.5（文明宿舍）" : ""}</div>
          </div>
          <div className="f-note fx-item" style={{ "--i": 4, padding: "10px 16px 0" } as React.CSSProperties}>如有疑问，请联系生活委员核实</div>
        </>
      )}
    </MFrame>
  )
}

// ============================================================
// D 文体活动（学生填写，文体委员审核）
// ============================================================
// 滚动文本：内容溢出时无缝循环滚动，悬停暂停
function ScrollText({ text, style }: { text: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 2)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [text])
  return (
    <span ref={ref} className={`scroll-text ${overflow ? "run" : ""}`} style={{ flex: 1, textAlign: "left", minWidth: 0, ...style }}>
      {overflow ? (
        <span className="marquee-track">
          <span className="marquee-item">{text}</span>
          <span className="marquee-item">{text}</span>
        </span>
      ) : text}
    </span>
  )
}

// 客户端图片压缩转码（HEIC/超大图 → JPEG，保证浏览器可显示、体积可控）
function compressImage(file: File, maxEdge = 1600, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext("2d")
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("canvas 不可用")); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error("转码失败")); return }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }))
      }, "image/jpeg", quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("图片读取失败")) }
    img.src = url
  })
}

// ============================================================
// 通用浮层选择器（V2 风格：图标/徽标 + 选中打勾 + fixed 防遮挡 + 全局互斥）
// ============================================================
// 全局浮层互斥：同一时间只允许一个浮层打开，避免多面板重叠混叠
const popoverCloseFns = new Set<() => void>()

interface PopOption {
  v: string
  label: string
  icon?: React.ReactNode
  badge?: { text: string; color: string }
}

function PopSelect({ value, options, onChange, disabled, width = 200, placeholder = "-" }: {
  value: string; options: PopOption[]; onChange: (v: string) => void; disabled?: boolean; width?: number; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; up: boolean; topGap: number; bottomGap: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const selected = options.find(o => o.v === value)

  useEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    let left = rect.left
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8)
    const up = window.innerHeight - rect.bottom < 300
    setPos({ left, up, topGap: rect.bottom + 4, bottomGap: window.innerHeight - rect.top + 4 })
  }, [open, width])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    // 全局互斥：关闭其他所有浮层
    popoverCloseFns.forEach(fn => fn())
    popoverCloseFns.add(close)
    const onDocClick = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close() }
    document.addEventListener("mousedown", onDocClick)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
      popoverCloseFns.delete(close)
    }
  }, [open])

  return (
    <div ref={wrapRef} style={{ display: "inline-block" }}>
      <button ref={btnRef} type="button" disabled={disabled}
        className={`pop-sel-btn ${selected ? "" : "empty"} ${disabled ? "disabled" : ""}`}
        style={{ width, height: 38, fontSize: ".76rem" }}
        onClick={() => setOpen(o => !o)}>
        {selected ? (
          <>
            {selected.icon}
            <ScrollText text={selected.label} />
          </>
        ) : (
          <span style={{ color: "#A8B4BD", flex: 1, textAlign: "left", minWidth: 0 }}>{placeholder}</span>
        )}
        <span className="pop-sel-arrow">▾</span>
      </button>
      {open && pos && (
        <div className="pop-sel-panel" style={{ left: pos.left, top: pos.up ? undefined : pos.topGap, bottom: pos.up ? pos.bottomGap : undefined, width }}>
          {options.map(o => (
            <div key={o.v} className={`pop-sel-item ${value === o.v ? "selected" : ""}`}
              onClick={() => { onChange(o.v); setOpen(false) }}>
              {o.icon}
              {o.badge && <span className="pop-sel-tag" style={{ background: o.badge.color }}>{o.badge.text}</span>}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{o.label}</span>
              {value === o.v && <span className="pop-sel-check">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// 迷你日历（V2 风格日期选择器，替换原生 date input）
// ============================================================
function MiniCalendar({ value, onChange, disabled }: { value: string; onChange: (d: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; up: boolean; topGap: number; bottomGap: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const now = new Date()
  const [view, setView] = useState({ y: value ? new Date(value).getFullYear() : now.getFullYear(), m: value ? new Date(value).getMonth() : now.getMonth() })
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const cells = useMemo(() => {
    const firstDow = new Date(view.y, view.m, 1).getDay()
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
    const arr: (number | null)[] = []
    for (let i = 0; i < firstDow; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(d)
    return arr
  }, [view])

  useEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    let left = rect.left
    if (left + 268 > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 268 - 8)
    const up = window.innerHeight - rect.bottom < 320
    setPos({ left, up, topGap: rect.bottom + 4, bottomGap: window.innerHeight - rect.top + 4 })
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    // 全局互斥：关闭其他所有浮层
    popoverCloseFns.forEach(fn => fn())
    popoverCloseFns.add(close)
    const onDocClick = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close() }
    document.addEventListener("mousedown", onDocClick)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
      popoverCloseFns.delete(close)
    }
  }, [open])

  const pick = (d: number) => {
    onChange(`${view.y}-${String(view.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ display: "inline-block" }}>
      <button ref={btnRef} type="button" disabled={disabled}
        className={`pop-sel-btn ${value ? "" : "empty"} ${disabled ? "disabled" : ""}`}
        style={{ width: 140, height: 38, fontSize: ".74rem", fontFamily: "'JetBrains Mono',monospace" }}
        onClick={() => setOpen(o => !o)}>
        <Calendar size={13} style={{ color: "#A8B4BD" }} />
        {value || "选择日期"}
        <span className="pop-sel-arrow">▾</span>
      </button>
      {open && pos && (
        <div className="cal-pop" style={{ left: pos.left, top: pos.up ? undefined : pos.topGap, bottom: pos.up ? pos.bottomGap : undefined }}>
          <div className="cal-head">
            <button type="button" onClick={() => setView(v => ({ y: v.m === 0 ? v.y - 1 : v.y, m: v.m === 0 ? 11 : v.m - 1 }))}><ChevronLeft size={14} /></button>
            <span className="cal-title">{view.y} 年 {view.m + 1} 月</span>
            <button type="button" onClick={() => setView(v => ({ y: v.m === 11 ? v.y + 1 : v.y, m: v.m === 11 ? 0 : v.m + 1 }))}><ChevronRight size={14} /></button>
          </div>
          <div className="cal-grid">
            {["日", "一", "二", "三", "四", "五", "六"].map(d => <span key={d} className="cal-dow">{d}</span>)}
            {cells.map((d, i) => {
              if (d === null) return <span key={i} />
              const dayStr = `${view.y}-${String(view.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
              const isSel = dayStr === value
              const isToday = dayStr === todayStr
              return <span key={i} className={`cal-day ${isSel ? "sel" : ""} ${isToday ? "today" : ""}`} onClick={() => pick(d)}>{d}</span>
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// E 社会实践/公益（学生填写，组织委员审核，须图片佐证）
// ============================================================
function PillGroup({ options, value, onChange, disabled, width }: {
  options: { v: string; label: string }[]; value: string; onChange: (v: string) => void; disabled?: boolean; width?: number
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(o => (
        <button key={o.v} type="button" disabled={disabled} onClick={() => onChange(o.v)}
          className="tag" style={{
            cursor: disabled ? "not-allowed" : "pointer",
            padding: "7px 14px", fontSize: ".72rem", borderRadius: 8,
            background: value === o.v ? "#3D5A6E" : "#F9F8F5",
            color: value === o.v ? "#fff" : "#7A8A94",
            border: `1.5px solid ${value === o.v ? "#3D5A6E" : "#E3E7EB"}`,
            fontWeight: value === o.v ? 600 : 400,
            minWidth: width,
            opacity: disabled ? .55 : 1,
          }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function EForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [currentStatus, setCurrentStatus] = useState("not_started")
  const [reviewNote, setReviewNote] = useState("")
  const [form, setForm] = useState({ isCaptain: false, teamAward: "none", schoolLevelAward: false, cityVolunteer: false, volunteerHours: 0 })
  const [evidence, setEvidence] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [autoSave, setAutoSave] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const initializedRef = useRef(false)
  const savingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLocked = currentStatus === "approved"
  const score = calcEScore(form)
  const hourBonus = Math.min(3, form.volunteerHours * 0.1)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/sections")
      .then(r => r.json())
      .then(d => {
        const existing = (d.sections || []).find((s: any) => s.section === "E")
        if (existing) {
          setCurrentStatus(existing.status)
          setReviewNote(existing.reviewNote || "")
          try { setEvidence(JSON.parse(existing.evidence || "[]")) } catch { setEvidence([]) }
          try {
            const p = JSON.parse(existing.data || "{}")
            setForm({
              isCaptain: !!p.isCaptain,
              teamAward: p.teamAward || "none",
              schoolLevelAward: !!p.schoolLevelAward,
              cityVolunteer: !!p.cityVolunteer,
              volunteerHours: Number(p.volunteerHours) || 0,
            })
          } catch { /* ignore */ }
        }
        setLoading(false)
        initializedRef.current = true
      })
      .catch(() => setLoading(false))
  }, [status])

  useEffect(() => {
    if (!initializedRef.current) return
    if (isLocked || currentStatus === "submitted") return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void saveDraft() }, 700)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [form, evidence])

  async function saveDraft() {
    if (savingRef.current) return
    savingRef.current = true
    setAutoSave("saving")
    try {
      const res = await fetch("/api/zongce/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "E", status: "draft", evidence, data: form }),
      })
      if (!res.ok) throw new Error("保存失败")
      setAutoSave("saved")
      refreshStatus()
    } catch {
      setAutoSave("error")
    } finally {
      savingRef.current = false
    }
  }

  const refreshStatus = () => {
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "E")
      if (existing) { setCurrentStatus(existing.status); setReviewNote(existing.reviewNote || "") }
    }).catch(() => {})
  }

  async function submit() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaving(true); setError("")
    const res = await fetch("/api/zongce/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "E", status: "submitted", evidence, data: form }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || "提交失败")
      setSaving(false)
      return
    }
    refreshStatus(); setSaving(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) { alert("请上传图片文件"); return }
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      if (compressed.size > 5 * 1024 * 1024) { alert("图片处理后仍超过 5MB，请更换更小的图片"); return }
      const fd = new FormData()
      fd.append("file", compressed)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || "上传失败"); return }
      setEvidence(prev => [...prev, d.url])
    } catch (err) {
      alert(err instanceof Error ? err.message : "上传失败，请重试")
    } finally {
      setUploading(false)
    }
  }

  // 重置：清空全部填写与照片
  async function resetAll() {
    if (!confirm("确定清空本板块全部填写内容和佐证照片？\n此操作不可恢复。")) return
    const res = await fetch("/api/zongce/sections?section=E", { method: "DELETE" })
    if (res.ok) {
      setForm({ isCaptain: false, teamAward: "none", schoolLevelAward: false, cityVolunteer: false, volunteerHours: 0 })
      setEvidence([])
      setCurrentStatus("not_started")
      setAutoSave("idle")
      setError("")
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || "重置失败")
    }
  }

  if (status === "loading" || loading) return <p style={{ textAlign: "center", padding: 80, color: "#7A8A94" }}>加载中...</p>
  if (!session) return null

  const user = session.user
  const cardStyle: React.CSSProperties = { background: "#fff", padding: "20px 24px", marginBottom: 16 }

  return (
    <main className="zs-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
      </div>
      <div className="zs-id">
        <div className="zs-id-avatar">{(user as any)?.name?.[0] || "?"}</div>
        <div className="zs-id-info">
          <div className="zs-id-name">{(user as any)?.name}</div>
          <div className="zs-id-meta">
            <span><Calendar size={11} /> {(user as any)?.studentId || "—"}</span>
            <span><User size={11} /> 班务管理</span>
          </div>
        </div>
        <Link href="/zongce/select" className="zs-id-badge" title="切换综测学年">2025-2026 学年</Link>
      </div>
      <RuleBlock label="社会实践/公益 E" rules={SECTION_META.E.rules} reviewer={SECTION_META.E.reviewer} max={SECTION_META.E.max} />
      <div className={`autosave-bar ${autoSave === "saving" ? "saving" : autoSave === "error" ? "error" : "saved"}`}>
        <span className="dot" />
        {autoSave === "saving" && <span>正在自动保存…</span>}
        {autoSave === "saved" && <span>已自动保存</span>}
        {autoSave === "error" && <span>自动保存失败，请检查网络</span>}
        {autoSave === "idle" && <span>填写内容将自动保存为草稿</span>}
      </div>

      {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* 社会实践分队 */}
      <div className="card" style={cardStyle}>
        <div style={{ fontSize: ".85rem", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={15} style={{ color: "#3D5A6E" }} /> 社会实践分队
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div className="d-form-label" style={{ marginBottom: 6 }}>是否担任分队队长、召集人（+0.5 分）</div>
            <PillGroup disabled={isLocked} value={form.isCaptain ? "yes" : "no"} width={110}
              options={[{ v: "no", label: "未担任" }, { v: "yes", label: "担任" }]}
              onChange={v => setForm(f => ({ ...f, isCaptain: v === "yes" }))} />
          </div>
          <div>
            <div className="d-form-label" style={{ marginBottom: 6 }}>分队获奖情况（优秀成员 +1 分 / 优秀队长或召集人 +1.5 分）</div>
            <PillGroup disabled={isLocked} value={form.teamAward} width={130}
              options={[
                { v: "none", label: "无获奖" },
                { v: "member", label: "优秀分队成员" },
                { v: "captain", label: "优秀分队队长/召集人" },
              ]}
              onChange={v => setForm(f => ({ ...f, teamAward: v }))} />
          </div>
        </div>
      </div>

      {/* 个人荣誉 */}
      <div className="card" style={cardStyle}>
        <div style={{ fontSize: ".85rem", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Medal size={15} style={{ color: "#C7924B" }} /> 个人荣誉
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={isLocked} onClick={() => setForm(f => ({ ...f, schoolLevelAward: !f.schoolLevelAward }))}
            className="tag" style={{
              cursor: isLocked ? "not-allowed" : "pointer", padding: "8px 14px", fontSize: ".72rem", borderRadius: 8,
              background: form.schoolLevelAward ? "#5A8C6F" : "#F9F8F5",
              color: form.schoolLevelAward ? "#fff" : "#7A8A94",
              border: `1.5px solid ${form.schoolLevelAward ? "#5A8C6F" : "#E3E7EB"}`,
              fontWeight: form.schoolLevelAward ? 600 : 400, opacity: isLocked ? .55 : 1,
            }}>
            {form.schoolLevelAward ? "✓ " : ""}校级社会实践积极分子（+2 分）
          </button>
          <button type="button" disabled={isLocked} onClick={() => setForm(f => ({ ...f, cityVolunteer: !f.cityVolunteer }))}
            className="tag" style={{
              cursor: isLocked ? "not-allowed" : "pointer", padding: "8px 14px", fontSize: ".72rem", borderRadius: 8,
              background: form.cityVolunteer ? "#5A8C6F" : "#F9F8F5",
              color: form.cityVolunteer ? "#fff" : "#7A8A94",
              border: `1.5px solid ${form.cityVolunteer ? "#5A8C6F" : "#E3E7EB"}`,
              fontWeight: form.cityVolunteer ? 600 : 400, opacity: isLocked ? .55 : 1,
            }}>
            {form.cityVolunteer ? "✓ " : ""}市级以上优秀志愿者（+1 分）
          </button>
        </div>
      </div>

      {/* 志愿时长 */}
      <div className="card" style={cardStyle}>
        <div style={{ fontSize: ".85rem", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Heart size={15} style={{ color: "#B8783F" }} /> 志愿服务时长
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input type="number" min={0} max={999} value={form.volunteerHours || ""} placeholder="0" disabled={isLocked}
              onChange={e => setForm(f => ({ ...f, volunteerHours: Math.max(0, Math.round(Number(e.target.value) || 0)) }))}
              style={{ width: 110, height: 38, border: "1.5px solid #E3E7EB", borderRadius: 9, textAlign: "center", fontSize: ".82rem", fontFamily: "'JetBrains Mono',monospace", outline: "none", background: "#FDFDFC" }} />
            <span style={{ fontSize: ".72rem", color: "#556773" }}>小时</span>
          </div>
          <span style={{ fontSize: ".68rem", color: "#A8B4BD" }}>两学期新增总志愿时长 · 每 1 小时 +0.1 分（最高 +3 分）</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: ".82rem", color: hourBonus > 0 ? "#B8783F" : "#A8B4BD", marginLeft: "auto" }}>
            志愿加分 +{hourBonus.toFixed(2)}
          </span>
        </div>
        <div className="d-form-label" style={{ marginBottom: 6 }}>i 志愿截图佐证（须上传）</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {evidence.map(url => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer"
              style={{ position: "relative", width: 56, height: 56, borderRadius: 8, overflow: "hidden", border: "1px solid #E8E3D9", display: "block", background: "#F5F2ED" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="i志愿截图" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {!isLocked && (
                <span onClick={e => { e.preventDefault(); e.stopPropagation(); setEvidence(prev => prev.filter(x => x !== url)) }}
                  style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "rgba(196,97,90,.9)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".56rem", cursor: "pointer" }}>×</span>
              )}
            </a>
          ))}
          {!isLocked && (
            <label style={{ width: 56, height: 56, borderRadius: 8, border: "2px dashed #E3E7EB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#A8B4BD", fontSize: ".52rem", gap: 2, background: "#FAF9F6" }}>
              <Upload size={14} />{uploading ? "上传中" : "截图"}
              <input type="file" accept="image/*" className="zs-file-hide" onChange={handleUpload} disabled={uploading || isLocked} />
            </label>
          )}
          <span style={{ fontSize: ".6rem", color: "#A8B4BD" }}>已传 {evidence.length} 张</span>
        </div>
      </div>

      <div className="zs-summary">
        <div className="zs-summary-main">
          <div className="zs-sum-item"><div className="l">E 得分</div><div className="v" style={{ color: "#3D5A6E" }}>{score.toFixed(2)}</div><div className="u">/ 5 分</div></div>
        </div>
        {score > 0 && (
          <div className="zs-sum-eq">
            {(form.isCaptain ? "0.5" : "0")} + {form.teamAward === "member" ? "1" : form.teamAward === "captain" ? "1.5" : "0"} + {(form.schoolLevelAward ? 2 : 0)} + {(form.cityVolunteer ? 1 : 0)} + {hourBonus.toFixed(2)} = {score.toFixed(2)}
          </div>
        )}
      </div>

      {!isLocked && currentStatus !== "submitted" && (
        <div className="zs-actions">
          <button className="zs-btn zs-btn-pri" onClick={submit} disabled={saving || FORM_LOCKED}><Send size={14} /> 提交审核</button>
          <button className="zs-btn zs-btn-sec" onClick={resetAll} disabled={saving || FORM_LOCKED} style={{ color: "#C4615A", borderColor: "rgba(196,97,90,.45)" }}>重置清空</button>
        </div>
      )}
      {!isLocked && currentStatus === "submitted" && (
        <div className="zs-actions">
          <span style={{ fontSize: ".75rem", color: "#C7924B", marginRight: "auto" }}>已提交审核，等待组织委员审核</span>
          <button className="zs-btn zs-btn-sec" onClick={() => setCurrentStatus("draft")} disabled={saving || FORM_LOCKED}><Undo2 size={14} /> 撤回修改</button>
        </div>
      )}
      {isLocked && (
        <div className="card" style={{ textAlign: "center", padding: 24, background: "#fff" }}>
          <div style={{ color: "#5A8C6F", fontSize: ".85rem", fontWeight: 600, marginBottom: 10 }}>该板块已审核通过</div>
          <button className="zs-btn zs-btn-sec" onClick={() => setCurrentStatus("draft")} disabled={saving || FORM_LOCKED}><Undo2 size={14} /> 重新编辑（需重新审核）</button>
        </div>
      )}
      {currentStatus === "returned" && <div className="card" style={{ marginTop: 16, borderColor: "#C4615A", background: "#FDF3F2", color: "#C4615A", fontSize: ".82rem", padding: "14px 18px" }}>
        <div style={{ fontWeight: 700, marginBottom: reviewNote ? 6 : 0 }}>退回修改，请修正后重新提交</div>
        {reviewNote && <div style={{ color: "#8A4B45", fontSize: ".8rem", lineHeight: 1.7 }}>退回原因：{reviewNote}</div>}
      </div>}
    </main>
  )
}

// ============================================================
// F 奖惩附加（学生填写五组，班长审核）
// ============================================================
interface F1Item { key: string; position: string; duration: string; evaluation: string; photos: string[] }
interface F2Item { key: string; name: string; category: string; rank: number; isTeam: boolean; teamSize: number; position: number; photos: string[] }
interface F3Item { key: string; level: string; name: string; photos: string[] }
interface F4Item { key: string; type: string; detail: string; rank: number; level: string; photos: string[] }
interface F5Item { key: string; type: string; count: number }

const F2_CATEGORIES = [
  { v: "A", label: "A类" }, { v: "B", label: "B类" }, { v: "C", label: "C类" },
  { v: "D", label: "D类" }, { v: "E", label: "E类（校级）" }, { v: "F", label: "F类（院级）" },
]
const F3_LEVELS = [
  { v: "national", label: "国家级（+3）" }, { v: "province", label: "省级（+2.5）" },
  { v: "city", label: "市级（+2）" }, { v: "school", label: "校级（+1）" },
]
const F4_TYPES = [
  { v: "newspaper", label: "校报发表文章（+0.5/篇，累计≤1）" },
  { v: "journal", label: "期刊论文（一作+2/二作+0.8）" },
  { v: "essay", label: "征文/课题比赛获奖（1/0.8/0.5/0.25）" },
  { v: "research", label: "课题调研获奖（市厅+2/省+2.5）" },
  { v: "patent", label: "专利（+2/项）" },
]
const F5_TYPES = ["留校察看", "记过", "严重警告", "警告", "通报批评"]
const kf = () => `k${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// F 板块浮层选项（带分值/徽标，细致化）
const F1_DURATION_OPTS = [
  { v: "year", label: "一学年" },
  { v: "sem", label: "一学期" },
]
const F1_EVAL_OPTS = [
  { v: "pass", label: "合格", badge: { text: "合", color: "#A8B4BD" } },
  { v: "excellent", label: "优秀", badge: { text: "优", color: "#5A8C6F" } },
  { v: "fail", label: "不合格", badge: { text: "不", color: "#C4615A" } },
]
const F2_CAT_OPTS = F2_CATEGORIES.map(c => ({ v: c.v, label: c.label, badge: { text: c.v, color: "#3D5A6E" } }))
// 0=特等奖（按一等奖计分）1/2/3=一二三等奖
const F2_RANK_OPTS = [
  { v: "0", label: "特等奖（按一等奖）", badge: { text: "特", color: "#B8783F" } },
  { v: "1", label: "一等奖", badge: { text: "金", color: "#C7924B" } },
  { v: "2", label: "二等奖", badge: { text: "银", color: "#9AA0A6" } },
  { v: "3", label: "三等奖", badge: { text: "铜", color: "#A67B4F" } },
]
// 考评仅适用于校级/院级组织、班集体（细则仅这三类有考评机制）
const F1_EVAL_CATEGORIES = ["校级组织", "院级组织", "班集体"]
const F2_TEAM_OPTS = [{ v: "solo", label: "个人" }, { v: "team", label: "团队" }]
const F3_LEVEL_OPTS = F3_LEVELS.map(l => ({ v: l.v, label: l.label }))
const F4_JOURNAL_RANK_OPTS = [
  { v: "1", label: "第一作者（+2）", badge: { text: "1", color: "#C7924B" } },
  { v: "2", label: "第二作者（+0.8）", badge: { text: "2", color: "#9AA0A6" } },
  { v: "3", label: "第三作者及以后", badge: { text: "3", color: "#A8B4BD" } },
]
const F4_ESSAY_RANK_OPTS = [
  { v: "1", label: "一等奖（+1）", badge: { text: "一", color: "#C7924B" } },
  { v: "2", label: "二等奖（+0.8）", badge: { text: "二", color: "#9AA0A6" } },
  { v: "3", label: "三等奖（+0.5）", badge: { text: "三", color: "#A67B4F" } },
  { v: "4", label: "优秀奖（+0.25）", badge: { text: "优", color: "#A8B4BD" } },
]
const F4_RESEARCH_LEVEL_OPTS = [
  { v: "city", label: "市厅级（+2）", badge: { text: "市", color: "#5B8E9E" } },
  { v: "province", label: "省级（+2.5）", badge: { text: "省", color: "#C7924B" } },
]
const F4_TYPE_OPTS = F4_TYPES.map(t => ({ v: t.v, label: t.label }))
const F5_TYPE_OPTS = F5_TYPES.map(t => ({ v: t, label: `${t}（-${F5_PENALTY_SCORES[t]}）`, badge: { text: "扣", color: "#C4615A" } }))

function FForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [currentStatus, setCurrentStatus] = useState("not_started")
  const [reviewNote, setReviewNote] = useState("")
  const [f1, setF1] = useState<F1Item[]>([])
  const [f2, setF2] = useState<F2Item[]>([])
  const [f3, setF3] = useState<F3Item[]>([])
  const [f4, setF4] = useState<F4Item[]>([])
  const [f5, setF5] = useState<F5Item[]>([])
  const [autoSave, setAutoSave] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const initializedRef = useRef(false)
  const savingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLocked = currentStatus === "approved"
  const score = calcFScore({
    f1: f1.map(({ key, photos, ...rest }) => rest),
    f2: f2.map(({ key, photos, ...rest }) => rest),
    f3: f3.map(({ key, photos, ...rest }) => rest),
    f4: f4.map(({ key, photos, ...rest }) => rest),
    f5: f5.map(({ key, ...rest }) => rest),
  })

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/sections")
      .then(r => r.json())
      .then(d => {
        const existing = (d.sections || []).find((s: any) => s.section === "F")
        if (existing) {
          setCurrentStatus(existing.status)
          setReviewNote(existing.reviewNote || "")
          try {
            const p = JSON.parse(existing.data || "{}")
            const map = (arr: any[]) => arr.map((it: any) => ({ key: kf(), ...it }))
            setF1(map(p.f1 || [])); setF2(map(p.f2 || [])); setF3(map(p.f3 || [])); setF4(map(p.f4 || [])); setF5(map(p.f5 || []))
          } catch { /* ignore */ }
        }
        setLoading(false)
        initializedRef.current = true
      })
      .catch(() => setLoading(false))
  }, [status])

  useEffect(() => {
    if (!initializedRef.current) return
    if (isLocked || currentStatus === "submitted") return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void saveDraft() }, 700)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [f1, f2, f3, f4, f5])

  async function saveDraft() {
    if (savingRef.current) return
    savingRef.current = true
    setAutoSave("saving")
    try {
      const res = await fetch("/api/zongce/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "F", status: "draft",
          data: {
            f1: f1.map(({ key, ...rest }) => rest),
            f2: f2.map(({ key, ...rest }) => rest),
            f3: f3.map(({ key, ...rest }) => rest),
            f4: f4.map(({ key, ...rest }) => rest),
            f5: f5.map(({ key, ...rest }) => rest),
          },
        }),
      })
      if (!res.ok) throw new Error("保存失败")
      setAutoSave("saved")
      refreshStatus()
    } catch {
      setAutoSave("error")
    } finally {
      savingRef.current = false
    }
  }

  const refreshStatus = () => {
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "F")
      if (existing) { setCurrentStatus(existing.status); setReviewNote(existing.reviewNote || "") }
    }).catch(() => {})
  }

  async function submit() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaving(true); setError("")
    const res = await fetch("/api/zongce/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "F", status: "submitted",
        data: {
          f1: f1.map(({ key, ...rest }) => rest), f2: f2.map(({ key, ...rest }) => rest),
          f3: f3.map(({ key, ...rest }) => rest), f4: f4.map(({ key, ...rest }) => rest), f5: f5.map(({ key, ...rest }) => rest),
        },
      }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || "提交失败")
      setSaving(false)
      return
    }
    refreshStatus(); setSaving(false)
  }

  async function resetAll() {
    if (!confirm("确定清空本板块全部填写内容和佐证照片？\n此操作不可恢复。")) return
    if (timerRef.current) clearTimeout(timerRef.current)
    const res = await fetch("/api/zongce/sections?section=F", { method: "DELETE" })
    if (res.ok) {
      setF1([]); setF2([]); setF3([]); setF4([]); setF5([])
      setCurrentStatus("not_started"); setAutoSave("idle"); setError("")
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || "重置失败")
    }
  }

  // 条目佐证上传（通用）
  async function uploadPhoto(setter: React.Dispatch<React.SetStateAction<any[]>>, key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) { alert("请上传图片文件"); return }
    try {
      const compressed = await compressImage(file)
      if (compressed.size > 5 * 1024 * 1024) { alert("图片处理后仍超过 5MB，请更换更小的图片"); return }
      const fd = new FormData()
      fd.append("file", compressed)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || "上传失败"); return }
      setter((prev: any[]) => prev.map(it => it.key === key ? { ...it, photos: [...(it.photos || []), d.url] } : it))
    } catch (err) {
      alert(err instanceof Error ? err.message : "上传失败，请重试")
    }
  }

  // F1 职位分组
  const f1Groups = useMemo(() => {
    const g: { category: string; options: { type: string; label: string; year: number; sem: number }[] }[] = []
    for (const p of POSITION_PRESETS) {
      let grp = g.find(x => x.category === p.category)
      if (!grp) { grp = { category: p.category, options: [] }; g.push(grp) }
      grp.options.push({ type: p.type, label: p.label, year: p.yearScore, sem: p.semScore })
    }
    return g
  }, [])

  const f1Score = (it: F1Item) => {
    const p = POSITION_PRESETS.find(x => x.type === it.position)
    if (!p) return 0
    let s = it.duration === "sem" ? p.semScore : p.yearScore
    if (it.evaluation === "excellent") s += 0.5
    else if (it.evaluation === "fail") s -= 0.5
    return Math.max(0, s)
  }
  const f2Score = (it: F2Item) => {
    const r = it.rank === 0 ? 1 : it.rank // 特等奖按一等奖
    const base = F2_RANK_SCORES[it.category]?.[Math.min(Math.max(r, 1), 3) - 1] ?? 0
    if (!it.isTeam) return base
    const size = Math.min(Math.max(it.teamSize, 1), 8)
    const pos = Math.min(Math.max(it.position, 1), size)
    let coef = 0.2
    if (size >= 6) coef = [0.5, 0.5, 0.45, 0.4, 0.35, 0.2][Math.min(pos, 6) - 1] ?? 0.2
    else coef = ({ 2: [0.9, 0.85], 3: [0.8, 0.75, 0.7], 4: [0.7, 0.65, 0.6, 0.55], 5: [0.6, 0.55, 0.5, 0.45, 0.4] } as Record<number, number[]>)[size]?.[pos - 1] ?? 0.2
    return base * coef
  }
  const f3Score = (it: F3Item) => F3_HONOR_SCORES[it.level] || 0
  const f4Score = (it: F4Item) => {
    switch (it.type) {
      case "newspaper": return 0.5
      case "journal": return it.rank === 1 ? 2 : it.rank === 2 ? 0.8 : Math.max(0.2, 0.8 - ((it.rank || 3) - 2) * 0.2)
      case "essay": return ({ 1: 1, 2: 0.8, 3: 0.5, 4: 0.25 } as Record<number, number>)[it.rank || 4] ?? 0
      case "research": return it.level === "province" ? 2.5 : 2
      case "patent": return 2
    }
    return 0
  }
  const f5Score = (it: F5Item) => (F5_PENALTY_SCORES[it.type] || 0) * it.count

  // 通用照片缩略图渲染
  const photoStrip = (photos: string[], setter: React.Dispatch<React.SetStateAction<any[]>>, key: string) => (
    <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
      {photos.map(url => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer"
          style={{ position: "relative", width: 40, height: 40, borderRadius: 6, overflow: "hidden", border: "1px solid #E8E3D9", display: "block", background: "#F5F2ED" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="佐证" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {!isLocked && (
            <span onClick={e => { e.preventDefault(); e.stopPropagation(); setter((prev: any[]) => prev.map(it => it.key === key ? { ...it, photos: it.photos.filter((x: string) => x !== url) } : it)) }}
              style={{ position: "absolute", top: 1, right: 1, width: 13, height: 13, borderRadius: "50%", background: "rgba(196,97,90,.85)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".5rem", cursor: "pointer" }}>×</span>
          )}
        </a>
      ))}
      {!isLocked && (
        <label style={{ width: 40, height: 40, borderRadius: 6, border: "2px dashed #E3E7EB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#A8B4BD", fontSize: ".5rem", background: "#FAF9F6" }}>
          <Upload size={12} />佐证
          <input type="file" accept="image/*" className="zs-file-hide" onChange={e => uploadPhoto(setter, key, e)} />
        </label>
      )}
    </div>
  )

  // 通用子卡头
  const subHead = (title: string, sub: string, addLabel: string, onAdd: () => void, disabled: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: ".85rem", fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: ".62rem", color: "#A8B4BD", marginLeft: 8 }}>{sub}</span>
      </div>
      {!disabled && (
        <button className="btn-ghost" onClick={onAdd} style={{ fontSize: ".68rem", color: "#4A7C96", border: "1px solid rgba(74,124,150,.35)", padding: "4px 12px", minHeight: 28 }}>
          + {addLabel}
        </button>
      )}
    </div>
  )

  const itemRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "12px 14px", borderRadius: 10, background: "#FAF9F6", border: "1px solid #F0EDE7", marginBottom: 8 }

  if (status === "loading" || loading) return <p style={{ textAlign: "center", padding: 80, color: "#7A8A94" }}>加载中...</p>
  if (!session) return null

  const user = session.user

  return (
    <main className="zs-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
      </div>
      <div className="zs-id">
        <div className="zs-id-avatar">{(user as any)?.name?.[0] || "?"}</div>
        <div className="zs-id-info">
          <div className="zs-id-name">{(user as any)?.name}</div>
          <div className="zs-id-meta">
            <span><Calendar size={11} /> {(user as any)?.studentId || "—"}</span>
            <span><User size={11} /> 班务管理</span>
          </div>
        </div>
        <Link href="/zongce/select" className="zs-id-badge" title="切换综测学年">2025-2026 学年</Link>
      </div>
      <RuleBlock label="奖惩附加 F" rules={SECTION_META.F.rules} reviewer={SECTION_META.F.reviewer} max={SECTION_META.F.max} />
      <div className={`autosave-bar ${autoSave === "saving" ? "saving" : autoSave === "error" ? "error" : "saved"}`}>
        <span className="dot" />
        {autoSave === "saving" && <span>正在自动保存…</span>}
        {autoSave === "saved" && <span>已自动保存</span>}
        {autoSave === "error" && <span>自动保存失败，请检查网络</span>}
        {autoSave === "idle" && <span>填写内容将自动保存为草稿</span>}
      </div>

      {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* F1 学生工作 */}
      <div className="card" style={{ background: "#fff", padding: "20px 24px", marginBottom: 16 }}>
        {subHead("F1 · 学生工作加分", "最多叠加 3 个职位，考评优秀 +0.5 / 不合格 -0.5", "添加职位", () => setF1(prev => [...prev, { key: kf(), position: "", duration: "year", evaluation: "pass", photos: [] }]), isLocked)}
        {f1.length === 0 && <div style={{ textAlign: "center", padding: "20px 0", color: "#A8B4BD", fontSize: ".76rem" }}>暂无职位记录</div>}
        {f1.map(it => {
          const grp = f1Groups.find(g => g.options.some(o => o.type === it.position))
          const pos = POSITION_PRESETS.find(x => x.type === it.position)
          return (
            <div key={it.key} className="d-card" style={{ marginBottom: 10 }}>
              <div className="d-card-view">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span className="d-type">F1 · 学生工作</span>
                  <span className="d-score" style={{ color: f1Score(it) > 0 ? "#3D5A6E" : "#A8B4BD" }}>+{f1Score(it).toFixed(2)}<em>加分</em></span>
                </div>
                <div className="d-name">{pos?.label || "未选职位"}</div>
                <div className="d-meta">
                  {grp?.category || "未选级别"} · {grp?.category === "勤工助学" ? "按学期计 1.1 分" : (it.duration === "sem" ? "一学期" : "一学年")}
                  {F1_EVAL_CATEGORIES.includes(grp?.category || "") && ` · 考评${it.evaluation === "excellent" ? "优秀" : it.evaluation === "fail" ? "不合格" : "合格"}`}
                </div>
                <div style={{ width: "100%" }}>{photoStrip(it.photos, setF1, it.key)}</div>
                <button className="d-del" onClick={() => setF1(prev => prev.filter(x => x.key !== it.key))} disabled={isLocked}>删除</button>
              </div>
              <div className="d-card-edit">
                <div className="d-card-edit-row">
                  <PopSelect value={grp?.category || ""} width={140} disabled={isLocked}
                    options={f1Groups.map(g => ({ v: g.category, label: g.category }))}
                    onChange={v => { const g = f1Groups.find(x => x.category === v); setF1(prev => prev.map(x => x.key === it.key ? { ...x, position: g?.options[0]?.type || "", duration: v === "勤工助学" ? "sem" : x.duration } : x)) }} />
                  <PopSelect value={it.position} width={230} disabled={isLocked}
                    options={(grp?.options || []).map(o => ({ v: o.type, label: o.year > 0 ? `${o.label} · 学年${o.year}/学期${o.sem}` : `${o.label} · 学期${o.sem}` }))}
                    onChange={v => setF1(prev => prev.map(x => x.key === it.key ? { ...x, position: v } : x))} />
                  <PopSelect value={it.duration} width={96} disabled={isLocked}
                    options={grp?.category === "勤工助学" ? [{ v: "sem", label: "一学期" }] : F1_DURATION_OPTS}
                    onChange={v => setF1(prev => prev.map(x => x.key === it.key ? { ...x, duration: v } : x))} />
                  {F1_EVAL_CATEGORIES.includes(grp?.category || "") && (
                    <PopSelect value={it.evaluation} width={104} disabled={isLocked}
                      options={F1_EVAL_OPTS}
                      onChange={v => setF1(prev => prev.map(x => x.key === it.key ? { ...x, evaluation: v } : x))} />
                  )}
                  {!F1_EVAL_CATEGORIES.includes(grp?.category || "") && (
                    <span style={{ fontSize: ".62rem", color: "#A8B4BD" }}>{grp?.category === "勤工助学" ? "按学期计 1.1 分" : "该类职位无考评机制"}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {f1.length >= 3 && <div style={{ fontSize: ".64rem", color: "#C7924B" }}>已达 3 个职位上限</div>}
      </div>

      {/* F2 竞赛 */}
      <div className="card" style={{ background: "#fff", padding: "20px 24px", marginBottom: 16 }}>
        {subHead("F2 · 竞赛获奖", "A类一等 6 分起；特等奖按一等奖；团队按人数与排位分配", "添加竞赛", () => setF2(prev => [...prev, { key: kf(), name: "", category: "A", rank: 1, isTeam: false, teamSize: 1, position: 1, photos: [] }]), isLocked)}

        {/* 集体竞赛获奖分值分配规则说明 */}
        <div style={{ marginBottom: 16, border: "1px solid #E8E3D9", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", background: "#F9F8F5", fontSize: ".76rem", fontWeight: 700, color: "#3D5A6E", display: "flex", alignItems: "center", gap: 6 }}>
            <Medal size={13} /> 集体竞赛获奖分值分配规则（怎么填）
          </div>
          <div style={{ padding: "12px 14px", fontSize: ".7rem", color: "#556773", lineHeight: 1.9 }}>
            <div style={{ marginBottom: 8 }}>
              <b style={{ color: "#3D5A6E" }}>① 如何填写：</b>
              选择「团队」后，填写 <b>合作者总人数</b>（以获奖证书标注为准）和 <b>您的作者排位</b>（证书上的作者顺序）。
              若证书未区分作者先后位次，由团队内部自行协商确定排位后再填写。
            </div>
            <div style={{ marginBottom: 8 }}>
              <b style={{ color: "#3D5A6E" }}>② 分值分配表：</b>横向为团队总人数，纵向为您的排位，单元格为分得项目总分的比例
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".68rem", marginBottom: 8 }}>
              <thead>
                <tr style={{ background: "#F2F4F6" }}>
                  <th style={{ border: "1px solid #E0E5EC", padding: "5px 6px", fontWeight: 700, color: "#7A8A94" }}>排位 ＼ 人数</th>
                  {["2人", "3人", "4人", "5人", "6人及以上"].map(h => (
                    <th key={h} style={{ border: "1px solid #E0E5EC", padding: "5px 6px", fontWeight: 700, color: "#7A8A94" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["第1位", "90%", "80%", "70%", "60%", "50%"],
                  ["第2位", "85%", "75%", "65%", "55%", "50%"],
                  ["第3位", "—", "70%", "60%", "50%", "45%"],
                  ["第4位", "—", "—", "55%", "45%", "40%"],
                  ["第5位", "—", "—", "—", "40%", "35%"],
                  ["第6位及以后", "—", "—", "—", "—", "20%"],
                ].map((row, i) => (
                  <tr key={i} style={{ background: i % 2 ? "#FBFCFD" : "#fff" }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ border: "1px solid #E0E5EC", padding: "5px 6px", textAlign: "center", fontFamily: j === 0 ? "inherit" : "'JetBrains Mono',monospace", fontWeight: j === 0 ? 600 : 400, color: j === 0 ? "#3D5A6E" : "#4A5463" }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginBottom: 4 }}>
              <b style={{ color: "#3D5A6E" }}>③ 加分计算：</b>
              单人加分 = 该项目获奖基础分值（A-F 类 × 一/二/三等奖）× 对应排位分配比例。
              同一竞赛所有合作者单人加分相加，等于该项目总获奖赋分。
            </div>
          </div>
        </div>

        {f2.length === 0 && <div style={{ textAlign: "center", padding: "20px 0", color: "#A8B4BD", fontSize: ".76rem" }}>暂无竞赛记录</div>}
        {f2.map(it => (
          <div key={it.key} className="d-card" style={{ marginBottom: 10 }}>
            <div className="d-card-view">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span className="d-type">F2 · 竞赛获奖 · {it.category}类 · {it.rank === 0 ? "特等奖" : it.rank === 1 ? "一等奖" : it.rank === 2 ? "二等奖" : "三等奖"}{it.isTeam ? ` · 团队${it.teamSize}人第${it.position}位` : " · 个人"}</span>
                <span className="d-score" style={{ color: "#3D5A6E" }}>+{f2Score(it).toFixed(2)}<em>加分</em></span>
              </div>
              <div className="d-name">{it.name || "未填竞赛名称"}</div>
              <div className="d-meta">等级分 {f2Score(it).toFixed(2)} / 封顶 10</div>
              <div style={{ width: "100%" }}>{photoStrip(it.photos, setF2, it.key)}</div>
              <button className="d-del" onClick={() => setF2(prev => prev.filter(x => x.key !== it.key))} disabled={isLocked}>删除</button>
            </div>
              <div className="d-card-edit">
                <div className="d-card-edit-row">
                  <input className="form-input" placeholder="竞赛名称" value={it.name} disabled={isLocked}
                    onChange={e => setF2(prev => prev.map(x => x.key === it.key ? { ...x, name: e.target.value } : x))}
                    style={{ width: 170, height: 38, padding: "0 10px", fontSize: ".72rem", borderRadius: 8 }} />
                  <PopSelect value={it.category} width={140} disabled={isLocked}
                    options={F2_CAT_OPTS}
                    onChange={v => setF2(prev => prev.map(x => x.key === it.key ? { ...x, category: v } : x))} />
                  <PopSelect value={String(it.rank)} width={170} disabled={isLocked}
                    options={F2_RANK_OPTS}
                    onChange={v => setF2(prev => prev.map(x => x.key === it.key ? { ...x, rank: Number(v) } : x))} />
                  <PopSelect value={it.isTeam ? "team" : "solo"} width={104} disabled={isLocked}
                    options={F2_TEAM_OPTS}
                    onChange={v => setF2(prev => prev.map(x => x.key === it.key ? { ...x, isTeam: v === "team" } : x))} />
                  {it.isTeam && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: ".66rem", color: "#7A8A94", whiteSpace: "nowrap" }}>团队里面有多少个人</span>
                        <PopSelect value={String(it.teamSize || 1)} width={76} disabled={isLocked}
                          options={[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ v: String(n), label: `${n} 人` }))}
                          onChange={v => setF2(prev => prev.map(x => x.key === it.key ? { ...x, teamSize: Number(v) } : x))} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: ".66rem", color: "#7A8A94", whiteSpace: "nowrap" }}>我排第几位</span>
                        <PopSelect value={String(it.position || 1)} width={76} disabled={isLocked}
                          options={[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ v: String(n), label: `第 ${n} 位` }))}
                          onChange={v => setF2(prev => prev.map(x => x.key === it.key ? { ...x, position: Number(v) } : x))} />
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: ".6rem", color: "#C7924B" }}>同一比赛只取最高分，请勿重复添加；不同比赛分数可叠加</div>
              </div>
          </div>
        ))}
      </div>

      {/* F3 荣誉 */}
      <div className="card" style={{ background: "#fff", padding: "20px 24px", marginBottom: 16 }}>
        {subHead("F3 · 荣誉称号", "国家 +3 / 省级 +2.5 / 市级 +2 / 校级 +1", "添加称号", () => setF3(prev => [...prev, { key: kf(), level: "school", name: "", photos: [] }]), isLocked)}
        {f3.length === 0 && <div style={{ textAlign: "center", padding: "20px 0", color: "#A8B4BD", fontSize: ".76rem" }}>暂无荣誉称号</div>}
        {f3.map(it => (
          <div key={it.key} className="d-card" style={{ marginBottom: 10 }}>
            <div className="d-card-view">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span className="d-type">F3 · 荣誉称号 · {({ national: "国家级", province: "省级", city: "市级", school: "校级" } as Record<string, string>)[it.level] || ""}</span>
                <span className="d-score" style={{ color: "#3D5A6E" }}>+{f3Score(it).toFixed(2)}<em>加分</em></span>
              </div>
              <div className="d-name">{it.name || "未填称号名称"}</div>
              <div className="d-meta">需上传荣誉证书佐证</div>
              <div style={{ width: "100%" }}>{photoStrip(it.photos, setF3, it.key)}</div>
              <button className="d-del" onClick={() => setF3(prev => prev.filter(x => x.key !== it.key))} disabled={isLocked}>删除</button>
            </div>
            <div className="d-card-edit">
              <div className="d-card-edit-row">
                <PopSelect value={it.level} width={140} disabled={isLocked}
                  options={F3_LEVEL_OPTS}
                  onChange={v => setF3(prev => prev.map(x => x.key === it.key ? { ...x, level: v } : x))} />
                <input className="form-input" placeholder="称号名称（如：优秀志愿者）" value={it.name} disabled={isLocked}
                  onChange={e => setF3(prev => prev.map(x => x.key === it.key ? { ...x, name: e.target.value } : x))}
                  style={{ width: 200, height: 38, padding: "0 10px", fontSize: ".72rem", borderRadius: 8 }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* F4 科研 */}
      <div className="card" style={{ background: "#fff", padding: "20px 24px", marginBottom: 16 }}>
        {subHead("F4 · 科研奖励", "校报（累计≤1）/ 论文 / 征文 / 课题 / 专利", "添加成果", () => setF4(prev => [...prev, { key: kf(), type: "newspaper", detail: "", rank: 1, level: "city", photos: [] }]), isLocked)}
        {f4.length === 0 && <div style={{ textAlign: "center", padding: "20px 0", color: "#A8B4BD", fontSize: ".76rem" }}>暂无科研成果</div>}
        {f4.map(it => (
          <div key={it.key} className="d-card" style={{ marginBottom: 10 }}>
            <div className="d-card-view">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span className="d-type">F4 · 科研奖励 · {({ newspaper: "校报文章", journal: "期刊论文", essay: "征文/课题", research: "课题调研", patent: "专利" } as Record<string, string>)[it.type] || ""}</span>
                <span className="d-score" style={{ color: "#3D5A6E" }}>+{f4Score(it).toFixed(2)}<em>加分</em></span>
              </div>
              <div className="d-name">{it.detail || "未填说明"}</div>
              <div className="d-meta">需上传成果证明</div>
              <div style={{ width: "100%" }}>{photoStrip(it.photos, setF4, it.key)}</div>
              <button className="d-del" onClick={() => setF4(prev => prev.filter(x => x.key !== it.key))} disabled={isLocked}>删除</button>
            </div>
            <div className="d-card-edit">
              <div className="d-card-edit-row">
                <PopSelect value={it.type} width={250} disabled={isLocked}
                  options={F4_TYPE_OPTS}
                  onChange={v => setF4(prev => prev.map(x => x.key === it.key ? { ...x, type: v } : x))} />
                {it.type === "journal" && (
                  <PopSelect value={String(it.rank)} width={170} disabled={isLocked}
                    options={F4_JOURNAL_RANK_OPTS}
                    onChange={v => setF4(prev => prev.map(x => x.key === it.key ? { ...x, rank: Number(v) } : x))} />
                )}
                {it.type === "essay" && (
                  <PopSelect value={String(it.rank)} width={140} disabled={isLocked}
                    options={F4_ESSAY_RANK_OPTS}
                    onChange={v => setF4(prev => prev.map(x => x.key === it.key ? { ...x, rank: Number(v) } : x))} />
                )}
                {it.type === "research" && (
                  <PopSelect value={it.level} width={130} disabled={isLocked}
                    options={F4_RESEARCH_LEVEL_OPTS}
                    onChange={v => setF4(prev => prev.map(x => x.key === it.key ? { ...x, level: v } : x))} />
                )}
                <input className="form-input" placeholder={it.type === "patent" ? "专利名称/专利号" : "名称/说明"} value={it.detail} disabled={isLocked}
                  onChange={e => setF4(prev => prev.map(x => x.key === it.key ? { ...x, detail: e.target.value } : x))}
                  style={{ width: 170, height: 38, padding: "0 10px", fontSize: ".72rem", borderRadius: 8 }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* F5 惩罚 */}
      <div className="card" style={{ background: "#fff", padding: "20px 24px", marginBottom: 16 }}>
        {subHead("F5 · 惩罚扣分", "如有处分请如实填写，累计不超过 5 分", "添加处分", () => setF5(prev => [...prev, { key: kf(), type: "警告", count: 1 }]), isLocked)}
        {f5.length === 0 && <div style={{ textAlign: "center", padding: "20px 0", color: "#A8B4BD", fontSize: ".76rem" }}>无处分记录</div>}
        {f5.map(it => (
          <div key={it.key} className="d-card" style={{ marginBottom: 10 }}>
            <div className="d-card-view">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span className="d-type">F5 · 惩罚扣分</span>
                <span className="d-score" style={{ color: "#C4615A" }}>-{f5Score(it).toFixed(2)}<em>扣分</em></span>
              </div>
              <div className="d-name">{it.type}</div>
              <div className="d-meta">{it.count} 次 · 累计扣分不超过 5 分</div>
              <button className="d-del" onClick={() => setF5(prev => prev.filter(x => x.key !== it.key))} disabled={isLocked}>删除</button>
            </div>
            <div className="d-card-edit">
              <div className="d-card-edit-row">
                <PopSelect value={it.type} width={200} disabled={isLocked}
                  options={F5_TYPE_OPTS}
                  onChange={v => setF5(prev => prev.map(x => x.key === it.key ? { ...x, type: v } : x))} />
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <input type="number" min={1} max={5} value={it.count || ""} placeholder="1" disabled={isLocked}
                    onChange={e => setF5(prev => prev.map(x => x.key === it.key ? { ...x, count: Math.max(1, Math.min(5, Number(e.target.value) || 1)) } : x))}
                    style={{ width: 56, height: 38, border: "1.5px solid #E3E7EB", borderRadius: 8, textAlign: "center", fontSize: ".72rem", outline: "none" }} />
                  <span style={{ fontSize: ".68rem", color: "#556773" }}>次</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="zs-summary">
        <div className="zs-summary-main">
          <div className="zs-sum-item"><div className="l">F 得分</div><div className="v" style={{ color: "#3D5A6E" }}>{score.toFixed(2)}</div><div className="u">/ 10 分</div></div>
        </div>
        {score > 0 && <div className="zs-sum-eq">F1 + F2 + F3 + F4 - F5 = {score.toFixed(2)}（封顶 10 分）</div>}
      </div>

      {!isLocked && currentStatus !== "submitted" && (
        <div className="zs-actions" style={{ marginTop: 4 }}>
          <button className="zs-btn zs-btn-pri" onClick={submit} disabled={saving || FORM_LOCKED}><Send size={14} /> 提交审核</button>
          <button className="zs-btn zs-btn-sec" onClick={resetAll} disabled={saving || FORM_LOCKED} style={{ color: "#C4615A", borderColor: "rgba(196,97,90,.45)" }}>重置清空</button>
        </div>
      )}
      {!isLocked && currentStatus === "submitted" && (
        <div className="zs-actions">
          <span style={{ fontSize: ".75rem", color: "#C7924B", marginRight: "auto" }}>已提交审核，等待班长审核</span>
          <button className="zs-btn zs-btn-sec" onClick={() => setCurrentStatus("draft")} disabled={saving || FORM_LOCKED}><Undo2 size={14} /> 撤回修改</button>
        </div>
      )}
      {isLocked && (
        <div className="card" style={{ textAlign: "center", padding: 24, background: "#fff" }}>
          <div style={{ color: "#5A8C6F", fontSize: ".85rem", fontWeight: 600, marginBottom: 10 }}>该板块已审核通过</div>
          <button className="zs-btn zs-btn-sec" onClick={() => setCurrentStatus("draft")} disabled={saving || FORM_LOCKED}><Undo2 size={14} /> 重新编辑（需重新审核）</button>
        </div>
      )}
      {currentStatus === "returned" && <div className="card" style={{ marginTop: 16, borderColor: "#C4615A", background: "#FDF3F2", color: "#C4615A", fontSize: ".82rem", padding: "14px 18px" }}>
        <div style={{ fontWeight: 700, marginBottom: reviewNote ? 6 : 0 }}>退回修改，请修正后重新提交</div>
        {reviewNote && <div style={{ color: "#8A4B45", fontSize: ".8rem", lineHeight: 1.7 }}>退回原因：{reviewNote}</div>}
      </div>}
    </main>
  )
}

const D_TYPES = [
  { v: "ceremony", label: "大型活动（开/闭幕式、方阵、颁奖典礼）", score: 0.2, icon: <PartyPopper size={15} style={{ color: "#C7924B" }} /> },
  { v: "team_unranked", label: "队伍代表参赛未获奖", score: 0.3, icon: <Dumbbell size={15} style={{ color: "#3D5A6E" }} /> },
  { v: "performance", label: "文艺表演", score: 0.3, icon: <Music size={15} style={{ color: "#7C6BB3" }} /> },
  { v: "rehearsal", label: "文艺排练", score: 0.2, icon: <Clapperboard size={15} style={{ color: "#7C6BB3" }} /> },
  { v: "sports", label: "阳光体育系列活动", score: 0.5, icon: <Zap size={15} style={{ color: "#4A8B5C" }} /> },
  { v: "sports_unranked", label: "运动会参与未获奖", score: 0.3, icon: <Medal size={15} style={{ color: "#4A8B5C" }} /> },
  { v: "award", label: "获奖项目（按名次加分）", score: null, icon: <Trophy size={15} style={{ color: "#C7924B" }} /> },
]
const D_LEVELS = [
  { v: "college", label: "院级", badge: { text: "院", color: "#5B8E9E" } },
  { v: "school", label: "校级", badge: { text: "校", color: "#3D5A6E" } },
  { v: "province", label: "省级", badge: { text: "省", color: "#C7924B" } },
  { v: "national", label: "国家级", badge: { text: "国", color: "#C4615A" } },
]
const D_RANKS = [
  { v: 1, label: "一等奖", badge: { text: "金", color: "#C7924B" } },
  { v: 2, label: "二等奖", badge: { text: "银", color: "#9AA0A6" } },
  { v: 3, label: "三等奖", badge: { text: "铜", color: "#A67B4F" } },
  { v: 4, label: "第4-8名", badge: { text: "4-8", color: "#A8B4BD" } },
  { v: 5, label: "其他（请注明）", badge: { text: "其", color: "#7C6BB3" } },
]
const D_RANK_SCORE: Record<string, Record<number, number>> = {
  college: { 1: 1.5, 2: 1, 3: 0.5, 4: 0 },
  school: { 1: 2, 2: 1.5, 3: 1, 4: 0.5 },
  province: { 1: 2.5, 2: 2, 3: 1.5, 4: 1 },
  national: { 1: 3, 2: 2.5, 3: 2, 4: 1.5 },
}

interface DItem {
  key: string; type: string; name: string; date: string; level: string; rank: number; rankNote: string; photos: string[]; score?: number
}

function DForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [items, setItems] = useState<DItem[]>([])
  const [currentStatus, setCurrentStatus] = useState("not_started")
  const [reviewNote, setReviewNote] = useState("")
  const [autoSave, setAutoSave] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const initializedRef = useRef(false)
  const savingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLocked = currentStatus === "approved"

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/sections")
      .then(r => r.json())
      .then(d => {
        const existing = (d.sections || []).find((s: any) => s.section === "D")
        if (existing) {
          setCurrentStatus(existing.status)
          setReviewNote(existing.reviewNote || "")
          try {
            const parsed = JSON.parse(existing.data || "{}")
            if (Array.isArray(parsed.items)) {
              setItems(parsed.items.map((it: any, i: number) => ({
                key: `k${Date.now()}-${i}`,
                type: it.type || "ceremony",
                name: it.name || "",
                date: it.date || "",
                level: it.level || "school",
                rank: Number(it.rank) || 1,
                rankNote: it.rankNote || "",
                photos: Array.isArray(it.photos) ? it.photos : [],
              })))
            }
          } catch { /* ignore */ }
        }
        setLoading(false)
        initializedRef.current = true
      })
      .catch(() => setLoading(false))
  }, [status])

  // 自动保存（防抖 700ms）
  useEffect(() => {
    if (!initializedRef.current) return
    if (isLocked || currentStatus === "submitted") return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void saveDraft() }, 700)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [items])

  async function saveDraft() {
    if (savingRef.current) return
    savingRef.current = true
    setAutoSave("saving")
    try {
      const res = await fetch("/api/zongce/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "D", status: "draft", data: { items: items.map(({ key, ...rest }) => rest) } }),
      })
      if (!res.ok) throw new Error("保存失败")
      setAutoSave("saved")
      refreshStatus()
    } catch {
      setAutoSave("error")
    } finally {
      savingRef.current = false
    }
  }

  const refreshStatus = () => {
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "D")
      if (existing) { setCurrentStatus(existing.status); setReviewNote(existing.reviewNote || "") }
    }).catch(() => {})
  }

  async function submit() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaving(true); setError("")
    const res = await fetch("/api/zongce/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "D", status: "submitted", data: { items: items.map(({ key, ...rest }) => rest) } }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || "提交失败")
      setSaving(false)
      return
    }
    refreshStatus(); setSaving(false)
  }

  // 重置：清空全部项目与佐证照片
  async function resetAll() {
    if (!confirm("确定清空本板块全部活动和佐证照片？\n此操作不可恢复。")) return
    if (timerRef.current) clearTimeout(timerRef.current)
    const res = await fetch("/api/zongce/sections?section=D", { method: "DELETE" })
    if (res.ok) {
      setItems([])
      setCurrentStatus("not_started")
      setAutoSave("idle")
      setError("")
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || "重置失败")
    }
  }

  const updateItem = (key: string, patch: Partial<DItem>) => {
    setItems(prev => prev.map(it => it.key === key ? { ...it, ...patch } : it))
  }

  // 项目证明照片上传（客户端压缩转码后上传）
  async function handleItemUpload(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) { alert("请上传图片文件"); return }
    try {
      // 压缩转码：HEIC/超大图 → JPEG（浏览器可显示、减小体积）
      const compressed = await compressImage(file)
      if (compressed.size > 5 * 1024 * 1024) { alert("图片处理后仍超过 5MB，请更换更小的图片"); return }
      const fd = new FormData()
      fd.append("file", compressed)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || "上传失败"); return }
      setItems(prev => prev.map(it => it.key === key ? { ...it, photos: [...(it.photos || []), d.url] } : it))
    } catch (err) {
      alert(err instanceof Error ? err.message : "上传失败，请重试")
    }
  }

  const removePhoto = (key: string, url: string) => {
    setItems(prev => prev.map(it => it.key === key ? { ...it, photos: (it.photos || []).filter(x => x !== url) } : it))
  }

  const itemScore = (it: DItem): number => {
    if (it.type === "award") {
      if (it.rank === 5) return it.score ?? 0 // 其他等级：审核员确认加分（未确认 0）
      return D_RANK_SCORE[it.level]?.[it.rank] ?? 0
    }
    return D_TYPES.find(t => t.v === it.type)?.score ?? 0
  }
  const totalScore = calcDScore(items.map(({ key, ...rest }) => rest))

  if (status === "loading" || loading) return <p style={{ textAlign: "center", padding: 80, color: "#7A8A94" }}>加载中...</p>
  if (!session) return null

  const user = session.user

  return (
    <main className="zs-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
      </div>
      <div className="zs-id">
        <div className="zs-id-avatar">{(user as any)?.name?.[0] || "?"}</div>
        <div className="zs-id-info">
          <div className="zs-id-name">{(user as any)?.name}</div>
          <div className="zs-id-meta">
            <span><Calendar size={11} /> {(user as any)?.studentId || "—"}</span>
            <span><User size={11} /> 班务管理</span>
          </div>
        </div>
        <Link href="/zongce/select" className="zs-id-badge" title="切换综测学年">2025-2026 学年</Link>
      </div>
      <RuleBlock label="文体活动 D" rules={SECTION_META.D.rules} reviewer={SECTION_META.D.reviewer} max={SECTION_META.D.max} />
      <div className={`autosave-bar ${autoSave === "saving" ? "saving" : autoSave === "error" ? "error" : "saved"}`}>
        <span className="dot" />
        {autoSave === "saving" && <span>正在自动保存…</span>}
        {autoSave === "saved" && <span>已自动保存</span>}
        {autoSave === "error" && <span>自动保存失败，请检查网络</span>}
        {autoSave === "idle" && <span>填写内容将自动保存为草稿</span>}
      </div>

      {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

            {/* 每个活动项目一张卡片，卡片内 3:7 两栏：左展示 / 右编辑 */}
      {items.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "44px 20px", background: "#fff", marginBottom: 16 }}>
          <Trophy size={28} style={{ color: "#D5DBDF", marginBottom: 10 }} />
          <div style={{ color: "#7A8A94", fontSize: ".85rem" }}>暂无文体活动记录</div>
          <div style={{ color: "#A8B4BD", fontSize: ".72rem", marginTop: 6 }}>点击下方「+ 添加项目」开始填写</div>
        </div>
      ) : (
        <div className="d-card-list">
          {items.map(it => {
            const t = D_TYPES.find(x => x.v === it.type)
            const typeLabel = t?.label.split("（")[0] || it.type
            const awardTxt = it.type === "award"
              ? (it.rank === 5 ? "其他·" + (it.rankNote || "未注明") : (D_LEVELS.find(l => l.v === it.level)?.label || "") + "·" + (D_RANKS.find(r => r.v === it.rank)?.label || ""))
              : ""
            return (
              <div key={it.key} className="d-card">
                {/* 左栏：内容展示（铅字印刷风 · 适配原站色系） */}
                <div className="d-card-view">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span className="d-type">{typeLabel}{it.type === "award" ? " · " + awardTxt : ""}</span>
                    <span className="d-score" style={{ color: it.rank === 5 && it.type === "award" ? "#C7924B" : "#3D5A6E" }}>
                      {it.rank === 5 && it.type === "award"
                        ? (it.score != null && it.score > 0 ? `+${it.score.toFixed(2)}` : "待确认")
                        : "+" + itemScore(it).toFixed(2)}
                      <em>加分</em>
                    </span>
                  </div>
                  <div className="d-name">{it.name || typeLabel}</div>
                  <div className="d-meta">
                    {it.date || "未选日期"} · {(it.photos || []).length > 0 ? it.photos.length + " 张证明" : "无证明"}
                  </div>
                  {(it.photos || []).length > 0 && (
                    <div className="d-card-photos">
                      {(it.photos || []).map(url => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer" title="查看证明" style={{ position: "relative" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="证明" />
                          {!isLocked && (
                            <span onClick={e => { e.preventDefault(); e.stopPropagation(); removePhoto(it.key, url) }}
                              style={{ position: "absolute", top: 1, right: 1, width: 13, height: 13, borderRadius: "50%", background: "rgba(196,97,90,.85)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".5rem", cursor: "pointer" }}>×</span>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                  <button className="d-del" onClick={() => setItems(prev => prev.filter(x => x.key !== it.key))} disabled={isLocked}>删除</button>
                </div>
                {/* 右栏：编辑选项卡 */}
                <div className="d-card-edit">
                  <label className="d-form-label">活动类型</label>
                  <div className="d-card-edit-row">
                    <PopSelect value={it.type} width={272} disabled={isLocked}
                      options={D_TYPES.map(t2 => ({ v: t2.v, label: t2.label, icon: t2.icon }))}
                      onChange={v => updateItem(it.key, { type: v })} />
                  </div>
                  <label className="d-form-label">活动名称</label>
                  <div className="d-card-edit-row">
                    <input className="form-input" placeholder="活动名称（如：校运会开幕式）" value={it.name} disabled={isLocked}
                      onChange={e => updateItem(it.key, { name: e.target.value })}
                      style={{ width: 300, height: 38, padding: "0 12px", fontSize: ".76rem", borderRadius: 9 }} />
                  </div>
                  <label className="d-form-label">日期</label>
                  <div className="d-card-edit-row">
                    <MiniCalendar value={it.date} onChange={d => updateItem(it.key, { date: d })} disabled={isLocked} />
                  </div>
                  {it.type === "award" && (
                    <>
                      <label className="d-form-label">获奖级别 / 等级</label>
                      <div className="d-card-edit-row">
                        <PopSelect value={it.level} width={128} disabled={isLocked}
                          options={D_LEVELS.map(l => ({ v: l.v, label: l.label, badge: l.badge }))}
                          onChange={v => updateItem(it.key, { level: v })} />
                        <PopSelect value={String(it.rank)} width={168} disabled={isLocked}
                          options={D_RANKS.map(r => ({ v: String(r.v), label: r.label, badge: r.badge }))}
                          onChange={v => updateItem(it.key, { rank: Number(v) })} />
                        {it.rank === 5 && (
                          <input className="form-input" placeholder="请注明具体奖项（如：特等奖、优胜奖）" value={it.rankNote} disabled={isLocked}
                            onChange={e => updateItem(it.key, { rankNote: e.target.value })}
                            style={{ width: 220, height: 38, padding: "0 12px", fontSize: ".74rem", borderRadius: 9 }} />
                        )}
                      </div>
                    </>
                  )}
                  <label className="d-form-label">证明照片</label>
                  <div className="d-card-edit-row">
                    {!isLocked && (
                      <label style={{ width: 46, height: 46, borderRadius: 7, border: "2px dashed #E3E7EB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#A8B4BD", fontSize: ".5rem", gap: 2, background: "#FAF9F6" }}>
                        <Upload size={13} />证明
                        <input type="file" accept="image/*" className="zs-file-hide" onChange={e => handleItemUpload(it.key, e)} />
                      </label>
                    )}
                    {(it.photos || []).length > 0 && (
                      <span style={{ fontSize: ".6rem", color: "#A8B4BD" }}>已传 {it.photos.length} 张（左栏缩略图可删除）</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 添加项目按钮 */}
      {!isLocked && (
        <button className="d-add-btn" style={{ marginBottom: 16 }}
          onClick={() => setItems(prev => [...prev, { key: "k" + Date.now() + "-" + Math.random().toString(36).slice(2, 7), type: "ceremony", name: "", date: "", level: "school", rank: 1, rankNote: "", photos: [] }])}>
          + 添加项目
        </button>
      )}

      <div className="zs-summary">
        <div className="zs-summary-main">
          <div className="zs-sum-item"><div className="l">记录项目</div><div className="v">{items.length}</div><div className="u">项</div></div>
          <div className="zs-sum-div" />
          <div className="zs-sum-item"><div className="l">D 得分</div><div className="v" style={{ color: "#3D5A6E" }}>{totalScore.toFixed(2)}</div><div className="u">/ 5 分</div></div>
        </div>
        {totalScore > 0 && <div className="zs-sum-eq">各项加分合计 = {totalScore.toFixed(2)}（封顶 5 分）</div>}
      </div>

      {!isLocked && currentStatus !== "submitted" && (
        <div className="zs-actions" style={{ marginTop: 4 }}>
          <button className="zs-btn zs-btn-pri" onClick={submit} disabled={saving || FORM_LOCKED}><Send size={14} /> 提交审核</button>
          <button className="zs-btn zs-btn-sec" onClick={resetAll} disabled={saving || FORM_LOCKED} style={{ color: "#C4615A", borderColor: "rgba(196,97,90,.45)" }}>重置清空</button>
        </div>
      )}
      {!isLocked && currentStatus === "submitted" && (
        <div className="zs-actions">
          <span style={{ fontSize: ".75rem", color: "#C7924B", marginRight: "auto" }}>已提交审核，等待文体委员审核</span>
          <button className="zs-btn zs-btn-sec" onClick={() => { setCurrentStatus("draft"); }} disabled={saving || FORM_LOCKED}><Undo2 size={14} /> 撤回修改</button>
        </div>
      )}
      {isLocked && (
        <div className="card" style={{ textAlign: "center", padding: 24, background: "#fff" }}>
          <div style={{ color: "#5A8C6F", fontSize: ".85rem", fontWeight: 600, marginBottom: 10 }}>该板块已审核通过</div>
          <button className="zs-btn zs-btn-sec" onClick={() => setCurrentStatus("draft")} disabled={saving || FORM_LOCKED}><Undo2 size={14} /> 重新编辑（需重新审核）</button>
        </div>
      )}
      {currentStatus === "returned" && <div className="card" style={{ marginTop: 16, borderColor: "#C4615A", background: "#FDF3F2", color: "#C4615A", fontSize: ".82rem", padding: "14px 18px" }}>
        <div style={{ fontWeight: 700, marginBottom: reviewNote ? 6 : 0 }}>退回修改，请修正后重新提交</div>
        {reviewNote && <div style={{ color: "#8A4B45", fontSize: ".8rem", lineHeight: 1.7 }}>退回原因：{reviewNote}</div>}
      </div>}
    </main>
  )
}

// ============================================================
// C 星级宿舍（学生只读视图，由生活委员评定填写）
// ============================================================
const STAR_LEVELS: Record<number, { label: string; desc: string; color: string }> = {
  5: { label: "五星级宿舍", desc: "2.5 分", color: "#C7924B" },
  4: { label: "四星级宿舍", desc: "2 分", color: "#5B8E9E" },
  3: { label: "三星级宿舍", desc: "1 分", color: "#3E7A5C" },
  0: { label: "未获星级", desc: "0 分", color: "#A8B4BD" },
}

function CView() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ starLevel: number; civilizedDorm: boolean } | null>(null)
  const [secStatus, setSecStatus] = useState("not_started")

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/sections")
      .then(r => r.json())
      .then(d => {
        const existing = (d.sections || []).find((s: any) => s.section === "C")
        if (existing) {
          setSecStatus(existing.status)
          try {
            const parsed = JSON.parse(existing.data || "{}")
            setData({ starLevel: Number(parsed.starLevel) || 0, civilizedDorm: !!parsed.civilizedDorm })
          } catch { setData(null) }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [status])

  if (status === "loading" || loading) return <p style={{ textAlign: "center", padding: 80, color: "#7A8A94" }}>加载中...</p>
  if (!session) return null

  const user = session.user
  const filled = data !== null && secStatus !== "not_started"
  const score = calcCScore(data || {})
  const star = STAR_LEVELS[data?.starLevel ?? 0] || STAR_LEVELS[0]

  return (
    <main className="zs-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
      </div>
      <div className="zs-id">
        <div className="zs-id-avatar">{(user as any)?.name?.[0] || "?"}</div>
        <div className="zs-id-info">
          <div className="zs-id-name">{(user as any)?.name}</div>
          <div className="zs-id-meta">
            <span><Calendar size={11} /> {(user as any)?.studentId || "—"}</span>
            <span><User size={11} /> 班务管理</span>
          </div>
        </div>
        <Link href="/zongce/select" className="zs-id-badge" title="切换综测学年">2025-2026 学年</Link>
      </div>
      <RuleBlock label="星级宿舍 C" rules={SECTION_META.C.rules} reviewer={SECTION_META.C.reviewer} max={SECTION_META.C.max} />

      {!filled ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 40px", background: "#fff" }}>
          <Home size={30} style={{ color: "#D5DBDF", marginBottom: 12 }} />
          <h2 style={{ marginBottom: 8, fontSize: "1rem" }}>生活委员尚未评定</h2>
          <p style={{ color: "#7A8A94", fontSize: ".85rem" }}>本板块由生活委员统一评定填写，完成后可在此查看您的宿舍星级得分</p>
        </div>
      ) : (
        <>
          {/* 星级展示 */}
          <div className="card" style={{ background: "#fff", marginBottom: 16, textAlign: "center", padding: "30px 24px" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", background: data.starLevel > 0 ? "#FDF5EA" : "#F5F4F1", color: star.color, fontSize: "1.6rem", fontWeight: 700 }}>
              {data.starLevel > 0 ? "★".repeat(Math.min(data.starLevel, 5)) : "—"}
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: star.color }}>{star.label}</div>
            <div style={{ fontSize: ".72rem", color: "#7A8A94", marginTop: 4 }}>评定得分：{score.toFixed(2)} / 2.5 分</div>
            {data.civilizedDorm && (
              <span className="tag" style={{ marginTop: 10, background: "#EDF7F0", color: "#4A8B5C", border: "1px solid rgba(74,139,92,.3)", fontSize: ".64rem" }}>文明宿舍 +0.5</span>
            )}
          </div>

          {/* 得分明细 */}
          <div className="card" style={{ background: "#fff" }}>
            <div style={{ fontSize: ".82rem", fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Home size={15} style={{ color: "#3D5A6E" }} /> 得分明细
              <span className="tag" style={{ marginLeft: "auto", fontSize: ".6rem", background: "#EDF7F0", color: "#4A8B5C", border: "1px solid rgba(74,139,92,.3)" }}>已评定</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 8, background: "#F9F8F5" }}>
                <span style={{ fontSize: ".8rem", color: "#556773" }}>宿舍星级（{star.label}）</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: ".9rem", color: data.starLevel > 0 ? "#3D5A6E" : "#A8B4BD" }}>
                  +{data.starLevel > 0 ? (data.starLevel === 5 ? 2.5 : data.starLevel === 4 ? 2 : 1).toFixed(2) : "0.00"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 8, background: data.civilizedDorm ? "#EDF7F0" : "#F9F8F5" }}>
                <span style={{ fontSize: ".8rem", color: "#556773" }}>
                  文明宿舍
                  {data.civilizedDorm && <span className="tag" style={{ marginLeft: 8, fontSize: ".58rem", background: "#5A8C6F", color: "#fff", border: "none" }}>获评</span>}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: ".9rem", color: data.civilizedDorm ? "#5A8C6F" : "#A8B4BD" }}>
                  {data.civilizedDorm ? "+0.50" : "+0.00"}
                </span>
              </div>
            </div>
          </div>

          <div className="zs-summary">
            <div className="zs-summary-main">
              <div className="zs-sum-item"><div className="l">C 得分</div><div className="v" style={{ color: "#3D5A6E" }}>{score.toFixed(2)}</div><div className="u">/ 2.5 分</div></div>
            </div>
            <div className="zs-sum-eq">{star.desc}{data.civilizedDorm ? " + 0.5（文明宿舍）" : ""} = {score.toFixed(2)}</div>
          </div>
          <p style={{ fontSize: ".7rem", color: "#A8B4BD", textAlign: "center", marginTop: 12 }}>
            如有疑问，请联系生活委员核实
          </p>
        </>
      )}
    </main>
  )
}

// ============================================================
// B 集会政治学习（学生只读视图，由团支书评定填写）
// ============================================================
function BView() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ excellentMember: boolean; partyMember: boolean; youthStudyCount: number } | null>(null)
  const [secStatus, setSecStatus] = useState("not_started")

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/sections")
      .then(r => r.json())
      .then(d => {
        const existing = (d.sections || []).find((s: any) => s.section === "B")
        if (existing) {
          setSecStatus(existing.status)
          try {
            const parsed = JSON.parse(existing.data || "{}")
            setData({ excellentMember: !!parsed.excellentMember, partyMember: !!parsed.partyMember, youthStudyCount: Number(parsed.youthStudyCount) || 0 })
          } catch { setData(null) }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [status])

  if (status === "loading" || loading) return <p style={{ textAlign: "center", padding: 80, color: "#7A8A94" }}>加载中...</p>
  if (!session) return null

  const user = session.user
  const filled = data !== null && secStatus !== "not_started"
  const score = calcBScore(data || {})
  const youthBonus = Math.floor((data?.youthStudyCount || 0) / 3) * 0.2

  return (
    <main className="zs-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
      </div>
      <div className="zs-id">
        <div className="zs-id-avatar">{(user as any)?.name?.[0] || "?"}</div>
        <div className="zs-id-info">
          <div className="zs-id-name">{(user as any)?.name}</div>
          <div className="zs-id-meta">
            <span><Calendar size={11} /> {(user as any)?.studentId || "—"}</span>
            <span><User size={11} /> 班务管理</span>
          </div>
        </div>
        <Link href="/zongce/select" className="zs-id-badge" title="切换综测学年">2025-2026 学年</Link>
      </div>
      <RuleBlock label="集会政治学习 B" rules={SECTION_META.B.rules} reviewer={SECTION_META.B.reviewer} max={SECTION_META.B.max} />

      {!filled ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 40px", background: "#fff" }}>
          <Users size={30} style={{ color: "#D5DBDF", marginBottom: 12 }} />
          <h2 style={{ marginBottom: 8, fontSize: "1rem" }}>团支书尚未评定</h2>
          <p style={{ color: "#7A8A94", fontSize: ".85rem" }}>本板块由团支书统一评定填写，完成后可在此查看您的得分明细</p>
        </div>
      ) : (
        <>
          {/* 得分明细 */}
          <div className="card" style={{ background: "#fff", marginBottom: 16 }}>
            <div style={{ fontSize: ".82rem", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={15} style={{ color: "#3D5A6E" }} /> 我的得分明细
              <span className="tag" style={{ marginLeft: "auto", fontSize: ".6rem", background: "#EDF7F0", color: "#4A8B5C", border: "1px solid rgba(74,139,92,.3)" }}>已评定</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 8, background: "#F9F8F5" }}>
                <span style={{ fontSize: ".8rem", color: "#556773" }}>基础分</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: ".9rem", color: "#3D5A6E" }}>+1.50</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 8, background: "#F9F8F5" }}>
                <span style={{ fontSize: ".8rem", color: "#556773" }}>
                  优秀团员
                  {data.excellentMember && <span className="tag" style={{ marginLeft: 8, fontSize: ".58rem", background: "#C7924B", color: "#fff", border: "none" }}>已勾选</span>}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: ".9rem", color: "#A8B4BD" }}>标记</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 8, background: "#F9F8F5" }}>
                <span style={{ fontSize: ".8rem", color: "#556773" }}>
                  党支部工作小组成员
                  {data.partyMember && <span className="tag" style={{ marginLeft: 8, fontSize: ".58rem", background: "#5B8E9E", color: "#fff", border: "none" }}>已勾选</span>}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: ".9rem", color: "#A8B4BD" }}>标记</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 8, background: "#F9F8F5" }}>
                <span style={{ fontSize: ".8rem", color: "#556773" }}>
                  青年大学习 · 完成 {data?.youthStudyCount || 0} 期
                  <span style={{ marginLeft: 6, fontSize: ".64rem", color: "#A8B4BD" }}>（每 3 期 +0.2 分）</span>
                </span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: ".9rem", color: youthBonus > 0 ? "#3D5A6E" : "#A8B4BD" }}>
                  +{youthBonus.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 总分 */}
          <div className="zs-summary">
            <div className="zs-summary-main">
              <div className="zs-sum-item"><div className="l">B 得分</div><div className="v" style={{ color: "#3D5A6E" }}>{score.toFixed(2)}</div><div className="u">/ 2.5 分</div></div>
            </div>
            <div className="zs-sum-eq">1.5 + 青年大学习 {Math.floor((data?.youthStudyCount || 0) / 3)} 组（每 3 期 +0.2） = {score.toFixed(2)}</div>
          </div>
          <p style={{ fontSize: ".7rem", color: "#A8B4BD", textAlign: "center", marginTop: 12 }}>
            如有疑问，请联系团支书核实
          </p>
        </>
      )}
    </main>
  )
}

// ============================================================
// 五级制成绩弹出选择器（V3：浮层面板，fixed 视口定位防遮挡）
// ============================================================
const GRADE_OPTIONS = [
  { v: "优秀", c: "#3E7A5C", short: "优" },
  { v: "良好", c: "#5B8E9E", short: "良" },
  { v: "中等", c: "#C7924B", short: "中" },
  { v: "及格", c: "#B8783F", short: "及" },
  { v: "不及格", c: "#C4615A", short: "不" },
]

function GradeSelect({ value, disabled, onChange }: { value: string; disabled?: boolean; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; up: boolean; topGap: number; bottomGap: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // 打开时按视口计算面板位置：防表格 overflow 裁剪 + 下方空间不足时向上展开
  useEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const panelW = 200
    let left = rect.left
    if (left + panelW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - panelW - 8)
    const up = window.innerHeight - rect.bottom < 250
    setPos({
      left,
      up,
      topGap: rect.bottom + 4,
      bottomGap: window.innerHeight - rect.top + 4,
    })
  }, [open])

  // 点击外部 / 滚动 / 窗口变化时关闭
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener("mousedown", onDocClick)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [open])

  return (
    <div ref={wrapRef} style={{ display: "inline-block" }}>
      <button ref={btnRef} type="button" disabled={disabled}
        className={`pop-sel-btn ${value ? "" : "empty"} ${disabled ? "disabled" : ""}`}
        onClick={() => setOpen(o => !o)}>
        {value || "-"}
        <span className="pop-sel-arrow">▾</span>
      </button>
      {open && pos && (
        <div className="pop-sel-panel"
          style={{ left: pos.left, top: pos.up ? undefined : pos.topGap, bottom: pos.up ? pos.bottomGap : undefined }}>
          {GRADE_OPTIONS.map(g => (
            <div key={g.v} className={`pop-sel-item ${value === g.v ? "selected" : ""}`}
              onClick={() => { onChange(g.v); setOpen(false) }}>
              <span className="pop-sel-tag" style={{ background: g.c }}>{g.short}</span>
              {g.v}
              {value === g.v && <span className="pop-sel-check">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// 规则说明区（结构化排版）
// ============================================================
function RuleBlock({ label, rules, reviewer, max, extra }: { label: string; rules: string; reviewer: string; max: number; extra?: string }) {
  const lines = rules.split("\n").filter(Boolean)
  const lead = lines[0]
  const items = lines.slice(1)
  return (
    <div className="zs-rule">
      <h2>{label}</h2>
      <p className="zs-rule-lead">{lead}</p>
      <div className="zs-rule-list">
        {items.map((line, i) => {
          const isPenalty = line.includes("扣")
          return (
            <div key={i} className="zs-rule-item">
              <span className={`zs-rule-icon ${isPenalty ? "penalty" : "bonus"}`}>{isPenalty ? "−" : "✓"}</span>
              <span>{line}</span>
            </div>
          )
        })}
      </div>
      <div className="meta">
        <User size={12} /> 审核人：{reviewer}
        {max > 0 ? ` · 满分 ${max} 分` : ""}
        {extra ? ` · ${extra}` : ""}
      </div>
    </div>
  )
}

// ============================================================
// A 学风考勤
// ============================================================
function SectionAForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [absences, setAbsences] = useState(0)
  const [tardies, setTardies] = useState(0)
  const [specialLeaves, setSpecialLeaves] = useState(0)
  const [currentStatus, setCurrentStatus] = useState("not_started")
  const [reviewNote, setReviewNote] = useState("")

  const isLocked = currentStatus === "approved"
  const score = calcAScore(absences, tardies)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/sections")
      .then(r => r.json())
      .then(d => {
        const existing = (d.sections || []).find((s: any) => s.section === "A")
        if (existing) {
          setCurrentStatus(existing.status)
          setReviewNote(existing.reviewNote || "")
          try {
            const data = JSON.parse(existing.data || "{}")
            setAbsences(Number(data.absences) || 0)
            setTardies(Number(data.tardies) || 0)
            setSpecialLeaves(Number(data.specialLeaves) || 0)
          } catch { /* ignore */ }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [status])

  const refreshStatus = () => {
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "A")
      if (existing) { setCurrentStatus(existing.status); setReviewNote(existing.reviewNote || "") }
    }).catch(() => {})
  }

  async function submit(s: string) {
    setSaving(true); setError("")
    const res = await fetch("/api/zongce/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "A", data: { absences, tardies, specialLeaves }, status: s }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || "保存失败")
      setSaving(false)
      return
    }
    refreshStatus()
    setSaving(false)
  }

  if (status === "loading" || loading) return <p style={{ textAlign: "center", padding: 80, color: "#7A8A94" }}>加载中...</p>
  if (!session) return null

  const user = session.user

  return (
    <main className="zs-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
      </div>
      <div className="zs-id">
        <div className="zs-id-avatar">{(user as any)?.name?.[0] || "?"}</div>
        <div className="zs-id-info">
          <div className="zs-id-name">{(user as any)?.name}</div>
          <div className="zs-id-meta">
            <span><Calendar size={11} /> {(user as any)?.studentId || "—"}</span>
            <span><User size={11} /> 班务管理</span>
          </div>
        </div>
        <Link href="/zongce/select" className="zs-id-badge" title="切换综测学年">2025-2026 学年</Link>
      </div>
      <RuleBlock label="学风考勤 A" rules={SECTION_META.A.rules} reviewer={SECTION_META.A.reviewer} max={SECTION_META.A.max} />

      {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ background: "#fff", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">旷课次数</label>
            <input className="form-input" type="number" min={0} value={absences} disabled={isLocked}
              onChange={e => setAbsences(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">迟到次数</label>
            <input className="form-input" type="number" min={0} value={tardies} disabled={isLocked}
              onChange={e => setTardies(Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </div>
        <div className="form-group" style={{ margin: 0, marginBottom: 16 }}>
          <label className="form-label">特殊情况请假次数（辅导员同意，不扣分）</label>
          <input className="form-input" type="number" min={0} value={specialLeaves} disabled={isLocked}
            onChange={e => setSpecialLeaves(Math.max(0, Number(e.target.value) || 0))} />
        </div>
        <div className="zs-summary">
          <div className="zs-summary-main">
            <div className="zs-sum-item"><div className="l">旷课扣分</div><div className="v">-{absences * 1}</div><div className="u">1分/次</div></div>
            <div className="zs-sum-div" />
            <div className="zs-sum-item"><div className="l">迟到扣分</div><div className="v">-{Math.round(tardies * 0.25 * 100) / 100}</div><div className="u">0.25分/次</div></div>
            <div className="zs-sum-div" />
            <div className="zs-sum-item"><div className="l">请假不扣分</div><div className="v" style={{ color: "#5A8C6F" }}>{specialLeaves}</div><div className="u">特殊情况</div></div>
            <div className="zs-sum-div" />
            <div className="zs-sum-item"><div className="l">当前得分</div><div className="v" style={{ color: "#3D5A6E" }}>{score.toFixed(2)}</div><div className="u">/ 5 分</div></div>
          </div>
          <div className="zs-sum-eq">A = 5 - {absences}×1 - {tardies}×0.25 = {score.toFixed(2)}（0 ~ 5 分）</div>
        </div>
      </div>

      {/* 操作区: 草稿/退回 → 保存+提交；已提交 → 撤回修改；已通过 → 重新编辑 */}
      {!isLocked && currentStatus !== "submitted" && (
        <div className="zs-actions">
          <button className="zs-btn zs-btn-sec" onClick={() => submit("draft")} disabled={saving || FORM_LOCKED}><Save size={14} /> 保存草稿</button>
          <button className="zs-btn zs-btn-pri" onClick={() => submit("submitted")} disabled={saving || FORM_LOCKED}><Send size={14} /> 提交审核</button>
        </div>
      )}
      {!isLocked && currentStatus === "submitted" && (
        <div className="zs-actions">
          <span style={{ fontSize: ".75rem", color: "#C7924B", marginRight: "auto" }}>已提交审核，等待班长审核</span>
          <button className="zs-btn zs-btn-sec" onClick={() => submit("draft")} disabled={saving || FORM_LOCKED}><Undo2 size={14} /> 撤回修改</button>
        </div>
      )}
      {isLocked && (
        <div className="card" style={{ textAlign: "center", padding: 24, background: "#fff" }}>
          <div style={{ color: "#5A8C6F", fontSize: ".85rem", fontWeight: 600, marginBottom: 10 }}>该板块已审核通过</div>
          <button className="zs-btn zs-btn-sec" onClick={() => submit("draft")} disabled={saving || FORM_LOCKED}><Undo2 size={14} /> 重新编辑（需重新审核）</button>
        </div>
      )}
      {currentStatus === "returned" && <div className="card" style={{ marginTop: 16, borderColor: "#C4615A", background: "#FDF3F2", color: "#C4615A", fontSize: ".82rem", padding: "14px 18px" }}>
        <div style={{ fontWeight: 700, marginBottom: reviewNote ? 6 : 0 }}>退回修改，请修正后重新提交</div>
        {reviewNote && <div style={{ color: "#8A4B45", fontSize: ".8rem", lineHeight: 1.7 }}>退回原因：{reviewNote}</div>}
      </div>}
    </main>
  )
}

// ============================================================
// S 学习成绩
// ============================================================
function SScoreForm() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<any[]>([])
  const [scores, setScores] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [currentStatus, setCurrentStatus] = useState("not_started")
  const [reviewNote, setReviewNote] = useState("")
  const [evidence, setEvidence] = useState<string[]>([])
  // 成绩汇总手填值（空 = 未手填，以系统自动计算为准）
  const [gpaForm, setGpaForm] = useState({ sem1: "", sem2: "", year: "", total: "" })
  // 自动保存状态
  const [autoSave, setAutoSave] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [lastSavedAt, setLastSavedAt] = useState("")
  const [uploading, setUploading] = useState(false)
  const initializedRef = useRef(false)
  const savingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLocked = currentStatus === "approved"

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/zongce/init", { method: "POST" }).catch(() => {}).then(() => loadData())
  }, [status])

  async function loadData() {
    try {
      setLoading(true)
      const [cRes, sRes] = await Promise.all([fetch("/api/zongce/courses"), fetch("/api/zongce/sections")])
      const cData = await cRes.json(); const sData = await sRes.json()
      const courseList = cData.courses || []; const existingScores = sData.courseScores || []
      const merged = courseList.map((c: any) => {
        const found = existingScores.find((s: any) => s.courseId === c.id)
        return found || { courseId: c.id, course: c, score: null, grade: null, gpa: null, repeat: false }
      })
      setCourses(courseList); setScores(merged)
      const existing = (sData.sections || []).find((s: any) => s.section === "S")
      if (existing) {
        setCurrentStatus(existing.status)
        setReviewNote(existing.reviewNote || "")
        try { setEvidence(JSON.parse(existing.evidence || "[]")) } catch { setEvidence([]) }
        try {
          const d = JSON.parse(existing.data || "{}")
          setGpaForm({
            sem1: d.sem1Gpa != null && d.sem1Gpa !== "" ? String(d.sem1Gpa) : "",
            sem2: d.sem2Gpa != null && d.sem2Gpa !== "" ? String(d.sem2Gpa) : "",
            year: d.yearGpa != null && d.yearGpa !== "" ? String(d.yearGpa) : "",
            total: d.totalScore != null && d.totalScore !== "" ? String(d.totalScore) : "",
          })
        } catch { /* ignore */ }
      }
      setLoading(false)
      initializedRef.current = true
    } catch (e: any) { setError(e.message || "加载失败"); setLoading(false) }
  }

  function updateScore(cid: string, f: string, v: any) { setScores(p => p.map(s => s.courseId === cid ? { ...s, [f]: v ?? null } : s)) }

  // 数据变化 → 防抖 800ms 自动保存草稿（已提交/已通过时不自动改动状态）
  useEffect(() => {
    if (!initializedRef.current) return
    if (isLocked || currentStatus === "submitted") return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void saveDraft() }, 800)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [scores, gpaForm, evidence])

  async function saveDraft() {
    if (savingRef.current) return
    savingRef.current = true
    setAutoSave("saving")
    try {
      const changed = scores.filter((s: any) => s.score != null || s.gpa != null || s.grade)
      const [r1, r2] = await Promise.all([
        fetch("/api/zongce/scores", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scores: changed.map((s: any) => ({ courseId: s.courseId, score: s.score, grade: s.grade, gpa: s.gpa, repeat: s.repeat })) }) }),
        fetch("/api/zongce/sections", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          section: "S", status: "draft", evidence,
          data: { sem1Gpa: gpaForm.sem1, sem2Gpa: gpaForm.sem2, yearGpa: gpaForm.year, totalScore: gpaForm.total },
        }) }),
      ])
      if (!r1.ok || !r2.ok) throw new Error("保存失败")
      setAutoSave("saved")
      setLastSavedAt(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }))
      refreshStatus()
    } catch {
      setAutoSave("error")
    } finally {
      savingRef.current = false
    }
  }

  const refreshStatus = () => {
    fetch("/api/zongce/sections").then(r => r.json()).then(d => {
      const existing = (d.sections || []).find((s: any) => s.section === "S")
      if (existing) { setCurrentStatus(existing.status); setReviewNote(existing.reviewNote || "") }
    }).catch(() => {})
  }

  // 佐证图片上传（客户端压缩转码）
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) { alert("请上传图片文件"); return }
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      if (compressed.size > 5 * 1024 * 1024) { alert("图片处理后仍超过 5MB，请更换更小的图片"); return }
      const fd = new FormData()
      fd.append("file", compressed)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || "上传失败"); return }
      setEvidence(prev => [...prev, d.url])
    } catch (err) {
      alert(err instanceof Error ? err.message : "上传失败，请重试")
    } finally {
      setUploading(false)
    }
  }

  async function submit(status: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    // 提交审核必须全部课程已填成绩（草稿不限制）
    if (status === "submitted") {
      const missing = courses.filter(c => {
        const s = scores.find(x => x.courseId === c.id)
        const hasScore = s && (s.score != null || s.grade || s.gpa != null)
        return !hasScore
      })
      if (missing.length > 0) {
        setError(`还有 ${missing.length} 门课程未填写成绩（${missing.map(c => c.name).slice(0, 5).join("、")}${missing.length > 5 ? " 等" : ""}），请全部填完后再提交`)
        return
      }
    }
    setError("")
    setSaving(true)
    const changed = scores.filter((s: any) => s.score != null || s.gpa != null || s.grade)
    await fetch("/api/zongce/scores", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scores: changed.map((s: any) => ({ courseId: s.courseId, score: s.score, grade: s.grade, gpa: s.gpa, repeat: s.repeat })) }) })
    // 得分由服务端计算（sections PUT 内重算，手填汇总值优先），此处提交状态、数据与成绩汇总
    const res = await fetch("/api/zongce/sections", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      section: "S", status, evidence,
      data: { sem1Gpa: gpaForm.sem1, sem2Gpa: gpaForm.sem2, yearGpa: gpaForm.year, totalScore: gpaForm.total },
    }) })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setSaving(false)
      setError(d.error || "提交失败")
      return
    }
    loadData(); setSaving(false)
  }

  // 重置：清空全部课程成绩与佐证照片
  async function resetAll() {
    if (!confirm("确定清空所有课程成绩和佐证照片？\n此操作不可恢复。")) return
    if (timerRef.current) clearTimeout(timerRef.current)
    const res = await fetch("/api/zongce/sections?section=S", { method: "DELETE" })
    if (res.ok) {
      setGpaForm({ sem1: "", sem2: "", year: "", total: "" })
      setEvidence([])
      loadData()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || "重置失败")
    }
  }

  if (status === "loading" || loading) return <p style={{ textAlign: "center", padding: 80, color: "#7A8A94" }}>加载中...</p>
  if (error) return <p style={{ textAlign: "center", padding: 80, color: "#C4615A" }}>{error} <button onClick={loadData} className="btn-ghost">重试</button></p>
  if (!session) return null

  const user = session.user; const sem1 = scores.filter((s: any) => s.course?.semester === 1); const sem2 = scores.filter((s: any) => s.course?.semester === 2)
  const courseMeta = courses.map(c => ({ id: c.id, name: c.name, credits: c.credits, semester: c.semester, isElective: c.isElective }))
  const scoreMeta = scores.map(s => ({ courseId: s.courseId, score: s.score, grade: s.grade, gpa: s.gpa }))
  const sem1GPA = calcWeightedGPA(courseMeta.filter(c => c.semester === 1), scoreMeta)
  const sem2GPA = calcWeightedGPA(courseMeta.filter(c => c.semester === 2), scoreMeta)
  const wGPA = calcWeightedGPA(courseMeta, scoreMeta)
  const sScore = calcSScore(wGPA)
  // 手填值优先（教务系统数值），未填则用系统自动计算
  const effYearGpa = gpaForm.year !== "" && Number(gpaForm.year) >= 0 ? Number(gpaForm.year) : wGPA
  const effTotal = gpaForm.total !== "" && Number(gpaForm.total) >= 0 ? Number(gpaForm.total) : sScore
  const filled = scores.filter((s: any) => s.score != null || s.grade != null || s.gpa != null).length

  return (
    <main className="zs-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button className="zs-back" onClick={() => router.push("/zongce")}><ArrowLeft size={15} /> 返回综测看板</button>
      </div>
      <div className="zs-id">
        <div className="zs-id-avatar">{(user as any)?.name?.[0] || "?"}</div>
        <div className="zs-id-info"><div className="zs-id-name">{(user as any)?.name}</div><div className="zs-id-meta"><span><Calendar size={11} /> {(user as any)?.studentId || "—"}</span><span><User size={11} /> 班务管理</span></div></div>
        <Link href="/zongce/select" className="zs-id-badge" title="切换综测学年">2025-2026 学年</Link>
      </div>
      <RuleBlock label="学习成绩 S" rules={SECTION_META.S.rules} reviewer={SECTION_META.S.reviewer} max={0} extra={`本学年 ${courses.length} 门课程`} />
      {/* 自动保存状态 */}
      <div className={`autosave-bar ${autoSave === "saving" ? "saving" : autoSave === "error" ? "error" : "saved"}`}>
        <span className="dot" />
        {autoSave === "saving" && <span>正在自动保存…</span>}
        {autoSave === "saved" && <span>已自动保存 {lastSavedAt}</span>}
        {autoSave === "error" && <span>自动保存失败，请检查网络后重新填写</span>}
        {autoSave === "idle" && <span>填写内容将自动保存为草稿</span>}
      </div>
      {[1, 2].map(sem => {
        const list = sem === 1 ? sem1 : sem2; if (list.length === 0) return null
        return (
          <div key={sem} className="zs-semester">
            <h3>第{sem === 1 ? "一" : "二"}学期 <span className="count">{list.length} 门</span></h3>
            <div className="zs-table"><table>
              <thead><tr><th style={{ textAlign: "left", width: "34%" }}>课程</th><th style={{ width: "7%" }}>学分</th><th style={{ width: "13%" }}>成绩</th><th style={{ width: "11%" }}>绩点</th><th style={{ width: "8%" }}>重修</th></tr></thead>
              <tbody>
                {list.map((s: any) => { const c = s.course; const isGrade = c && ["军事技能", "AI辅助程序设计实践"].includes(c.name)
                  return (<tr key={s.courseId}><td className="cn">{c?.name || s.courseId}{isGrade && <span className="zs-tag-grade">五级制</span>}{s.repeat && <span className="zs-tag-grade" style={{ background: "#FDF5EA", color: "#C7924B", border: "1px solid rgba(201,146,75,.35)" }}>重修</span>}</td><td className="cr">{c?.credits}</td>
                    <td style={{ textAlign: "center" }}>{isGrade ? <GradeSelect value={s.grade || ""} disabled={isLocked} onChange={v => updateScore(s.courseId, "grade", v)} /> : <input className="zs-input" type="number" min={0} max={100} placeholder="-" value={s.score ?? ""} disabled={isLocked} onChange={e => updateScore(s.courseId, "score", e.target.value ? Number(e.target.value) : null)} />}</td>
                    <td style={{ textAlign: "center" }}><input className={"zs-gpa" + (s.gpa != null ? " filled" : "")} type="number" step="0.1" min={0} max={5} placeholder="-" value={s.gpa ?? ""} disabled={isLocked} onChange={e => updateScore(s.courseId, "gpa", e.target.value ? Number(e.target.value) : null)} /></td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => {
                          const rep = !s.repeat
                          setScores(p => p.map(x => {
                            if (x.courseId !== s.courseId) return x
                            if (rep) return { ...x, repeat: true, gpa: x.gpa != null ? x.gpa : 0 } // 勾选重修 → 绩点默认 0（仍可改/可填成绩）
                            return { ...x, repeat: false, ...(x.gpa === 0 && x.score == null && !x.grade ? { gpa: null } : {}) }
                          }))
                        }}
                        disabled={isLocked || currentStatus === "submitted"}
                        title={s.repeat ? "取消重修" : (currentStatus === "submitted" ? "已提交审核，重修标记已固定" : "标记为重修（绩点默认 0）")}
                        style={{
                          width: 20, height: 20, borderRadius: 5, cursor: (isLocked || currentStatus === "submitted") ? "not-allowed" : "pointer",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          border: `1.5px solid ${s.repeat ? "#C7924B" : "#D8DEE3"}`,
                          background: s.repeat ? "#C7924B" : "#fff",
                          opacity: (isLocked || currentStatus === "submitted") ? .55 : 1,
                          transition: "all .15s",
                        }}
                      >
                        {s.repeat && <Check size={13} color="#fff" strokeWidth={3} />}
                      </button>
                    </td></tr>)
                })}
              </tbody>
            </table></div>
          </div>
        )
      })}
      {courses.length === 0 && <div className="card" style={{ textAlign: "center", padding: 40, color: "#7A8A94", background: "#fff" }}>暂未配置课程</div>}
      {courses.length > 0 && (
        <>
          {/* 学年成绩汇总：自动计算预填提示，可手动覆盖为教务系统数值 */}
          <div className="zs-gpa-card">
            <div className="zs-gpa-card-head">
              <div className="zs-gpa-card-title">学年成绩汇总</div>
              <div className="zs-gpa-card-hint">系统已按课程成绩自动计算，如与教务系统数值不一致，可直接填写覆盖</div>
            </div>
            <div className="zs-gpa-grid">
              <div className="zs-gpa-item">
                <label className="zs-gpa-label">第一学期平均学分绩点 <span className="zs-gpa-unit">GPA₁</span></label>
                <input className={"zs-gpa-input" + (gpaForm.sem1 !== "" ? " filled" : "")} type="number" step="0.01" min={0} max={5}
                  placeholder={sem1GPA > 0 ? sem1GPA.toFixed(2) : "—"} value={gpaForm.sem1} disabled={isLocked}
                  onChange={e => setGpaForm(f => ({ ...f, sem1: e.target.value }))} />
              </div>
              <div className="zs-gpa-item">
                <label className="zs-gpa-label">第二学期平均学分绩点 <span className="zs-gpa-unit">GPA₂</span></label>
                <input className={"zs-gpa-input" + (gpaForm.sem2 !== "" ? " filled" : "")} type="number" step="0.01" min={0} max={5}
                  placeholder={sem2GPA > 0 ? sem2GPA.toFixed(2) : "—"} value={gpaForm.sem2} disabled={isLocked}
                  onChange={e => setGpaForm(f => ({ ...f, sem2: e.target.value }))} />
              </div>
              <div className="zs-gpa-item">
                <label className="zs-gpa-label">学年平均学分绩点 <span className="zs-gpa-unit">GPA</span></label>
                <input className={"zs-gpa-input" + (gpaForm.year !== "" ? " filled" : "")} type="number" step="0.01" min={0} max={5}
                  placeholder={wGPA > 0 ? wGPA.toFixed(2) : "—"} value={gpaForm.year} disabled={isLocked}
                  onChange={e => setGpaForm(f => ({ ...f, year: e.target.value }))} />
              </div>
              <div className="zs-gpa-item">
                <label className="zs-gpa-label">学年总成绩得分 <span className="zs-gpa-unit">S</span></label>
                <input className={"zs-gpa-input" + (gpaForm.total !== "" ? " filled" : "")} type="number" step="0.01" min={0} max={130}
                  placeholder={sScore > 0 ? sScore.toFixed(2) : "—"} value={gpaForm.total} disabled={isLocked}
                  onChange={e => setGpaForm(f => ({ ...f, total: e.target.value }))} />
              </div>
            </div>
            <div className="zs-gpa-auto-note" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {sem1GPA <= 0 && sem2GPA <= 0 && wGPA <= 0 ? (
                <span>填写课程成绩后，系统将自动计算 GPA₁ / GPA₂ / 学年 GPA / S 得分作为参考（S = 学年 GPA × 35 × 0.7）</span>
              ) : (
                <>
                  <span style={{ fontWeight: 600, color: "#556773" }}>自动计算参考：</span>
                  {sem1GPA > 0 && <span>GPA₁ = <b style={{ fontFamily: "'JetBrains Mono',monospace" }}>{sem1GPA.toFixed(2)}</b></span>}
                  {sem2GPA > 0 && <span>GPA₂ = <b style={{ fontFamily: "'JetBrains Mono',monospace" }}>{sem2GPA.toFixed(2)}</b></span>}
                  {wGPA > 0 && <span>学年 GPA = <b style={{ fontFamily: "'JetBrains Mono',monospace" }}>{wGPA.toFixed(2)}</b></span>}
                  {sScore > 0 && <span>S = <b style={{ fontFamily: "'JetBrains Mono',monospace" }}>{sScore.toFixed(2)}</b></span>}
                  <span style={{ color: "#A8B4BD" }}>（S = 学年 GPA × 35 × 0.7）</span>
                </>
              )}
            </div>
          </div>
          <div className="zs-summary">
            <div className="zs-summary-main">
              <div className="zs-sum-item"><div className="l">已填绩点</div><div className="v">{filled}</div><div className="u">/ {courses.length} 门</div></div>
              <div className="zs-sum-div" /><div className="zs-sum-item"><div className="l">学年平均绩点</div><div className="v">{effYearGpa > 0 ? effYearGpa.toFixed(2) : "--"}</div><div className="u">{gpaForm.year !== "" ? "手填值" : "系统自动算"}</div></div>
              <div className="zs-sum-div" /><div className="zs-sum-item"><div className="l">S 得分</div><div className="v">{effTotal > 0 ? effTotal.toFixed(2) : "--"}</div><div className="u">{gpaForm.total !== "" ? "手填值" : `= ${wGPA > 0 ? wGPA.toFixed(2) : "--"} x 35 x 0.7`}</div></div>
            </div>
            {effTotal > 0 && <div className="zs-sum-eq">S = {effYearGpa.toFixed(2)} x 35 x 0.7 = {(effYearGpa * 35 * 0.7).toFixed(2)}</div>}
          </div>
        </>
      )}
      {!isLocked && (
        <div className="zs-evidence">
          <div className="label"><Upload size={14} /> 佐证材料 · 成绩截图</div>
          <div className="zs-ev-grid">
            {evidence.map((url, i) => (
              <div key={i} className="zs-ev-thumb" style={{ overflow: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`佐证 ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <span className="x" onClick={() => setEvidence(evidence.filter((_, j) => j !== i))}><X size={10} /></span>
              </div>
            ))}
            <label className="zs-ev-upload" style={uploading ? { opacity: .55, cursor: "wait" } : {}}>
              <Upload size={16} />{uploading ? "上传中" : "上传"}
              <input type="file" accept="image/*" className="zs-file-hide" disabled={uploading || isLocked} onChange={handleUpload} />
            </label>
          </div>
          <div style={{ fontSize: ".64rem", color: "#A8B4BD", marginTop: 8 }}>支持 jpg / png / webp，单张不超过 5MB，上传后自动保存</div>
        </div>
      )}
      {/* 操作区: 草稿/退回 → 保存+提交；已提交 → 撤回修改；已通过 → 重新编辑 */}
      {!isLocked && !FORM_LOCKED && currentStatus !== "submitted" && <div className="zs-actions"><button className="zs-btn zs-btn-sec" onClick={() => submit("draft")} disabled={saving || FORM_LOCKED}><Save size={14} /> 保存草稿</button><button className="zs-btn zs-btn-pri" onClick={() => submit("submitted")} disabled={saving || FORM_LOCKED}><Send size={14} /> 提交审核</button><button className="zs-btn zs-btn-sec" onClick={resetAll} disabled={saving || FORM_LOCKED} style={{ color: "#C4615A", borderColor: "rgba(196,97,90,.45)" }}>重置清空</button></div>}
      {!isLocked && currentStatus === "submitted" && (
        <div className="zs-actions">
          <span style={{ fontSize: ".75rem", color: "#3D5A6E", marginRight: "auto" }}>已提交审核，等待学习委员审核</span>
          <button className="zs-btn zs-btn-sec" onClick={() => submit("draft")} disabled={saving || FORM_LOCKED}><Undo2 size={14} /> 撤回修改</button>
        </div>
      )}
      {isLocked && (
        <div className="card" style={{ textAlign: "center", padding: 24, background: "#fff" }}>
          <div style={{ color: "#5A8C6F", fontSize: ".85rem", fontWeight: 600, marginBottom: 10 }}>该板块已审核通过</div>
          <button className="zs-btn zs-btn-sec" onClick={() => submit("draft")} disabled={saving || FORM_LOCKED}><Undo2 size={14} /> 重新编辑（需重新审核）</button>
        </div>
      )}
      {currentStatus === "returned" && <div className="card" style={{ marginTop: 16, borderColor: "#C4615A", background: "#FDF3F2", color: "#C4615A", fontSize: ".82rem", padding: "14px 18px" }}>
        <div style={{ fontWeight: 700, marginBottom: reviewNote ? 6 : 0 }}>退回修改，请修正后重新提交</div>
        {reviewNote && <div style={{ color: "#8A4B45", fontSize: ".8rem", lineHeight: 1.7 }}>退回原因：{reviewNote}</div>}
      </div>}
    </main>
  )
}
