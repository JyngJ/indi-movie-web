'use client'

import { useRouter } from 'next/navigation'
import { MyPageShell } from '@/components/auth/MyPageShell'
import { ProfileContent } from '@/components/auth/ProfileContent'

/** 프로필 · 계정 관리 페이지 (모바일 + 데스크톱 딥링크). 데스크톱 레일 MY 팝오버 안에서는 ProfileContent를 직접 쓴다. */
export default function ProfilePage() {
  const router = useRouter()
  return (
    <MyPageShell title="프로필 · 계정 관리" onBack={() => router.push('/my')}>
      <ProfileContent onDone={() => router.replace('/my')} />
    </MyPageShell>
  )
}
