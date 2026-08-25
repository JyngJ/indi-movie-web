'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import type { NotificationClientRepository } from '@/lib/notifications/repository'
import { createSupabaseNotificationsRepository } from '@/lib/notifications/supabaseNotificationsRepository'
import { DEFAULT_PREFS, type NotificationPrefs, type StoredNotificationEvent } from '@/lib/notifications/types'

const eventsKey = (userId: string | null) => ['notification-events', userId] as const
const prefsKey = (userId: string | null) => ['notification-prefs', userId] as const

/** 소식 목록 — 로그인 유저만. 비로그인은 빈 배열 */
export function useNotificationEvents(limit = 50) {
  const { status, user } = useAuth()
  const userId = status === 'signed-in' && user ? user.id : null
  const qc = useQueryClient()
  const repoRef = useRef<NotificationClientRepository | null>(null)
  const getRepo = () => (repoRef.current ??= createSupabaseNotificationsRepository())

  const query = useQuery({
    queryKey: eventsKey(userId),
    queryFn: () => getRepo().listEvents(limit),
    enabled: userId !== null,
    staleTime: 60 * 1000,
  })

  const events: StoredNotificationEvent[] = userId ? (query.data ?? []) : []
  const unreadCount = events.filter((e) => !e.readAt).length

  const markAllRead = useCallback(async () => {
    if (!userId || unreadCount === 0) return
    const key = eventsKey(userId)
    const prev = qc.getQueryData<StoredNotificationEvent[]>(key) ?? []
    const now = new Date().toISOString()
    qc.setQueryData(key, prev.map((e) => (e.readAt ? e : { ...e, readAt: now })))
    try {
      await getRepo().markAllRead()
    } catch {
      qc.setQueryData(key, prev)
    }
  }, [userId, unreadCount, qc])

  return { events, unreadCount, isLoading: query.isLoading && userId !== null, markAllRead }
}

/** 알림 설정 — 행이 없으면 기본값을 보여주고, 저장 시 upsert */
export function useNotificationPrefs() {
  const { status, user } = useAuth()
  const userId = status === 'signed-in' && user ? user.id : null
  const qc = useQueryClient()
  const repoRef = useRef<NotificationClientRepository | null>(null)
  const getRepo = () => (repoRef.current ??= createSupabaseNotificationsRepository())

  const query = useQuery({
    queryKey: prefsKey(userId),
    queryFn: () => getRepo().getPrefs(),
    enabled: userId !== null,
    staleTime: 5 * 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: (patch: Partial<Omit<NotificationPrefs, 'userId'>>) => getRepo().savePrefs(patch),
    onMutate: async (patch) => {
      const key = prefsKey(userId)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<NotificationPrefs>(key)
      if (prev) qc.setQueryData(key, { ...prev, ...patch })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(prefsKey(userId), ctx.prev)
    },
    onSuccess: (next) => qc.setQueryData(prefsKey(userId), next),
  })

  const prefs: NotificationPrefs = query.data ?? { userId: userId ?? '', ...DEFAULT_PREFS }

  return {
    prefs,
    isLoading: query.isLoading && userId !== null,
    saving: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
    save: mutation.mutate,
  }
}
