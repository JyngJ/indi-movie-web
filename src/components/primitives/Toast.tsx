'use client'

import { useEffect, useRef, useState } from 'react'

interface ToastProps {
  message: string
  trigger: number   // increment to show toast
  duration?: number
}

export function Toast({ message, trigger, duration = 1600 }: ToastProps) {
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (trigger === 0) return
    setShow(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShow(false), duration)
  }, [trigger, duration])

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
        background: 'rgba(30, 30, 30, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: '#fff',
        fontSize: 15,
        fontWeight: 600,
        padding: '9px 20px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
      }}
    >
      {message}
    </div>
  )
}
