'use client'

import { useState, type ReactNode } from 'react'

/** 코드잇 State 블록 대응 — 좌: 라이브 무대 / 우: Control 패널. */

export type Control =
  | { kind: 'radio'; name: string; label: string; options: string[]; initial?: string }
  | { kind: 'toggle'; name: string; label: string; initial?: boolean }
  | { kind: 'text'; name: string; label: string; initial: string }

export type ControlValues = Record<string, string | boolean>

const initialValues = (controls: Control[]): ControlValues =>
  Object.fromEntries(controls.map(c => [
    c.name,
    c.kind === 'radio' ? (c.initial ?? c.options[0])
      : c.kind === 'toggle' ? (c.initial ?? false)
      : c.initial,
  ]))

const isNumeric = (options: string[]) => options.every(o => /^\d+(\.\d+)?$/.test(o))

/** 하나만 고르는 세그먼티드 컨트롤. 선택한 칸이 면으로 채워진다. */
function Segmented({ options, value, onChange }: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="ds-segmented">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          className="ds-segmented__item"
          data-selected={opt === value}
          aria-pressed={opt === value}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/** 단계가 있는 숫자 값을 위한 슬라이더. 인덱스로 움직여 정해진 값만 고르게 한다. */
function StepSlider({ options, value, onChange }: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  const index = Math.max(0, options.indexOf(value))
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 'var(--spacing-2)',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-body)', fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}>{value}</span>
        <span style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)' }}>
          {options[0]}–{options[options.length - 1]}
        </span>
      </div>
      <input
        type="range"
        className="ds-slider"
        min={0}
        max={options.length - 1}
        step={1}
        value={index}
        onChange={e => onChange(options[Number(e.target.value)])}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {options.map(opt => (
          <span key={opt} style={{
            fontSize: 'var(--text-badge)', fontFamily: 'var(--font-mono)',
            color: opt === value ? 'var(--color-text-body)' : 'var(--color-text-placeholder)',
          }}>{opt}</span>
        ))}
      </div>
    </div>
  )
}

/* 체크박스는 기본 모양이 Tailwind preflight 아래에서 검은 사각으로 떨어진다.
   접근성을 위해 실제 input은 숨겨 남기고, 보이는 부분만 직접 그린다. */
function Switch({ on }: { on: boolean }) {
  return (
    <span style={{
      width: 32, height: 18, borderRadius: 'var(--radius-pill)', flexShrink: 0,
      background: on ? 'var(--color-primary-base)' : 'var(--color-neutral-300)',
      display: 'inline-flex', alignItems: 'center', padding: 2,
      transition: 'background var(--transition-fast)',
    }}>
      <span style={{
        width: 14, height: 14, borderRadius: '50%', background: 'var(--color-surface-card)',
        transform: on ? 'translateX(14px)' : 'none', transition: 'transform var(--transition-fast)',
      }} />
    </span>
  )
}

export function Playground({ controls, render, tone = 'paper' }: {
  controls: Control[]
  /* set을 함께 넘긴다 — 무대에서 직접 조작하는 컴포넌트(칩 선택 등)가 컨트롤 값을 되돌려 줄 수 있어야
     "컨트롤과 무대가 같은 상태를 본다"는 말이 사실이 된다. */
  render: (v: ControlValues, set: (k: string, v: string | boolean) => void) => ReactNode
  tone?: 'paper' | 'dark'
}) {
  const [values, setValues] = useState<ControlValues>(() => initialValues(controls))
  const set = (k: string, v: string | boolean) => setValues(s => ({ ...s, [k]: v }))

  return (
    <div className="ds-playground">
      <div className="ds-grid-surface" data-tone={tone} style={{
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-popover)',
        minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--spacing-8)', overflow: 'hidden',
      }}>
        {render(values, set)}
      </div>

      <div style={{
        background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-popover)', padding: 'var(--spacing-4)',
        boxShadow: 'var(--shadow-sm)', alignSelf: 'start',
      }}>
        <div style={{
          fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)',
          paddingBottom: 'var(--spacing-3)', borderBottom: '1px solid var(--color-border)',
        }}>Control</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-4)' }}>
          {controls.map(c => (
            <div key={c.name}>
              <div style={{
                fontSize: 'var(--text-meta)', fontWeight: 600,
                color: 'var(--color-text-body)', marginBottom: 'var(--spacing-2)',
              }}>{c.label}</div>

              {c.kind === 'radio' && (
                isNumeric(c.options)
                  // 숫자 옵션은 단계가 있는 값이라 슬라이더가 크기 변화를 그대로 보여 준다
                  ? <StepSlider
                      options={c.options}
                      value={String(values[c.name])}
                      onChange={v => set(c.name, v)}
                    />
                  // 나머지는 하나만 고르는 세그먼티드 컨트롤
                  : <Segmented
                      options={c.options}
                      value={String(values[c.name])}
                      onChange={v => set(c.name, v)}
                    />
              )}

              {c.kind === 'toggle' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!values[c.name]}
                    onChange={e => set(c.name, e.target.checked)}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  />
                  <Switch on={!!values[c.name]} />
                  <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)' }}>
                    {values[c.name] ? 'true' : 'false'}
                  </span>
                </label>
              )}

              {c.kind === 'text' && (
                <input
                  value={String(values[c.name] ?? '')}
                  onChange={e => set(c.name, e.target.value)}
                  style={{
                    width: '100%', padding: '6px 10px', fontSize: 'var(--text-meta)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-button)',
                    background: 'var(--color-surface-bg)', color: 'var(--color-text-primary)',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
