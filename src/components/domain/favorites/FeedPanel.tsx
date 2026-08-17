'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { FeedContent } from '@/components/domain/favorites/FeedContent'
import { SettingsHeader } from '@/components/map/SettingsPanel'
import { Button } from '@/components/primitives'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { useUIStore } from '@/store/uiStore'

/**
 * 데스크톱 소식 패널 — 설정 패널과 같은 모달 카드 문법. 레일 '소식' 클릭으로 열린다 (2026-08-17 IA: 페이지 대신 카드).
 * 모바일은 /feed 페이지. (tabs) layout에서 데스크톱일 때만 마운트.
 */
export function FeedPanel() {
  const isOpen = useUIStore((s) => s.isFeedOpen)
  const setOpen = useUIStore((s) => s.setFeedOpen)
  const { status } = useAuth()

  const [render, setRender] = useState(isOpen)
  const [closing, setClosing] = useState(false)
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (isOpen) { setRender(true); setClosing(false); return }
    if (!render) return
    setClosing(true)
    const t = setTimeout(() => { setRender(false); setClosing(false); setEntered(false) }, 220)
    return () => clearTimeout(t)
  }, [isOpen, render])
  useLockBodyScroll(isOpen)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, setOpen])

  if (!render) return null
  const close = () => setOpen(false)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="소식"
      className={entered ? undefined : 'modal-backdrop-in'}
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 2100, height: '100dvh',
        backgroundColor: closing ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.38)',
        transition: 'background-color 220ms ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={entered ? undefined : 'modal-card-in'}
        onAnimationEnd={(e) => { if (e.animationName.startsWith('modal-card-in')) setEntered(true) }}
        style={{
          width: 440,
          maxWidth: 'calc(100vw - 48px)',
          height: 'min(680px, calc(100dvh - 48px))',
          backgroundColor: 'var(--color-surface-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 20,
          boxShadow: 'var(--shadow-sheet)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transform: closing ? 'scale(0.96) translateY(12px)' : 'none',
          opacity: closing ? 0 : 1,
          transition: 'transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 180ms ease',
        }}
      >
        <SettingsHeader
          title="소식"
          onClose={close}
          trailing={status === 'signed-in' ? (
            <Link href="/my/favorites" style={{ textDecoration: 'none' }} onClick={close}>
              <Button variant="text" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-primary-base)' }}>
                관심 목록 <ChevronRight size={14} strokeWidth={1.75} />
              </Button>
            </Link>
          ) : undefined}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <FeedContent onNavigate={close} />
        </div>
      </div>
    </div>
  )
}
