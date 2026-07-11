'use client'

import { useEffect, useRef, useState } from 'react'

interface ToastProps {
  message: string
  /** 1회성 표시 — 증가시키면 뜨고 duration 후 자동으로 사라짐. persistent 모드(visible)와 동시 사용 불가 */
  trigger?: number
  /** 지속 표시 모드 — true인 동안 계속 보임, 자동으로 사라지지 않음 (trigger보다 우선) */
  visible?: boolean
  duration?: number
}

export function Toast({ message, trigger = 0, visible, duration = 1600 }: ToastProps) {
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (visible !== undefined) {
      setShow(visible)
      return
    }
    if (trigger === 0) return
    setShow(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShow(false), duration)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [trigger, duration, visible])

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 100,
        left: '50%',
        transform: `translateX(-50%) translateY(${show ? 0 : 8}px)`,
        opacity: show ? 1 : 0,
        transition: 'opacity 0.18s ease, transform 0.18s ease',
        pointerEvents: 'none',
        zIndex: 9999,
        background: 'var(--color-neutral-900)',
        color: 'var(--color-neutral-50)',
        fontSize: 14,
        fontWeight: 600,
        padding: '10px 16px',
        borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
        whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
      }}
    >
      {message}
    </div>
  )
}
