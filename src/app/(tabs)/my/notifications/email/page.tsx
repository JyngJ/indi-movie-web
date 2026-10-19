'use client'

import { MyPageShell } from '@/components/auth/MyPageShell'
import { EmailPreferencesContent } from '@/components/auth/EmailPreferencesContent'
import { useProgressRouter } from '@/hooks/useProgressRouter'

export default function EmailPreferencesPage() {
  const router = useProgressRouter()
  return <MyPageShell title="이메일 소식" onBack={() => router.push('/my/notifications')}>
    <EmailPreferencesContent />
  </MyPageShell>
}
