"use client"

export interface MobSegmentedOption {
  value: string
  label: string
}

interface MobSegmentedProps {
  options: MobSegmentedOption[]
  value: string
  onChange: (value: string) => void
  /** 等宽模式：所有选项自适应按钮栏宽度（适合 2-5 个短选项） */
  equal?: boolean
}

/** 水平分段选择器（待审核/已通过/已退回 等筛选），equal 时等宽自适应，否则溢出可横向滚动。 */
export default function MobSegmented({ options, value, onChange, equal }: MobSegmentedProps) {
  return (
    <div className={`mob-seg${equal ? " mob-seg--equal" : ""}`} role="tablist">
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`mob-seg__item${active ? " mob-seg__item--active" : ""}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
