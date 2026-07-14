export type GvStatus = '예매 가능' | '매진 임박' | '매진'
export type GvEventType = 'GV' | '토크' | '상영회' | '이벤트'

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
