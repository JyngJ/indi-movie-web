export type GvStatus = '예매 가능' | '매진 임박' | '매진'
export type GvEventType = 'GV' | '토크' | '상영회' | '이벤트' | '페스티벌'

export interface GvEvent {
  id: string
  theaterId?: string
  theaterName: string
  movieId?: string
  movie: string
  eventDate?: string
  guest?: string
  time: string
  status: GvStatus
  type: GvEventType
  hue: number
  label: string
  movieNote?: string
  gvNote?: string
  subtitle?: string
  posterUrl?: string
  bookingUrl?: string
  seatTotal?: number
  seatAvailable?: number
}

/** 그룹 전체가 영화제 이벤트인지 — 핀 배지를 축제 전용 스타일(2줄, 보라)로 그릴지 판단 */
export function isFestivalGroup(events: GvEvent[]): boolean {
  return events.length > 0 && events.every((e) => e.type === '페스티벌')
}
