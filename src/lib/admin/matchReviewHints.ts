// 동명 영화 검수 알림에 "상영관이 이 영화를 어떻게 적었는지"를 보여주기 위한 순수 함수 모음.
// 크롤러가 저장한 rawText(JSON)에서 영화 식별에 쓸 만한 필드만 뽑는다.
// 사이트마다 키 이름이 달라 후보 키를 순서대로 훑는다.

export interface ListingHints {
  director?: string
  runtimeMinutes?: number
  genre?: string
  grade?: string
  year?: number
}

export interface MovieeMovieRef {
  origin: string
  tid: string
  mId: string
  gId?: string
}

const DIRECTOR_KEYS = ['DIRECTOR', 'Director', 'DirectorNm', 'director', 'directorNm']
const RUNTIME_KEYS = ['RUNTIME', 'RunTime', 'RunningTime', 'runtime', 'runningTime', 'ShowTm']
const GENRE_KEYS = ['GENRE', 'Genre', 'GenreNm', 'genre']
const GRADE_KEYS = ['GRADE', 'Grade', 'RatingNm', 'rating']
const YEAR_KEYS = ['ReleaseDT', 'OPEN_DT', 'OpenDt', 'releaseDate', 'openDt', 'year']

export function parseRawJson(rawText: string | undefined): Record<string, unknown> | undefined {
  if (!rawText || !rawText.trim().startsWith('{')) return undefined
  try {
    const parsed = JSON.parse(rawText) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : undefined
  } catch {
    return undefined
  }
}

function pickString(raw: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return undefined
}

function parseRuntime(value: string | undefined) {
  const minutes = Number(value?.match(/\d+/)?.[0])
  return minutes > 0 && minutes < 1000 ? minutes : undefined
}

function parseYear(value: string | undefined) {
  const year = Number(value?.match(/(?:18|19|20)\d{2}/)?.[0])
  return year || undefined
}

export function extractListingHints(raw: Record<string, unknown> | undefined, releaseYear?: number): ListingHints {
  if (!raw) return releaseYear ? { year: releaseYear } : {}
  const genre = pickString(raw, GENRE_KEYS)
  return {
    director: pickString(raw, DIRECTOR_KEYS),
    runtimeMinutes: parseRuntime(pickString(raw, RUNTIME_KEYS)),
    // 무비이 장르에는 사이트 분류용 "독립예술"이 섞여 온다 — 식별에 쓸모없어 뺀다
    genre: genre?.split(',').map((g) => g.trim()).filter((g) => g && g !== '독립예술').join(', ') || undefined,
    grade: pickString(raw, GRADE_KEYS),
    year: releaseYear ?? parseYear(pickString(raw, YEAR_KEYS)),
  }
}

export function mergeListingHints(base: ListingHints, extra: ListingHints): ListingHints {
  return {
    director: base.director ?? extra.director,
    runtimeMinutes: base.runtimeMinutes ?? extra.runtimeMinutes,
    genre: base.genre ?? extra.genre,
    grade: base.grade ?? extra.grade,
    year: base.year ?? extra.year,
  }
}

/** 무비이(moviee.co.kr) 회차 rawText면 영화 상세 조회에 필요한 식별자를 돌려준다 */
export function movieeMovieRef(raw: Record<string, unknown> | undefined, sourceUrl: string | undefined): MovieeMovieRef | undefined {
  if (!raw || !sourceUrl) return undefined
  let origin: string
  try {
    origin = new URL(sourceUrl).origin
  } catch {
    return undefined
  }
  if (!origin.includes('moviee.co.kr')) return undefined
  const mId = typeof raw.M_ID === 'string' ? raw.M_ID : undefined
  const tid = typeof raw.T_ID === 'string' ? raw.T_ID : undefined
  if (!mId || !tid) return undefined
  return { origin, tid, mId, gId: typeof raw.GRPM_ID === 'string' ? raw.GRPM_ID : undefined }
}

function gradeLabel(grade: string) {
  if (/^\d+$/.test(grade)) return `${grade}세`
  if (/^all$|전체/i.test(grade)) return '전체'
  return grade
}

/** 무비이 예매 페이지를 이 영화가 선택된 상태로 연다 — 무비이 극장 페이지가 쓰는 링크 형식 그대로 */
export function movieeBookingUrl(ref: MovieeMovieRef) {
  const params = new URLSearchParams({ tid: ref.tid })
  if (ref.gId) params.set('gId', ref.gId)
  return `${ref.origin}/Movie/Ticket?${params}`
}

/** 알림 필드 한 줄: "감독 정보 없음 · 126분 · 드라마, 미스터리 · 12세" */
export function formatListingHints(hints: ListingHints) {
  return [
    hints.director ? `감독 ${hints.director}` : '감독 정보 없음',
    hints.year ? `${hints.year}년` : undefined,
    hints.runtimeMinutes ? `${hints.runtimeMinutes}분` : undefined,
    hints.genre,
    hints.grade ? gradeLabel(hints.grade) : undefined,
  ].filter(Boolean).join(' · ')
}

/** 러닝타임이 ±2분 안에서 정확히 한 후보와만 맞으면 그 인덱스 — 판단 보조용, 자동 매칭엔 안 쓴다 */
export function runtimeMatchIndex(runtimeMinutes: number | undefined, optionRuntimes: (number | null | undefined)[]) {
  if (!runtimeMinutes) return undefined
  const hits = optionRuntimes
    .map((runtime, index) => (runtime && Math.abs(runtime - runtimeMinutes) <= 2 ? index : -1))
    .filter((index) => index >= 0)
  return hits.length === 1 ? hits[0] : undefined
}
