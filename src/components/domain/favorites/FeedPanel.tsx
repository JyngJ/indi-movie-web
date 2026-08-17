'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { FeedContent } from '@/components/domain/favorites/FeedContent'
import { SettingsHeader } from '@/components/map/SettingsPanel'
import { GLOBAL_NAV_DESKTOP_WIDTH } from '@/components/navigation/GlobalNav'
import { Button } from '@/components/primitives'
import { useUIStore } from '@/store/uiStore'

/**
 * 데스크톱 소식 팝오버 — 레일 '소식' 탭 바로 옆에 뜬다 (Vercel 인박스 문법). 딤 없음, 바깥 클릭·Esc로 닫힘, 본문 스크롤.
 * 모바일은 /feed 페이지. (tabs) layout에서 데스크톱일 때만 마운트.
 */
export function FeedPanel() {
  const isOpen = useUIStore((s) => s.isFeedOpen)
  const setOpen = useUIStore((s) => s.setFeedOpen)
  const { status } = useAuth()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t)) return
      // 레일 '소식' 탭 클릭은 탭 자체가 토글하므로 여기선 무시
      if ((t as HTMLElement).closest?.('a[href="/feed"]')) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown) }
  }, [isOpen, setOpen])

  if (!isOpen) return null
  const close = () => setOpen(false)

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="소식"
      className="modal-card-in"
      style={{
        position: 'fixed',
        left: GLOBAL_NAV_DESKTOP_WIDTH + 12,
        bottom: 16,
        width: 400,
        maxWidth: 'calc(100vw - 96px)',
        height: 'min(640px, calc(100dvh - 32px))',   /* 세로 여유 — 빈 상태여도 리스트 자리를 미리 확보 */
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
      <SettingsHeader
        title="소식"
        onClose={close}
        trailing={status === 'signed-in' ? (
          <Link href="/my/favorites" style={{ textDecoration: 'none' }} onClick={close}>
            <Button variant="secondary" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              내 관심 목록 <ChevronRight size={14} strokeWidth={1.75} />
            </Button>
          </Link>
        ) : undefined}
      />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <FeedContent onNavigate={close} />
      </div>
    </div>
  )
}
