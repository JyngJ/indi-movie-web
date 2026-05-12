import type { ShowtimeFormat, ShowtimeLanguage } from './api'

export type AdminShowtimeStatus = 'draft' | 'needs_review' | 'approved' | 'rejected'
export type CrawlRunStatus = 'idle' | 'running' | 'completed' | 'failed'
export type CrawlInputKind = 'fixture' | 'url' | 'html' | 'csv'

export interface AdminTheaterSource {
  id: string
  theaterId: string
  theaterName: string
  matchedTheaterId?: string
  homepageUrl: string
  listingUrl: string
  parser: 'jsonLdEvent' | 'tableText' | 'timelineCard' | 'dtryxReservationApi' | 'movielandProductOptions' | 'seoulArtTimetable' | 'csv'
  enabled: boolean
  cadence: 'manual' | 'daily' | 'twice_daily'
  lastCrawledAt?: string
  health: 'healthy' | 'degraded' | 'broken'
  notes?: string
}

export interface CrawledShowtimeCandidate {
  id: string
  sourceId: string
  theaterId: string
  theaterName: string
  movieTitle: string
  screenName: string
  showDate: string
  showTime: string
  endTime?: string
  formatType: ShowtimeFormat
  language: ShowtimeLanguage
  seatTotal: number
  seatAvailable: number
  price: number
  bookingUrl?: string
  sourceUrl?: string
  rawText: string
  confidence: number
  warnings: string[]
  status: AdminShowtimeStatus
  fingerprint: string
  matchedTheaterId?: string
  matchedMovieId?: string
  approvedAt?: string
  approvedBy?: string
}

export interface CrawlRun {
  id: string
  sourceId: string
  sourceName: string
  status: CrawlRunStatus
  inputKind: CrawlInputKind
  startedAt: string
  finishedAt?: string
  candidates: CrawledShowtimeCandidate[]
  createdCount: number
  updatedCount: number
  warningCount: number
  error?: string
}

export interface ShowtimeApprovalPayload {
  ids: string[]
  status: AdminShowtimeStatus
}

export interface ShowtimeApprovalResult {
  approved: Array<{
    candidateId: string
    showtimeId?: string
  }>
  failed: Array<{
    candidateId: string
    reason: string
  }>
}

export interface AdminMatchOption {
  id: string
  label: string
  description?: string
}

export interface AdminMatchOptions {
  theaters: AdminMatchOption[]
  movies: AdminMatchOption[]
}

export interface CandidateMatchPayload {
  candidateId: string
  matchedTheaterId?: string
  matchedMovieId?: string
}

export interface AdminMovieInput {
  id?: string
  title: string
  year: number
  originalTitle?: string
  genre?: string[]
  director?: string[]
  kmdbId?: string
  kmdbMovieSeq?: string
  posterUrl?: string
  synopsis?: string
  runtimeMinutes?: number
  certification?: string
}

export interface AdminMovie {
  id: string
  title: string
  year: number
  originalTitle?: string
  genre: string[]
  director: string[]
  kmdbId?: string
  kmdbMovieSeq?: string
  posterUrl?: string
  synopsis?: string
  runtimeMinutes?: number
  certification?: string
}

export interface AdminExternalMovie {
  provider: 'kmdb'
  externalId: string
  movieId: string
  movieSeq: string
  title: string
  originalTitle?: string
  year: number
  openDate?: string
  genre: string[]
  director: string[]
  nation?: string
  posterUrl?: string
  stillUrl?: string
  synopsis?: string
  runtimeMinutes?: number
  certification?: string
}

export interface AdminTheater {
  id: string
  name: string
  lat: number
  lng: number
  address: string
  city: string
  phone?: string
  website?: string
  screenCount: number
  seatCount?: number
}

export interface AdminTheaterInput {
  id?: string
  name: string
  lat: number
  lng: number
  address: string
  city: string
  phone?: string
  website?: string
  screenCount?: number
  seatCount?: number
}

export interface AdminServiceShowtime {
  id: string
  theaterId: string
  theaterName: string
  movieId: string
  movieTitle: string
  screenName: string
  showDate: string
  showTime: string
  endTime?: string
  formatType: ShowtimeFormat
  language: ShowtimeLanguage
  seatAvailable: number
  seatTotal: number
  price: number
  bookingUrl?: string
  isActive: boolean
}

export interface AdminShowtimeInput {
  id: string
  theaterId: string
  movieId: string
  screenName: string
  showDate: string
  showTime: string
  endTime?: string
  formatType: ShowtimeFormat
  language: ShowtimeLanguage
  seatAvailable: number
  seatTotal: number
  price: number
  bookingUrl?: string
  isActive: boolean
}

export interface CandidateAutoMatchResult {
  matched: number
  needsReview: number
  updated: CrawledShowtimeCandidate[]
}

export interface CrawlRequestPayload {
  sourceId: string
  inputKind: CrawlInputKind
  url?: string
  content?: string
}

export interface AdminTheaterSourceInput {
  theaterName: string
  matchedTheaterId?: string
  homepageUrl: string
  listingUrl: string
  parser: AdminTheaterSource['parser']
  cadence: AdminTheaterSource['cadence']
  notes?: string
}
