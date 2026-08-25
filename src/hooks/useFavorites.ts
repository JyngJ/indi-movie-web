'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRequireAuth } from '@/components/auth/useRequireAuth'
import type { FavoritesRepository } from '@/lib/favorites/repository'
import { createSupabaseFavoritesRepository } from '@/lib/favorites/supabaseFavoritesRepository'
import { favoriteKey, toFavoriteSet, type Favorite, type FavoriteItemType } from '@/lib/favorites/types'

const favoritesQueryKey = (userId: string | null) => ['favorites', userId] as const

/**
 * 관심 목록 훅 — 로그인 유저당 1회 fetch → Set으로 조회, 토글은 낙관적 업데이트.
 * 비로그인이면 목록은 빈 Set, toggle은 로그인 시트를 띄우고 false를 돌려준다.
 */
export function useFavorites() {
  const { status, user } = useAuth()
  const userId = status === 'signed-in' && user ? user.id : null
  const qc = useQueryClient()
  const requireAuth = useRequireAuth()

  const repoRef = useRef<FavoritesRepository | null>(null)
  const getRepo = () => (repoRef.current ??= createSupabaseFavoritesRepository())

  const query = useQuery({
    queryKey: favoritesQueryKey(userId),
    queryFn: () => getRepo().list(),
    enabled: userId !== null,
    staleTime: 5 * 60 * 1000,
  })

  const list = useMemo<Favorite[]>(() => (userId ? (query.data ?? []) : []), [query.data, userId])
  const set = useMemo(() => toFavoriteSet(list), [list])

  const mutation = useMutation({
    mutationFn: async ({ type, id, next }: { type: FavoriteItemType; id: string; next: boolean }) => {
      if (next) await getRepo().add(type, id)
      else await getRepo().remove(type, id)
    },
    onMutate: async ({ type, id, next }) => {
      const key = favoritesQueryKey(userId)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Favorite[]>(key) ?? []
      const without = prev.filter((f) => !(f.type === type && f.id === id))
      const optimistic = next ? [{ type, id, createdAt: new Date().toISOString() }, ...without] : without
      qc.setQueryData(key, optimistic)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(favoritesQueryKey(userId), ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: favoritesQueryKey(userId) })
    },
  })

  const isFavorite = useCallback((type: FavoriteItemType, id: string) => set.has(favoriteKey(type, id)), [set])

  /**
   * 토글. 비로그인이면 로그인 시트를 띄우고 false. 로그인 후 자동 재실행은 하지 않는다 (useRequireAuth 주석 참고).
   * @returns 실제로 토글이 실행됐는지
   */
  const toggle = useCallback(
    (type: FavoriteItemType, id: string, opts?: { loginDescription?: string }): boolean => {
      if (!requireAuth({ description: opts?.loginDescription })) return false
      mutation.mutate({ type, id, next: !isFavorite(type, id) })
      return true
    },
    [requireAuth, mutation, isFavorite],
  )

  return {
    /** 로그인 전엔 빈 목록 */
    favorites: list,
    isFavorite,
    toggle,
    isLoading: userId !== null && query.isLoading,
    signedIn: userId !== null,
  }
}
