'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/auth/AuthProvider'
import type { EmailSubscription } from '@/lib/emailNotifications/domain'
export function useEmailNotifications() {
  const { user, status } = useAuth()
  const qc = useQueryClient()
  const key = ['email-notifications', user?.id] as const
  const query = useQuery({
    queryKey: key,
    enabled: status === 'signed-in' && process.env.NEXT_PUBLIC_EMAIL_NOTIFICATIONS_ENABLED === 'true',
    queryFn: async ({ signal }): Promise<{ enabled: boolean; subscription: EmailSubscription | null }> => {
      const response = await fetch('/api/email-notifications', { cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      return data
    }, staleTime: 60000, retry: 1,
  })
  async function update(body: { action: 'dismiss' | 'register' | 'unsubscribe'; email?: string; consent?: boolean }) {
    const response = await fetch('/api/email-notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    qc.setQueryData(key, data)
  }
  return { ...query, update }
}
