import type { ShowtimeFormat, ShowtimeLanguage } from './api'

export type AdminShowtimeStatus = 'draft' | 'needs_review' | 'approved' | 'rejected'
export type CrawlRunStatus = 'idle' | 'running' | 'completed' | 'failed'
export type CrawlInputKind = 'fixture' | 'url' | 'html' | 'csv'

export interface AdminTheaterSource {
  id: string
  theaterId: string
  theaterName: string
  homepageUrl: string
  listingUrl: string
  parser: 'jsonLdEvent' | 'tableText' | 'timelineCard' | 'csv'
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

export interface CrawlRequestPayload {
  sourceId: string
  inputKind: CrawlInputKind
  url?: string
  content?: string
}

export interface AdminTheaterSourceInput {
  theaterName: string
  homepageUrl: string
  listingUrl: string
  parser: AdminTheaterSource['parser']
  cadence: AdminTheaterSource['cadence']
  notes?: string
}
