import type { TheaterEvent, EventType } from '@/types/admin'
import type { GvEvent, GvEventType } from '@/data/gv-events'

const EVENT_TYPE_LABEL: Record<EventType, GvEventType> = {
  gv: 'GV',
  talk: '토크',
  masterclass: '토크',
  overnight: '상영회',
  special: '이벤트',
}

/**
 * DB의 event_type 컬럼은 CHECK 제약으로 'gv'|'talk'|'overnight'|'special'|'masterclass'만 허용해서
 * 새 값을 추가할 수 없다(마이그레이션 없이 관리되는 스키마) — 대신 제목에 "영화제"가 들어간 이벤트를
 * 페스티벌로 취급한다. 여러 극장에 걸친 다회차 상영제(정동진독립영화제 등)를 위한 임시 신호.
 */
export function isFestivalTitle(title: string): boolean {
  return title.includes('영화제')
}

/** movie_title이 없으면 크롤된 제목의 "<영화제목>" 패턴에서 추출 (KOFA/숲톡/씨네모어 등 공통 표기) */
function extractMovieTitle(title: string, movieTitle?: string): string {
  if (movieTitle) return movieTitle
  return title.match(/<([^<>]+)>/)?.[1]?.trim() ?? title
}

function hashHue(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return Math.abs(hash) % 360
}

function formatGvTime(eventDate: string, eventTime?: string): string {
  const [, month, day] = eventDate.split('-')
  const datePart = `${Number(month)}/${Number(day)}`
  return eventTime ? `${datePart} ${eventTime.slice(0, 5)}` : datePart
}

/** 이벤트 타입별 강조색 — design.md semantic 컬러 재사용 (GV: warning, 토크: success, 상영회·이벤트: error, 페스티벌: 보라) */
export function gvEventTypeColor(type: GvEventType): string {
  if (type === '페스티벌') return '#7C3AED'
  if (type === '토크') return 'var(--color-success)'
  if (type === '상영회' || type === '이벤트') return 'var(--color-error)'
  return 'var(--color-warning)'
}

export function theaterEventToGvEvent(ev: TheaterEvent): GvEvent {
  const movie = extractMovieTitle(ev.title, ev.movieTitle)
  return {
    id: ev.id,
    theaterId: ev.theaterId,
    theaterName: ev.theaterName,
    movieId: ev.movieId,
    movie,
    eventDate: ev.eventDate,
    guest: ev.guests.length > 0 ? ev.guests.join(' · ') : undefined,
    time: formatGvTime(ev.eventDate, ev.eventTime),
    status: '예매 가능',
    type: isFestivalTitle(ev.title) ? '페스티벌' : EVENT_TYPE_LABEL[ev.eventType],
    hue: hashHue(movie),
    label: movie.charAt(0) || 'G',
    gvNote: ev.description,
    bookingUrl: ev.bookingUrl ?? ev.sourceUrl,
  }
}
