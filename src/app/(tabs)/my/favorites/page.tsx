'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { MyPageShell } from '@/components/auth/MyPageShell'
import { FavoritesContent } from '@/components/domain/favorites/FavoritesContent'

/** 관심 목록 페이지 (모바일 + 데스크톱 딥링크). 데스크톱 MY 팝오버 안에서는 FavoritesContent를 직접 쓴다. */
export default function FavoritesPage() {
  const router = useRouter()
  const { status } = useAuth()

  useEffect(() => {
    if (status === 'signed-out') router.replace('/my')
  }, [status, router])

  return (
    <MyPageShell title="관심 목록" onBack={() => router.push('/my')}>
      <FavoritesContent />
    </MyPageShell>
  )
}
