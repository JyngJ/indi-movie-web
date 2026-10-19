import { resolveRegionFilter, LAST_WEEK_DAYS_THRESHOLD } from '@/lib/notifications/rules'
import type { FavoriteRef, LastWeekFact, NotificationPrefs, ScreeningFact } from '@/lib/notifications/types'
import { EMAIL_DIGEST_TITLE, buildEmailDigestSubject, type EmailDigestItem, shouldAskFrequency, FREQUENCY_FEEDBACK_OPTIONS } from './domain'
import { renderDigestEmail } from './templates'
export interface DigestEvent { id: string; kind: 'new_screening' | 'last_week'; subject_type: FavoriteRef['type']; subject_id: string; movie_id: string | null; theater_id: string | null; payload?: { movieTitle?: string; screeningRefs?: { movieId: string; theaterId: string }[] } }
export type DigestItem = EmailDigestItem
export function selectDigestItems(input: {
  events: DigestEvent[]; favorites: FavoriteRef[]; prefs: NotificationPrefs; screenings: ScreeningFact[]; lastWeek: LastWeekFact[]; today: string
}): DigestItem[] {
  const { events, favorites, prefs, screenings, lastWeek, today } = input
  const regionFilter = resolveRegionFilter(prefs, new Set(favorites.filter(f => f.type === 'theater').map(f => f.id)), new Map(screenings.map(s => [s.theaterId, s.regionId])))
  const items: DigestItem[] = []
  const included = new Map<string, DigestItem>()
  for (const e of events) {
    if (!favorites.some(f => f.type === e.subject_type && f.id === e.subject_id)) continue
    if (e.kind === 'new_screening' ? !prefs.newScreening : !prefs.lastWeek) continue
    const remaining = screenings.filter(s => (!e.movie_id || s.movieId === e.movie_id) && (!e.theater_id || s.theaterId === e.theater_id)
      && (e.payload?.screeningRefs ? e.payload.screeningRefs.some(ref => ref.movieId === s.movieId && ref.theaterId === s.theaterId) : e.movie_id ? true : s.movieTitle === e.payload?.movieTitle)
      && (e.subject_type === 'theater' || !regionFilter || regionFilter.has(s.regionId)) && s.dates.some(d => d >= today))
    if (!remaining.length) continue
    if (e.kind === 'last_week') {
      const fact = lastWeek.find(f => f.movieId === e.movie_id)
      if (!fact || fact.daysLeft < 0 || fact.daysLeft > LAST_WEEK_DAYS_THRESHOLD) continue
    }
    const identity = `${e.subject_type}:${e.subject_id}:${e.kind}:${e.movie_id ?? e.theater_id}`
    const existing = included.get(identity)
    if (existing) { existing.eventIds.push(e.id); continue }
    if (items.length === 20) continue
    const head = [...remaining].sort((a, b) => a.dates.filter(d => d >= today).sort()[0].localeCompare(b.dates.filter(d => d >= today).sort()[0]))[0]
    const date = remaining.flatMap(s => s.dates).filter(d => d >= today).sort()[0]
    const seenFilms = new Set<string>()
    const films = remaining.filter(s => { if (seenFilms.has(s.movieId)) return false; seenFilms.add(s.movieId); return true }).map(s => ({ title: s.movieTitle, directors: s.directors, posterUrl: s.posterUrl, description: '', path: `/movie/${encodeURIComponent(s.movieId)}?tab=theaters` }))
    const item: DigestItem = { groupType: e.subject_type, groupName: e.subject_type === 'theater' ? head.theaterName : e.subject_id,
      groupPath: e.subject_type === 'theater' ? `/films/theater/${encodeURIComponent(e.subject_id)}` : e.subject_type === 'director' ? `/films/director/${encodeURIComponent(e.subject_id)}` : undefined,
      films, directors: head.directors, posterUrl: head.posterUrl, eventIds: [e.id], title: e.movie_id ? head.movieTitle : `${head.theaterName}의 상영 소식`,
      description: `${e.kind === 'last_week' ? '막바지 상영' : '새 상영'} · ${head.theaterName}${remaining.length > 1 ? ' 외' : ''} · ${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일`,
      path: e.movie_id ? `/movie/${encodeURIComponent(e.movie_id)}?tab=theaters` : `/films/theater/${encodeURIComponent(e.theater_id!)}` }
    items.push(item)
    included.set(identity, item)
  }
  return items
}
export function renderDigest(input: { items: DigestItem[]; recommendations?: DigestItem[]; origin: string; unsubscribeUrl: string; frequencyUrl: string; sentCount: number }) {
  const { items, recommendations = [], origin, unsubscribeUrl, frequencyUrl, sentCount } = input
  const frequency = shouldAskFrequency(sentCount)
    ? FREQUENCY_FEEDBACK_OPTIONS.map(option => ({ label: option.label, url: `${frequencyUrl}&choice=${option.value}` })) : []
  const text = [EMAIL_DIGEST_TITLE, ...items.map(i => `${i.groupType === 'director' ? '관심 감독 · ' + i.groupName : i.groupType === 'theater' ? '관심 극장 · ' + i.groupName : i.title}\n${i.description}\n${origin}${i.path}${i.groupType !== 'movie' && i.films?.length ? '\n' + i.films.map(f => `${f.title} · ${(f.directors ?? []).join('·')}\n${origin}${f.path}`).join('\n\n') : ''}`),
    ...(recommendations.length ? ['이번 주 이런 상영도 있어요', ...recommendations.map(i => `${i.title}\n${i.description}\n예매하러 가기: ${origin}${i.path}`)] : []), `다른 상영 구경하러 가기: ${origin}/films`,
    ...(frequency.length ? ['발송 빈도는 어떤가요? 의견을 모아 조정할게요.', ...frequency.map(f => `${f.label}: ${f.url}`)] : []),
    '서비스를 쓰면서 겪은 불편이나 버그, 제안이 있으면 이 메일에 답장해 주세요.',
    '상영 소식 수신에 동의한 주소로 보냈어요. 새 소식이 있을 때 월·금 오전 9시에 보내 드려요.', `이메일 소식 그만 받기: ${unsubscribeUrl}`].join('\n\n')
  const html = renderDigestEmail({ items, recommendations, origin, unsubscribeUrl, frequency })
  return { subject: buildEmailDigestSubject(items), text, html }
}

/** 이번 주 일요일까지의 유효 상영. 관심 소식과 중복되는 영화는 제외하고 지역 설정을 따른다. */
export function selectWeeklyRecommendations(input: { screenings: ScreeningFact[]; favorites: FavoriteRef[]; prefs: NotificationPrefs; items: DigestItem[]; today: string }): DigestItem[] {
  const { screenings, favorites, prefs, items, today } = input
  const end = new Date(`${today}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + (7 - end.getUTCDay()) % 7)
  const lastDay = end.toISOString().slice(0, 10)
  const region = resolveRegionFilter(prefs, new Set(favorites.filter(f => f.type === 'theater').map(f => f.id)), new Map(screenings.map(s => [s.theaterId, s.regionId])))
  const excluded = new Set(items.flatMap(item => [item.path, ...(item.films ?? []).map(f => f.path)]).map(path => path.split('?')[0]))
  const candidates = screenings.flatMap(s => {
    const date = s.dates.filter(d => d >= today && d <= lastDay).sort()[0]
    const path = `/movie/${encodeURIComponent(s.movieId)}`
    return date && (!region || region.has(s.regionId)) && !excluded.has(path) ? [{ ...s, date, path }] : []
  }).sort((a, b) => a.date.localeCompare(b.date) || a.movieId.localeCompare(b.movieId) || a.theaterId.localeCompare(b.theaterId))
  const seen = new Set<string>()
  return candidates.filter(s => { if (seen.has(s.movieId)) return false; seen.add(s.movieId); return true }).slice(0, 3).map(s => ({ eventIds: [], title: s.movieTitle, description: `${s.theaterName} · ${Number(s.date.slice(5, 7))}월 ${Number(s.date.slice(8))}일`, posterUrl: s.posterUrl, path: s.path + '?tab=theaters' }))
}
