import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReleaseRepository } from './repository'
import type { LocalMovieRef, ReleaseDateChange, ReleaseMatchStatus, ReleaseSource, UpcomingRelease } from './types'

const PAGE = 1000

interface ReleaseRow {
  id: string
  source: ReleaseSource
  source_movie_id: string
  title: string
  production_year: number | null
  release_date: string
  movie_id: string | null
  match_status: ReleaseMatchStatus
  match_note: string | null
  first_seen_at: string
  last_seen_at: string
  release_date_history: ReleaseDateChange[] | null
}

function fromRow(row: ReleaseRow): UpcomingRelease {
  return {
    id: row.id,
    source: row.source,
    sourceMovieId: row.source_movie_id,
    title: row.title,
    productionYear: row.production_year ?? undefined,
    releaseDate: row.release_date,
    movieId: row.movie_id,
    matchStatus: row.match_status,
    matchNote: row.match_note,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    releaseDateHistory: row.release_date_history ?? [],
  }
}

function toRow(r: UpcomingRelease) {
  return {
    source: r.source,
    source_movie_id: r.sourceMovieId,
    title: r.title,
    production_year: r.productionYear ?? null,
    release_date: r.releaseDate,
    movie_id: r.movieId,
    match_status: r.matchStatus,
    match_note: r.matchNote,
    first_seen_at: r.firstSeenAt,
    last_seen_at: r.lastSeenAt,
    release_date_history: r.releaseDateHistory,
  }
}

export function createSupabaseReleaseRepository(supabase: SupabaseClient): ReleaseRepository {
  return {
    async listReleases(source) {
      const { data, error } = await supabase.from('upcoming_releases').select('*').eq('source', source)
      if (error) throw new Error(`upcoming_releases 조회 실패: ${error.message}`)
      return (data as ReleaseRow[]).map(fromRow)
    },

    async saveReleases(rows) {
      if (!rows.length) return
      const { error } = await supabase
        .from('upcoming_releases')
        .upsert(rows.map(toRow), { onConflict: 'source,source_movie_id' })
      if (error) throw new Error(`upcoming_releases 저장 실패: ${error.message}`)
    },

    async listLocalMovies() {
      const out: LocalMovieRef[] = []
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('movies')
          .select('id, title, original_title, year, release_date, director')
          .order('id')
          .range(from, from + PAGE - 1)
        if (error) throw new Error(`movies 조회 실패: ${error.message}`)
        const rows = (data ?? []) as Array<{ id: string; title: string; original_title: string | null; year: number | null; release_date: string | null; director: string[] | null }>
        out.push(...rows.map((m) => ({ id: m.id, title: m.title, originalTitle: m.original_title, year: m.year, releaseDate: m.release_date, directors: m.director })))
        if (rows.length < PAGE) return out
      }
    },

    async setMovieReleaseDates(updates) {
      // 하루 수십 건 이하라 한 건씩 쓴다
      for (const u of updates) {
        const { error } = await supabase.from('movies').update({ release_date: u.releaseDate }).eq('id', u.movieId)
        if (error) throw new Error(`movies.release_date 갱신 실패 (${u.movieId}): ${error.message}`)
      }
    },
  }
}
