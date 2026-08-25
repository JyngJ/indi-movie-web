'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'

/**
 * 확인 다이얼로그 — 파괴적 액션(회원탈퇴 등) 전용.
 * 모바일: 하단 시트, 데스크톱: 중앙 카드. LocationPermissionModal과 같은 등장 문법.
 * Button danger는 이 다이얼로그 안에서만 쓴다 (목록 안 파괴 액션은 secondary·text).
 */
interface Props {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const isDesktop = useIsDesktopLayout()
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useLockBodyScroll(open)

  useEffect(() => {
    if (!open) {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 260)
      return () => clearTimeout(t)
    }
    setMounted(true)
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <div
      onClick={() => { if (!busy) onCancel() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex',
        alignItems: isDesktop ? 'center' : 'flex-end',
        justifyContent: 'center',
        background: visible ? 'var(--color-scrim)' : 'transparent',
        transition: 'background 280ms ease',
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--color-surface-card)',
          borderRadius: isDesktop ? 'var(--radius-popover)' : 'var(--radius-sheet) var(--radius-sheet) 0 0',
          width: isDesktop ? 380 : '100%',
          boxShadow: 'var(--shadow-sheet)',
          transform: visible ? 'translateY(0)' : isDesktop ? 'scale(0.96) translateY(12px)' : 'translateY(100%)',
          opacity: visible ? 1 : 0,
          transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease',
          padding: isDesktop ? 24 : 'var(--gutter)',
          paddingBottom: isDesktop ? 24 : 'max(24px, env(safe-area-inset-bottom))',
        }}
      >
        {!isDesktop && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}>
            <div style={{ width: 36, height: 4, borderRadius: 'var(--radius-pill)', background: 'var(--color-border)' }} />
          </div>
        )}
        <h2 id="confirm-dialog-title" style={{ margin: 0, fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {title}
        </h2>
        {description && (
          <div style={{ marginTop: 8, fontSize: 'var(--text-body)', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
            {description}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
          <Button variant={danger ? 'danger' : 'primary'} size="lg" fullWidth loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="text" size="md" fullWidth disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
