import type { LocalMovieRef, ReleaseSource, UpcomingRelease } from './types'

/** 개봉 예정 수집이 쓰는 저장소 경계 — Supabase 구현은 supabaseReleaseRepository.ts */
export interface ReleaseRepository {
  listReleases(source: ReleaseSource): Promise<UpcomingRelease[]>
  /** (source, sourceMovieId) 기준 upsert */
  saveReleases(rows: UpcomingRelease[]): Promise<void>
  listLocalMovies(): Promise<LocalMovieRef[]>
  setMovieReleaseDates(updates: Array<{ movieId: string; releaseDate: string }>): Promise<void>
}
