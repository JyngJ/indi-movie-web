'use client'

import { useRouter } from 'next/navigation'
import { MyPageShell } from '@/components/auth/MyPageShell'
import { NotificationSettingsContent } from '@/components/auth/NotificationSettingsContent'

/** 알림 설정 (모바일 + 데스크톱 딥링크). 데스크톱 MY 팝오버 안에서는 컴포넌트를 직접 쓴다. */
export default function NotificationSettingsPage() {
  const router = useRouter()
  return (
    <MyPageShell title="알림 설정" onBack={() => router.push('/my')}>
      <NotificationSettingsContent />
    </MyPageShell>
  )
}
