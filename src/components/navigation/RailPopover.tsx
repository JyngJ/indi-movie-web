'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { SettingsHeader } from '@/components/map/SettingsPanel'
import { GLOBAL_NAV_DESKTOP_WIDTH } from '@/components/navigation/GlobalNav'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'

/**
 * 데스크톱 레일 옆 팝오버 셸 (Vercel 인박스 문법) — 소식·MY가 같이 쓴다.
 * 딤 없음, 바깥 클릭·Esc로 닫힘, 본문 스크롤. anchorHref: 레일의 해당 탭 링크(그 클릭은 탭이 토글하므로 무시).
 */
export function RailPopover({
  open,
  onClose,
  title,
  onBack,
  trailing,
  anchorHref,
  ariaLabel,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  onBack?: () => void
  trailing?: ReactNode
  anchorHref: string
  ariaLabel: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useLockBodyScroll(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (ref.current?.contains(t)) return
      if (t.closest?.(`a[href="${anchorHref}"]`)) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown) }
  }, [open, onClose, anchorHref])

  if (!open) return null

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={ariaLabel}
      className="modal-card-in"
      style={{
        position: 'fixed',
        left: GLOBAL_NAV_DESKTOP_WIDTH + 12,
        bottom: 16,
        width: 400,
        maxWidth: 'calc(100vw - 96px)',
        height: 'min(640px, calc(100dvh - 32px))',
        zIndex: 1200,
        backgroundColor: 'var(--color-surface-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-popover)',
        boxShadow: 'var(--shadow-sheet)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <SettingsHeader title={title} onBack={onBack} onClose={onClose} trailing={trailing} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}
