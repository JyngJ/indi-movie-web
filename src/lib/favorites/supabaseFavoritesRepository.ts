import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import type { FavoritesRepository } from './repository'
import type { Favorite, FavoriteItemType } from './types'

interface Row {
  item_type: FavoriteItemType
  item_id: string
  created_at: string
}

/** 브라우저용 구현. user_id는 RLS + auth.uid()로 서버가 채운다 (insert 시 명시 필요) */
export function createSupabaseFavoritesRepository(): FavoritesRepository {
  const supabase = createSupabaseBrowserClient()

  const requireUserId = async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) throw new Error('not authenticated')
    return data.user.id
  }

  return {
    async list() {
      const { data, error } = await supabase
        .from('favorites')
        .select('item_type, item_id, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return ((data ?? []) as Row[]).map((r) => ({ type: r.item_type, id: r.item_id, createdAt: r.created_at }))
    },

    async add(type, id) {
      const userId = await requireUserId()
      const { error } = await supabase
        .from('favorites')
        .upsert({ user_id: userId, item_type: type, item_id: id }, { onConflict: 'user_id,item_type,item_id', ignoreDuplicates: true })
      if (error) throw error
    },

    async remove(type, id) {
      const userId = await requireUserId()
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('item_type', type)
        .eq('item_id', id)
      if (error) throw error
    },
  }
}
