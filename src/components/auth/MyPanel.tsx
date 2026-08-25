'use client'

import { useEffect, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { MyHomeContent } from '@/components/auth/MyHomeContent'
import { FavoritesContent } from '@/components/domain/favorites/FavoritesContent'
import { NotificationSettingsContent } from '@/components/auth/NotificationSettingsContent'
import { ProfileContent } from '@/components/auth/ProfileContent'
import { RailPopover } from '@/components/navigation/RailPopover'
import { IconButton } from '@/components/primitives'
import { useUIStore } from '@/store/uiStore'

/** 데스크톱 MY 팝오버 — 레일 'MY' 옆. 홈 ↔ 관심 목록 ↔ 알림 설정 ↔ 프로필·계정 관리 내부 전환.
 *  데스크톱에서는 별도 페이지로 나가지 않는다 — 지도를 보면서 관심 목록을 확인하는 흐름이 끊긴다.
 *  모바일은 /my/* 페이지. */
export function MyPanel() {
  const isOpen = useUIStore((s) => s.isMyOpen)
  const setOpen = useUIStore((s) => s.setMyOpen)
  const openSettingsPage = useUIStore((s) => s.openSettingsPage)
  const [page, setPage] = useState<'home' | 'profile' | 'notifications' | 'favorites'>('home')

  useEffect(() => { if (!isOpen) setPage('home') }, [isOpen])

  const close = () => setOpen(false)
  const gear = (
    <IconButton variant="ghost" size={44} aria-label="더보기" onClick={() => { close(); openSettingsPage('main') }}>
      <MoreHorizontal size={22} strokeWidth={1.75} />
    </IconButton>
  )

  return (
    <RailPopover
      open={isOpen}
      onClose={close}
      title={page === 'home' ? 'MY'
        : page === 'profile' ? '프로필 · 계정 관리'
        : page === 'favorites' ? '관심 목록'
        : '알림 설정'}
      onBack={page === 'home' ? undefined : () => setPage('home')}
      trailing={page === 'home' ? gear : undefined}
      ariaLabel="MY"
      anchorHref="/my"
    >
      {page === 'home' ? (
        <MyHomeContent
          onProfile={() => setPage('profile')}
          onNotifications={() => setPage('notifications')}
          onFavorites={() => setPage('favorites')}
          onNavigate={close}
        />
      ) : page === 'profile' ? (
        <ProfileContent onDone={() => setPage('home')} />
      ) : page === 'favorites' ? (
        <FavoritesContent onNavigate={close} />
      ) : (
        <NotificationSettingsContent />
      )}
    </RailPopover>
  )
}
