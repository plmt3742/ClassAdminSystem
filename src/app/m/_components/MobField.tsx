"use client"

import { AlertCircle } from "lucide-react"

type FieldType = "text" | "password" | "number" | "textarea" | "select"

interface MobFieldProps {
  /** 字段标签 */
  label?: string
  /** 必填标记 */
  required?: boolean
  /** 错误文案（出现时控件描红） */
  error?: string
  /** 底部辅助说明 */
  hint?: string
  /** 控件类型；不传则渲染 children 作为自定义控件 */
  type?: FieldType
  /** 受控值 */
  value?: string | number
  /** 非受控初始值 */
  defaultValue?: string | number
  placeholder?: string
  /** 值变化（统一为字符串，number 类型亦传字符串） */
  onChange?: (value: string) => void
  onBlur?: () => void
  /** select 选项 */
  options?: { value: string; label: string }[]
  disabled?: boolean
  name?: string
  maxLength?: number
  inputMode?: "numeric" | "text" | "tel" | "email" | "decimal"
  min?: number
  max?: number
  step?: number
  autoComplete?: string
  children?: React.ReactNode
}

/**
 * 表单字段：label + 必填星 + 控件（input/textarea/select 或自定义 children）+ 错误/提示。
 * 控件 44px 高、surface-2 底、12px 圆角、聚焦主色描边。
 */
export default function MobField(props: MobFieldProps) {
  const {
    label,
    required,
    error,
    hint,
    type = "text",
    value,
    defaultValue,
    placeholder,
    onChange,
    onBlur,
    options = [],
    disabled,
    name,
    maxLength,
    inputMode,
    min,
    max,
    step,
    autoComplete,
    children,
  } = props

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange?.(e.target.value)
  }

  let control: React.ReactNode
  if (children !== undefined) {
    control = children
  } else if (type === "textarea") {
    control = (
      <textarea
        className="mob-field__control mob-field__control--textarea"
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        name={name}
        maxLength={maxLength}
        rows={4}
      />
    )
  } else if (type === "select") {
    control = (
      <select
        className="mob-field__control mob-field__control--select"
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        name={name}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  } else {
    control = (
      <input
        className="mob-field__control"
        type={type}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        name={name}
        maxLength={maxLength}
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        autoComplete={autoComplete}
      />
    )
  }

  return (
    <label className={`mob-field${error ? " mob-field--error" : ""}`}>
      {label ? (
        <span className="mob-field__label">
          {label}
          {required ? <span className="mob-field__req" aria-hidden="true">*</span> : null}
        </span>
      ) : null}
      {control}
      {error ? (
        <span className="mob-field__error">
          <AlertCircle size={14} />
          {error}
        </span>
      ) : hint ? (
        <span className="mob-field__hint">{hint}</span>
      ) : null}
    </label>
  )
}
