import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { NeighborTable } from './types'

const TABLE = 'movie_recommendation_neighbors'

/** 새 모델 결과를 넣고 같은 버전의 이전 결과를 지운다. 중간에 실패해도 이전 결과가 남는다. */
export async function replaceNeighbors(table: NeighborTable, model: string, builtAt: string): Promise<number> {
  const db = createSupabaseAdminClient()
  const rows = [...table].flatMap(([movie_id, list]) => list.map((n, rank) => ({ movie_id, neighbor_id: n.movieId, score: n.score, rank: rank + 1, model, built_at: builtAt })))
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await db.from(TABLE).upsert(rows.slice(i, i + 1000), { onConflict: 'model,movie_id,neighbor_id' })
    if (error) throw error
  }
  const { error } = await db.from(TABLE).delete().eq('model', model).lt('built_at', builtAt)
  if (error) throw error
  return rows.length
}

export async function loadNeighbors(model: string, movieIds?: string[]): Promise<NeighborTable> {
  const db = createSupabaseAdminClient()
  const table: NeighborTable = new Map()
  for (let offset = 0; ; offset += 1000) {
    let q = db.from(TABLE).select('movie_id,neighbor_id,score').eq('model', model)
    if (movieIds) q = q.in('movie_id', movieIds)
    const { data, error } = await q.order('movie_id').order('rank').range(offset, offset + 999)
    if (error) throw error
    for (const r of data ?? []) (table.get(r.movie_id) ?? table.set(r.movie_id, []).get(r.movie_id)!).push({ movieId: r.neighbor_id, score: r.score })
    if (!data || data.length < 1000) return table
  }
}
