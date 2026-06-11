import type {
  AdminMatchOptions,
  AdminTheaterSource,
  CrawlInputKind,
  CrawledShowtimeCandidate,
  CrawlRun,
} from '@/types/admin'

export interface AdminPayload {
  sources: AdminTheaterSource[]
  runs: CrawlRun[]
  candidates: CrawledShowtimeCandidate[]
  matchOptions: AdminMatchOptions
  totalCandidates?: number
  totalReviewCandidates?: number
}

export interface OcrShowtime {
  movieTitle: string
  showDate: string
  showTime: string
  screenName: string
  endTime?: string
}

export interface OcrResult {
  theaterName: string
  showtimes: OcrShowtime[]
  corrections: string[]
  confidence: number
}

export const emptyPayload: AdminPayload = {
  sources: [],
  runs: [],
  candidates: [],
  matchOptions: {
    theaters: [],
    movies: [],
  },
}

export const inputKinds: Array<{ value: CrawlInputKind; label: string }> = [
  { value: 'fixture', label: '샘플 HTML' },
  { value: 'url', label: 'URL 크롤링' },
  { value: 'html', label: 'HTML 붙여넣기' },
  { value: 'csv', label: 'CSV 업로드' },
]

export type SourceFormState = {
  theaterName: string
  matchedTheaterId: string
  homepageUrl: string
  listingUrl: string
  parser: AdminTheaterSource['parser']
  cadence: AdminTheaterSource['cadence']
  notes: string
}

export const emptySourceForm: SourceFormState = {
  theaterName: '',
  matchedTheaterId: '',
  homepageUrl: '',
  listingUrl: '',
  parser: 'tableText',
  cadence: 'manual',
  notes: '',
}
