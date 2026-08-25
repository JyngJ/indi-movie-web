'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { FeedContent } from '@/components/domain/favorites/FeedContent'
import { RailPopover } from '@/components/navigation/RailPopover'
import { Button } from '@/components/primitives'
import { useUIStore } from '@/store/uiStore'
import { Icon } from '@/components/primitives'

/** 데스크톱 소식 팝오버 — 레일 '소식' 옆. 모바일은 /feed 페이지. */
export function FeedPanel() {
  const isOpen = useUIStore((s) => s.isFeedOpen)
  const setOpen = useUIStore((s) => s.setFeedOpen)
  const { status } = useAuth()
  const close = () => setOpen(false)
  return (
    <RailPopover
      open={isOpen}
      onClose={close}
      title="소식"
      ariaLabel="소식"
      anchorHref="/feed"
      trailing={status === 'signed-in' ? (
        <Link href="/my/favorites" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }} onClick={close}>
          <Button variant="secondary" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            내 관심 목록 <Icon name="chevron-right" size={14} strokeWidth={1.75} />
          </Button>
        </Link>
      ) : undefined}
    >
      <FeedContent onNavigate={close} />
    </RailPopover>
  )
}
