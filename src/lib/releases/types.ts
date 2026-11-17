/**
 * 개봉 예정 영화 수집 — 도메인 타입. 프레임워크·DB 무관.
 * 설계: docs/PLAN-indieground-releases.md
 */

export type ReleaseSource = 'indieground'

export type ReleaseMatchStatus = 'pending' | 'matched' | 'needs_review' | 'rejected'

/** 소스 한 곳에서 읽은 개봉 소식 1건 — 사실 정보만 담는다(포스터·시놉시스 없음) */
export interface UpcomingReleaseInput {
  source: ReleaseSource
  /** 소스 쪽 영화 id (인디그라운드 movieSeq) */
  sourceMovieId: string
  title: string
  productionYear?: number
  /** yyyy-mm-dd */
  releaseDate: string
}

export interface ReleaseDateChange {
  date: string
  seenAt: string
}

/** upcoming_releases 한 행 */
export interface UpcomingRelease extends UpcomingReleaseInput {
  id?: string
  movieId: string | null
  matchStatus: ReleaseMatchStatus
  matchNote: string | null
  firstSeenAt: string
  lastSeenAt: string
  /** 개봉일이 바뀔 때마다 이전 값을 쌓는다 */
  releaseDateHistory: ReleaseDateChange[]
}

/** 매칭 대상이 되는 로컬 영화 */
export interface LocalMovieRef {
  id: string
  title: string
  originalTitle?: string | null
  year?: number | null
  releaseDate?: string | null
  directors?: string[] | null
}

/** 외부(KMDb) 검색 결과 중 매칭에 필요한 부분 */
export interface ExternalMovieRef {
  key: string
  title: string
  originalTitle?: string
  year?: number
  directors?: string[]
}
