'use client'

import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { MyHomeContent } from '@/components/auth/MyHomeContent'
import { ProfileContent } from '@/components/auth/ProfileContent'
import { RailPopover } from '@/components/navigation/RailPopover'
import { IconButton } from '@/components/primitives'
import { useUIStore } from '@/store/uiStore'

/** 데스크톱 MY 팝오버 — 레일 'MY' 옆. 홈 ↔ 프로필·계정 관리 내부 전환. 모바일은 /my 페이지. */
export function MyPanel() {
  const isOpen = useUIStore((s) => s.isMyOpen)
  const setOpen = useUIStore((s) => s.setMyOpen)
  const openSettingsPage = useUIStore((s) => s.openSettingsPage)
  const [page, setPage] = useState<'home' | 'profile'>('home')

  useEffect(() => { if (!isOpen) setPage('home') }, [isOpen])

  const close = () => setOpen(false)
  const gear = (
    <IconButton variant="ghost" size={44} aria-label="설정" onClick={() => { close(); openSettingsPage('main') }}>
      <Settings size={22} strokeWidth={1.75} />
    </IconButton>
  )

  return (
    <RailPopover
      open={isOpen}
      onClose={close}
      title={page === 'home' ? 'MY' : '프로필 · 계정 관리'}
      onBack={page === 'profile' ? () => setPage('home') : undefined}
      trailing={page === 'home' ? gear : undefined}
      ariaLabel="MY"
      anchorHref="/my"
    >
      {page === 'home'
        ? <MyHomeContent onProfile={() => setPage('profile')} onNavigate={close} />
        : <ProfileContent onDone={() => setPage('home')} />}
    </RailPopover>
  )
}
