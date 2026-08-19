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

/* 브라우저 기본 라디오·체크박스는 Tailwind preflight 아래에서 검은 원으로 떨어진다.
   접근성을 위해 실제 input은 숨겨서 남기고, 보이는 부분만 직접 그린다. */
function Dot({ on }: { on: boolean }) {
  return (
    <span style={{
      width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
      border: `1.5px solid ${on ? 'var(--color-primary-base)' : 'var(--color-neutral-400)'}`,
      background: 'var(--color-surface-card)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {on && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary-base)' }} />}
    </span>
  )
}

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
  render: (v: ControlValues) => ReactNode
  tone?: 'paper' | 'dark'
}) {
  const [values, setValues] = useState<ControlValues>(() => initialValues(controls))
  const set = (k: string, v: string | boolean) => setValues(s => ({ ...s, [k]: v }))

  return (
    <div className="ds-playground">
      <div style={{
        background: tone === 'dark' ? 'var(--color-neutral-800)' : 'var(--color-surface-bg)',
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-popover)',
        minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--spacing-8)', overflow: 'hidden',
      }}>
        {render(values)}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {c.options.map(opt => {
                    const on = values[c.name] === opt
                    return (
                      <label key={opt} style={{
                        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                        fontSize: 'var(--text-meta)',
                        color: on ? 'var(--color-text-primary)' : 'var(--color-text-sub)',
                        fontWeight: on ? 600 : 400,
                      }}>
                        <input
                          type="radio"
                          name={c.name}
                          checked={on}
                          onChange={() => set(c.name, opt)}
                          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                        />
                        <Dot on={on} />
                        {opt}
                      </label>
                    )
                  })}
                </div>
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
