/**
 * 알림 판정 — 순수 함수. DB·네트워크·시간(now)을 받아만 쓰고 직접 읽지 않는다.
 *
 * 핵심 규칙
 * - 새 상영(new_screening): 관심 영화/감독 작품이 "이전에 못 보던 극장"에 걸렸을 때,
 *   또는 관심 극장에 "이전에 없던 작품"이 걸렸을 때. 이미 알린 조합은 dedupeKey로 걸러진다.
 * - 막바지(last_week): 관심 작품의 남은 상영일이 임계 이하일 때. 주차 단위로 한 번만.
 * - 크롤 데이터는 회차가 사라졌다 다시 생기는 흔들림이 있어서, 판정 기준을 "처음 본 조합"으로
 *   두고 dedupe를 주차가 아닌 영구 키로 잡는다(같은 영화×극장은 평생 한 번만 새 상영 알림).
 */

import type {
  FavoriteRef, LastWeekFact, NotificationEvent, NotificationPrefs, ScreeningFact,
} from './types'

/** 막바지 알림 임계 — 남은 상영일이 이 이하면 알린다 */
export const LAST_WEEK_DAYS_THRESHOLD = 5

/** 한 사용자에게 한 번에 만들 이벤트 상한 — 하트를 많이 눌러둔 사용자의 폭주 방지 */
export const MAX_EVENTS_PER_USER_PER_RUN = 20

/** yyyy-mm-dd → ISO 주차 키("2026-W34"). 막바지 알림을 주 1회로 묶는 데 쓴다 */
export function isoWeekKey(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`)
  // ISO 8601: 목요일이 속한 해가 그 주의 해
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day + 3)
  const year = d.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(year, 0, 4))
  const firstDay = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3)
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000))
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function newScreeningDedupeKey(movieId: string, theaterId: string): string {
  return `new_screening:${movieId}:${theaterId}`
}

export function lastWeekDedupeKey(movieId: string, weekKey: string): string {
  return `last_week:${movieId}:${weekKey}`
}

/** 관심 목록을 사용자별로 타입 나눠 담아둔 형태 */
interface FavoriteIndex {
  movies: Set<string>
  directors: Set<string>
  theaters: Set<string>
}

function indexFavorites(favorites: FavoriteRef[]): Map<string, FavoriteIndex> {
  const byUser = new Map<string, FavoriteIndex>()
  for (const f of favorites) {
    let idx = byUser.get(f.userId)
    if (!idx) { idx = { movies: new Set(), directors: new Set(), theaters: new Set() }; byUser.set(f.userId, idx) }
    if (f.type === 'movie') idx.movies.add(f.id)
    else if (f.type === 'director') idx.directors.add(f.id)
    else idx.theaters.add(f.id)
  }
  return byUser
}

/**
 * 새 상영 이벤트 판정.
 * @param seenKeys 이미 만들어둔 dedupeKey 집합(사용자별) — 여기 있으면 건너뛴다
 */
export function buildNewScreeningEvents(input: {
  favorites: FavoriteRef[]
  screenings: ScreeningFact[]
  prefsByUser: Map<string, NotificationPrefs>
  seenKeysByUser: Map<string, Set<string>>
}): NotificationEvent[] {
  const { favorites, screenings, prefsByUser, seenKeysByUser } = input
  const byUser = indexFavorites(favorites)
  const out: NotificationEvent[] = []

  for (const [userId, idx] of byUser) {
    const prefs = prefsByUser.get(userId)
    if (prefs && !prefs.newScreening) continue
    const seen = seenKeysByUser.get(userId) ?? new Set<string>()
    let made = 0

    for (const s of screenings) {
      if (made >= MAX_EVENTS_PER_USER_PER_RUN) break

      // 어떤 하트 때문에 걸렸는지 — 영화 > 감독 > 극장 순으로 하나만 고른다.
      // (셋 다 걸려도 소식은 한 장이면 된다)
      let subjectType: NotificationEvent['subjectType'] | null = null
      let subjectId = ''
      if (idx.movies.has(s.movieId)) { subjectType = 'movie'; subjectId = s.movieId }
      else {
        const dir = s.directors.find((d) => idx.directors.has(d))
        if (dir) { subjectType = 'director'; subjectId = dir }
        else if (idx.theaters.has(s.theaterId)) { subjectType = 'theater'; subjectId = s.theaterId }
      }
      if (!subjectType) continue

      const dedupeKey = newScreeningDedupeKey(s.movieId, s.theaterId)
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      made += 1

      out.push({
        userId,
        kind: 'new_screening',
        subjectType,
        subjectId,
        movieId: s.movieId,
        theaterId: s.theaterId,
        payload: {
          movieTitle: s.movieTitle,
          directors: s.directors,
          posterUrl: s.posterUrl,
          theaterName: s.theaterName,
          firstDate: s.dates[0],
        },
        dedupeKey,
      })
    }
    seenKeysByUser.set(userId, seen)
  }

  return out
}

/**
 * 막바지 이벤트 판정. 관심 "영화·감독"만 대상 — 관심 극장은 막바지 개념이 없다.
 */
export function buildLastWeekEvents(input: {
  favorites: FavoriteRef[]
  screenings: ScreeningFact[]
  lastWeekFacts: LastWeekFact[]
  prefsByUser: Map<string, NotificationPrefs>
  seenKeysByUser: Map<string, Set<string>>
  today: string
}): NotificationEvent[] {
  const { favorites, screenings, lastWeekFacts, prefsByUser, seenKeysByUser, today } = input
  const byUser = indexFavorites(favorites)
  const weekKey = isoWeekKey(today)
  const factByMovie = new Map(lastWeekFacts.map((f) => [f.movieId, f]))
  // 영화 정보(제목·극장)는 상영 사실에서 하나만 골라 쓴다
  const screeningByMovie = new Map<string, ScreeningFact>()
  for (const s of screenings) if (!screeningByMovie.has(s.movieId)) screeningByMovie.set(s.movieId, s)

  const out: NotificationEvent[] = []

  for (const [userId, idx] of byUser) {
    const prefs = prefsByUser.get(userId)
    if (prefs && !prefs.lastWeek) continue
    const seen = seenKeysByUser.get(userId) ?? new Set<string>()
    let made = 0

    for (const [movieId, fact] of factByMovie) {
      if (made >= MAX_EVENTS_PER_USER_PER_RUN) break
      if (fact.daysLeft > LAST_WEEK_DAYS_THRESHOLD) continue

      const s = screeningByMovie.get(movieId)
      if (!s) continue

      let subjectType: NotificationEvent['subjectType'] | null = null
      let subjectId = ''
      if (idx.movies.has(movieId)) { subjectType = 'movie'; subjectId = movieId }
      else {
        const dir = s.directors.find((d) => idx.directors.has(d))
        if (dir) { subjectType = 'director'; subjectId = dir }
      }
      if (!subjectType) continue

      const dedupeKey = lastWeekDedupeKey(movieId, weekKey)
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      made += 1

      out.push({
        userId,
        kind: 'last_week',
        subjectType,
        subjectId,
        movieId,
        theaterId: s.theaterId,
        payload: {
          movieTitle: s.movieTitle,
          directors: s.directors,
          posterUrl: s.posterUrl,
          theaterName: s.theaterName,
          firstDate: s.dates[0],
          daysLeft: fact.daysLeft,
          confidence: fact.confidence,
        },
        dedupeKey,
      })
    }
    seenKeysByUser.set(userId, seen)
  }

  return out
}

/**
 * 조용한 시간 판정 — "HH:MM" 문자열 비교. quietStart > quietEnd면 자정을 넘긴 구간.
 * @param nowHhmm KST 기준 현재 시각 "HH:MM"
 */
export function isQuietHour(nowHhmm: string, quietStart: string, quietEnd: string): boolean {
  if (quietStart === quietEnd) return false
  if (quietStart < quietEnd) return nowHhmm >= quietStart && nowHhmm < quietEnd
  return nowHhmm >= quietStart || nowHhmm < quietEnd   // 21:00~09:00 처럼 자정 넘김
}

/** 발송 문구 — 이벤트 묶음 하나를 한 줄 요약으로 */
export function summarizeForMessage(events: NotificationEvent[]): string {
  if (events.length === 0) return ''
  const first = events[0].payload.movieTitle
  const rest = events.length - 1
  const head = events[0].kind === 'last_week' ? '곧 내려가요' : '새 상영이 생겼어요'
  return rest > 0 ? `${first} 외 ${rest}편 ${head}` : `${first} ${head}`
}
