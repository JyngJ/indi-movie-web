// ================================
// 상영 없는 영화 상세 — "지금 볼 수 있는 비슷한 영화" 고르기 (순수 함수)
// ================================

export interface SimilarCandidate {
  id: string
  title: string
  year: number | null
  director: string[]
  nation: string | null
  genre: string[]
  posterUrl: string | null
}

export interface SimilarTarget {
  id: string
  director: string[]
  nation?: string | null
  year?: number | null
  genre: string[]
}

/** 카드 아래 한 줄로 보여 줄 이유 — 가장 센 근거 하나 */
export type SimilarReason =
  | { kind: 'director' }
  /** 겹친 장르 — 무거운(드문) 순, 최대 2개 */
  | { kind: 'genre'; names: string[] }

export interface SimilarPick extends Omit<SimilarCandidate, 'genre'> {
  reason: SimilarReason
  score: number
}

/* 점수 — 감독 > 장르. 국가·연도는 장르가 겹칠 때만 순서를 가르는 보조 값이다.
   국가 단독 기준은 뺐다(2026-10): 독립영화 대다수가 한국 영화라 "연도 비슷한 한국 영화"가 돼
   액션 스릴러에 휴먼 드라마가 붙었다.
   출연진은 쓰지 않는다 — movie_details.cast_members가 2026-10 기준 1,799편 모두 비어 있다.
   KMDb 배우 정보를 채우면 감독 다음 기준으로 넣을 만하다. */
const W_DIRECTOR = 10
const W_NATION = 0.3
const W_YEAR = 0.3
const YEAR_WINDOW = 5
/** 장르만으로 뽑히려면 넘어야 하는 점수 — "드라마" 하나(흔한 장르)로는 못 넘고, 드문 장르 하나나 흔한 장르 둘은 넘는다 */
const MIN_GENRE_SCORE = 0.9
/** 후보에만 있는 장르 감점 비율 — "액션" 하나 겹친 어린이 애니메이션(액션·애니메이션·가족)이
    액션 스릴러 옆에 붙던 것을 막는다. 겹친 장르 점수에서 후보 쪽 남는 장르 점수의 이만큼을 뺀다 */
const EXTRA_GENRE_PENALTY = 0.5

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
/** "한국, 프랑스"처럼 공동 제작이면 나라가 여러 개 — src/lib/nations.ts와 같은 구분자 */
const nations = (s: string | null | undefined) => new Set((s ?? '').split(/[,，/·]+/).map(norm).filter(Boolean))

/**
 * 장르 가중치 = ln(전체 편수 / 그 장르 편수). 상영작 대부분이 "드라마"라 드라마 겹침은 거의 0점,
 * "스릴러"·"애니메이션"처럼 드문 장르 겹침은 높게 친다.
 */
export function genreWeights(pool: readonly { genre: string[] }[]): Map<string, number> {
  const df = new Map<string, number>()
  for (const m of pool) for (const g of new Set(m.genre.map(norm))) df.set(g, (df.get(g) ?? 0) + 1)
  const n = Math.max(pool.length, 1)
  return new Map([...df].map(([g, c]) => [g, Math.log(n / c)]))
}

/**
 * 지금 상영 중인 영화 중 비슷한 것을 점수 순으로 고른다.
 * 감독이 같거나 장르 점수가 MIN_GENRE_SCORE를 넘어야 후보가 된다 — 관계없는 영화로
 * 칸을 채우지 않는다. 모든 페이지에 같은 목록이 붙으면 페이지끼리 내용이 겹쳐 색인 품질 판정
 * (2026-10 애드센스 "가치 없는 콘텐츠" 거절)을 오히려 해친다.
 */
export function pickSimilarNowShowing(
  movie: SimilarTarget,
  pool: readonly SimilarCandidate[],
  limit = 6,
): SimilarPick[] {
  const weights = genreWeights(pool)
  const directors = new Set(movie.director.map(norm).filter(Boolean))
  const genres = new Set(movie.genre.map(norm).filter(Boolean))
  const ownNations = nations(movie.nation)

  const picks: SimilarPick[] = []
  for (const m of pool) {
    if (m.id === movie.id) continue

    const sameDirector = m.director.some((d) => directors.has(norm(d)))
    const sharedGenres = m.genre
      .filter((g) => genres.has(norm(g)))
      .sort((a, b) => (weights.get(norm(b)) ?? 0) - (weights.get(norm(a)) ?? 0))
    const extraGenres = m.genre.filter((g) => !genres.has(norm(g)))
    const weightOf = (g: string) => weights.get(norm(g)) ?? 0
    const sharedScore = sharedGenres.reduce((s, g) => s + weightOf(g), 0)
    const genreScore = sharedScore > 0
      ? sharedScore - EXTRA_GENRE_PENALTY * extraGenres.reduce((s, g) => s + weightOf(g), 0)
      : 0

    if (!sameDirector && genreScore < MIN_GENRE_SCORE) continue

    const sameNation = [...nations(m.nation)].some((n) => ownNations.has(n))
    const nearYear = movie.year != null && m.year != null && Math.abs(movie.year - m.year) <= YEAR_WINDOW
    const score = (sameDirector ? W_DIRECTOR : 0)
      + genreScore
      + (genreScore > 0 && sameNation ? W_NATION : 0)
      + (genreScore > 0 && nearYear ? W_YEAR : 0)

    const reason: SimilarReason = sameDirector ? { kind: 'director' } : { kind: 'genre', names: sharedGenres.slice(0, 2) }

    const { genre: _genre, ...rest } = m
    picks.push({ ...rest, reason, score })
  }

  return picks
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'ko'))
    .slice(0, limit)
}

/** 카드 아래 한 줄 */
export function similarReasonLabel(reason: SimilarReason): string {
  switch (reason.kind) {
    case 'director': return '같은 감독'
    case 'genre': return reason.names.join('·')
  }
}
