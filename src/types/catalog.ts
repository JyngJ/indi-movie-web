import type { ShowtimeKind } from '@/components/domain/ShowtimeCell'

export interface CatalogTheater {
  id: string
  name: string
  address: string
  city: string
  lat: number
  lng: number
  kind: 'indie'
  phone?: string
  website?: string
  screenCount?: number
  seatCount?: number
}

export interface CatalogMovie {
  id: string
  title: string
  originalTitle?: string
  year?: number
  director?: string
  synopsis?: string
  tags: string[]
  posterUrl?: string
  runtimeMinutes?: number
  certification?: string
}

export interface CatalogShowtime {
  id: string
  theaterId: string
  movieId: string
  startTime: string
  endTime: string
  showDate: string
  seatAvailable: number
  seatTotal: number
  screenName: string
  kind: ShowtimeKind
  bookingUrl?: string
}

export interface CatalogResponse {
  theaters: CatalogTheater[]
  movies: CatalogMovie[]
  showtimes: CatalogShowtime[]
  generatedAt: string
}
