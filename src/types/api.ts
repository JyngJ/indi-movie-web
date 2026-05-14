// ================================
// API Types
// 예술영화관 상영 통합 조회 서비스
// ================================

// --- Common ---

export interface ApiError {
  error: {
    code: string
    message: string
  }
}

// --- Theater ---

export interface Theater {
  id: string
  name: string
  lat: number
  lng: number
  address: string
  city: string
  phone?: string
  website?: string
  screenCount?: number
  seatCount?: number
  amenities?: {
    parking: boolean
    restaurant: boolean
    accessibility: boolean
  }
  rating?: number
  createdAt: string
  updatedAt: string
}

export interface TheaterDetail extends Theater {
  screenCount: number
  operatingHours: Array<{
    dayOfWeek: number // 0=일, 1=월, ..., 6=토
    open: string      // "10:00"
    close: string     // "23:00"
  }>
}

export interface TheatersResponse {
  theaters: Theater[]
  total: number
}

export interface MapBounds {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
}

// --- Places ---

export type AreaType = 'city' | 'district' | 'neighborhood'

export interface Station {
  id: string
  sourceId?: string
  name: string
  lines: string[]
  lat: number
  lng: number
  city: string
  district?: string
  neighborhood?: string
  aliases: string[]
}

export interface Area {
  id: string
  sourceId?: string
  name: string
  type: AreaType
  city: string
  district?: string
  lat: number
  lng: number
  aliases: string[]
}

export interface SubwayLine {
  id: string
  sourceId?: string
  name: string
  lineCode: string
  color?: string
  geometry: unknown
}

// --- Movie ---

export interface Movie {
  id: string
  title: string
  originalTitle?: string
  year: number
  posterUrl?: string
  genre: string[]
  director: string[]
  nation?: string
  synopsis?: string
  runtimeMinutes?: number
  certification?: string
  kmdbId?: string
  tmdbId?: number
  rating?: number
}

export interface MoviesResponse {
  movies: Movie[]
}

// --- Showtime ---

export type ShowtimeFormat = 'standard' | '2k' | '4k' | 'imax' | 'dolby'
export type ShowtimeLanguage = 'korean' | 'english' | 'original'

export interface Showtime {
  id: string
  movieId: string
  movieTitle: string
  theaterId?: string
  theaterName?: string
  screenName: string
  showDate: string // "2026-05-01"
  showTime: string // "14:30"
  endTime?: string // "16:30"
  formatType: ShowtimeFormat
  language: ShowtimeLanguage
  seatAvailable: number
  seatTotal: number
  price: number
  bookingUrl?: string
}

export interface ShowtimesResponse {
  showtimes: Showtime[]
}

// --- Favorite ---

export type FavoriteType = 'theater' | 'movie'

export interface Favorite {
  id: string
  type: FavoriteType
  itemId: string
  notes?: string
  createdAt: string
}

export interface FavoritesResponse {
  favorites: Favorite[]
}

export interface AddFavoriteRequest {
  type: FavoriteType
  itemId: string
  notes?: string
}

// --- User ---

export interface User {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
  preferredCity?: string
  createdAt: string
}
