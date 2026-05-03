import type {
  AdminTheaterSource,
  CrawledShowtimeCandidate,
  CrawlInputKind,
} from '@/types/admin'
import { SAMPLE_CRAWL_CSV, SAMPLE_CRAWL_HTML } from './sources'

const DEFAULT_PRICE = 12000
const DEFAULT_SEAT_TOTAL = 80

interface ParseContext {
  source: AdminTheaterSource
  inputKind: CrawlInputKind
  sourceUrl?: string
}

interface DtryxMovie {
  MovieCd: string
  MovieNm: string
  MovieNmEng?: string
  Rating?: string
  RunningTime?: string
  Url?: string
  HiddenYn?: string
}

interface DtryxCinema {
  CinemaCd: string
  CinemaNm: string
  HiddenYn?: string
}

interface DtryxPlayDate {
  PlaySDT: string
  HiddenYn?: string
}

interface DtryxShowtimeGroup {
  ScreenNm?: string
  ScreeningInfo?: string
  MovieDetail?: DtryxShowtimeDetail[]
}

interface DtryxShowtimeDetail {
  BrandCd?: string
  CinemaNm?: string
  MovieNm?: string
  MovieCd?: string
  ScreenNm?: string
  ScreeningInfo?: string
  StartTime?: string
  EndTime?: string
  RemainSeatCnt?: string | number
  TotalSeatCnt?: string | number
  SaleCloseYn?: string
  ScreenCd?: string
  ShowSeq?: string
}

export async function resolveCrawlInput(
  inputKind: CrawlInputKind,
  content?: string,
  url?: string,
) {
  if (content?.trim()) return content
  if (inputKind === 'csv') return SAMPLE_CRAWL_CSV
  if (inputKind === 'fixture') return SAMPLE_CRAWL_HTML
  if (inputKind === 'url' && url) {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'indi-movie-web-admin-crawler/0.1',
      },
    })

    if (!response.ok) {
      throw new Error(`크롤링 요청 실패: ${response.status}`)
    }

    return response.text()
  }

  return SAMPLE_CRAWL_HTML
}

export function parseShowtimeCandidates(
  content: string,
  context: ParseContext,
): CrawledShowtimeCandidate[] {
  const candidates =
    context.inputKind === 'csv'
      ? parseCsv(content, context)
      : [
          ...parseJsonLdEvents(content, context),
          ...parseTimelineCards(content, context),
          ...parseScheduleFragments(content, context),
        ]

  return dedupeCandidates(candidates)
}

export async function crawlShowtimeCandidates(context: ParseContext) {
  if (context.source.parser === 'dtryxReservationApi') {
    return crawlDtryxReservationApi(context)
  }

  const content = await resolveCrawlInput(
    context.inputKind,
    undefined,
    context.sourceUrl ?? context.source.listingUrl,
  )

  return parseShowtimeCandidates(content, context)
}

export async function crawlDtryxReservationApi(context: ParseContext) {
  const cgid = extractDtryxCgid(context.sourceUrl ?? context.source.listingUrl)
  const baseUrl = new URL(context.sourceUrl ?? context.source.listingUrl)
  const origin = baseUrl.origin
  const headers = {
    'user-agent': 'Mozilla/5.0 (compatible; indi-movie-web-admin-crawler/0.1)',
    accept: 'application/json, text/javascript, */*; q=0.01',
    'x-requested-with': 'XMLHttpRequest',
    referer: context.sourceUrl ?? context.source.listingUrl,
  }
  const mainParams = createDtryxParams(cgid)
  const main = await fetchJson<{
    MovieList?: DtryxMovie[]
    CinemaList?: DtryxCinema[]
    PlaySdtList?: DtryxPlayDate[]
  }>(`${origin}/reserve/main_list.do?${mainParams}`, headers)
  const cinemas = (main.CinemaList ?? []).filter((cinema) => cinema.HiddenYn !== 'Y')
  const movies = (main.MovieList ?? []).filter((movie) => movie.HiddenYn !== 'Y')
  const playDates = (main.PlaySdtList ?? []).filter((date) => date.HiddenYn !== 'Y').slice(0, 14)
  const targetCinema = pickDtryxCinema(cinemas, context.source.theaterName)

  if (!targetCinema) {
    throw new Error(`${context.source.theaterName} 영화관 코드를 찾지 못했습니다.`)
  }

  const tasks = playDates.flatMap((playDate) =>
    movies.map((movie) => async () => {
      const candidates: CrawledShowtimeCandidate[] = []
      const params = createDtryxParams(cgid, {
        CinemaCd: targetCinema.CinemaCd,
        MovieCd: movie.MovieCd,
        PlaySDT: playDate.PlaySDT,
      })
      const data = await fetchJson<{ Showseqlist?: DtryxShowtimeGroup[] }>(
        `${origin}/reserve/showseq_list.do?${params}`,
        headers,
      )
      const groups = data.Showseqlist ?? []

      groups.forEach((group) => {
        ;(group.MovieDetail ?? []).forEach((detail) => {
          const startTime = normalizeDtryxTime(detail.StartTime)
          const movieTitle = detail.MovieNm || movie.MovieNm

          if (!startTime || !movieTitle) return

          const screenName = [detail.ScreenNm ?? group.ScreenNm, detail.ScreeningInfo ?? group.ScreeningInfo]
            .filter(Boolean)
            .join(' ')
            .trim() || '상영관 확인 필요'
          const seatAvailable = toInt(detail.RemainSeatCnt, DEFAULT_SEAT_TOTAL)
          const seatTotal = toInt(detail.TotalSeatCnt, DEFAULT_SEAT_TOTAL)
          const closed = detail.SaleCloseYn === 'Y'
          const warnings = [
            ...(closed ? ['예매 종료 회차입니다.'] : []),
            ...(screenName === '상영관 확인 필요' ? ['상영관을 확인해야 합니다.'] : []),
          ]

          candidates.push(buildCandidate({
            context,
            movieTitle,
            showDate: playDate.PlaySDT,
            showTime: startTime,
            endTime: normalizeDtryxTime(detail.EndTime),
            screenName,
            formatText: `${screenName} ${movie.MovieNmEng ?? ''}`,
            seatAvailable,
            seatTotal,
            price: DEFAULT_PRICE,
            bookingUrl: `${origin}/reserve/movie.do?cgid=${encodeURIComponent(cgid)}`,
            rawText: JSON.stringify(detail),
            confidence: warnings.length ? 0.82 : 0.96,
            warnings,
          }))
        })
      })

      return candidates
    }),
  )

  const candidateGroups = await mapWithConcurrency(tasks, 6)

  return dedupeCandidates(candidateGroups.flat())
}

function parseJsonLdEvents(content: string, context: ParseContext) {
  const blocks = Array.from(
    content.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  )

  return blocks.flatMap((match) => {
    const json = stripHtml(match[1])
    try {
      const parsed = JSON.parse(json)
      const events = Array.isArray(parsed) ? parsed : [parsed]

      return events
        .flatMap((event) => {
          if (event['@graph']) return event['@graph']
          return event
        })
        .filter((event) => event?.['@type'] === 'Event' || event?.startDate)
        .map((event) => {
          const start = normalizeDateTime(String(event.startDate ?? ''))
          const screenName = normalizeScreenName(event.location?.name, context.source.theaterName)
          const bookingUrl = event.offers?.url ?? event.url
          const price = Number.parseInt(String(event.offers?.price ?? DEFAULT_PRICE), 10)

          return buildCandidate({
            context,
            movieTitle: String(event.name ?? '제목 미상'),
            showDate: start.date,
            showTime: start.time,
            screenName,
            formatText: 'standard',
            seatAvailable: DEFAULT_SEAT_TOTAL,
            seatTotal: DEFAULT_SEAT_TOTAL,
            price: Number.isFinite(price) ? price : DEFAULT_PRICE,
            bookingUrl,
            rawText: JSON.stringify(event),
            confidence: start.valid ? 0.86 : 0.42,
            warnings: start.valid ? [] : ['상영 시작 시간을 확정하지 못했습니다.'],
          })
        })
    } catch {
      return []
    }
  })
}

function parseScheduleFragments(content: string, context: ParseContext) {
  const articleMatches = Array.from(content.matchAll(/<(article|tr|li|div)[^>]*(showtime|schedule|time)[^>]*>[\s\S]*?<\/\1>/gi))

  return articleMatches
    .map((match) => parseFragment(match[0], context))
    .filter((candidate): candidate is CrawledShowtimeCandidate => Boolean(candidate))
}

function parseTimelineCards(content: string, context: ParseContext) {
  const sections = splitByDateLabel(content)

  return sections.flatMap((section) => {
    const showDate = normalizeKoreanDateLabel(section.label)
    const cards = section.html.match(/<div[^>]+class=["'][^"']*cardContainer[^"']*["'][^>]*>[\s\S]*?(?=<div[^>]+class=["'][^"']*cardContainer[^"']*["']|<div[^>]+class=["'][^"']*dateLabel[^"']*["']|$)/gi) ?? []

    return cards
      .map((card) => parseTimelineCard(card, showDate, context))
      .filter((candidate): candidate is CrawledShowtimeCandidate => Boolean(candidate))
  })
}

function parseTimelineCard(card: string, showDate: string, context: ParseContext) {
  const text = normalizeWhitespace(stripHtml(card))
  const time = text.match(/schedule\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i) ??
    text.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)
  const movieTitle = extractTimelineMovieTitle(card, text)
  const venue = normalizeWhitespace(stripHtml(card.match(/<div[^>]+class=["'][^"']*venue[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? ''))
  const screenName = extractScreenNameFromVenue(venue, context.source.theaterName)
  const seat = parseSeat(text)
  const bookingUrl = card.match(/<button[^>]*data-url=["']([^"']+)["']/i)?.[1] ?? card.match(/href=["']([^"']+)["']/i)?.[1]
  const warnings = [
    ...(!time ? ['상영 시간을 확인해야 합니다.'] : []),
    ...(movieTitle === '제목 확인 필요' ? ['영화 제목을 확인해야 합니다.'] : []),
    ...(screenName === '상영관 확인 필요' ? ['상영관을 확인해야 합니다.'] : []),
  ]

  if (!time || movieTitle === '제목 확인 필요') return null

  return buildCandidate({
    context,
    movieTitle,
    showDate,
    showTime: `${time[1].padStart(5, '0')}`,
    endTime: time[2].padStart(5, '0'),
    screenName,
    formatText: text,
    seatAvailable: seat.available,
    seatTotal: seat.total,
    price: parsePrice(text),
    bookingUrl,
    rawText: text,
    confidence: Math.max(0.5, 0.93 - warnings.length * 0.14),
    warnings,
  })
}

function parseFragment(fragment: string, context: ParseContext) {
  const datetime = fragment.match(/datetime=["']([^"']+)["']/i)?.[1]
  const text = normalizeWhitespace(stripHtml(fragment))
  const dateTime = normalizeDateTime(datetime ?? text)
  const movieTitle =
    stripHtml(fragment.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i)?.[1] ?? '') ||
    text.match(/(?:\d{4}[.-]\d{1,2}[.-]\d{1,2}|\d{1,2}:\d{2})\s*([가-힣A-Za-z0-9\s:;,.!?'"()[\]-]{2,40})/)?.[1]?.trim() ||
    '제목 확인 필요'
  const screenName =
    fragment.match(/data-screen=["']([^"']+)["']/i)?.[1] ??
    text.match(/(\d+관|시네마테크|아트홀|소극장|대극장)/)?.[1] ??
    '상영관 확인 필요'
  const seat = parseSeat(text)
  const bookingUrl = fragment.match(/href=["']([^"']+)["']/i)?.[1]
  const warnings = [
    ...(!dateTime.valid ? ['날짜 또는 시간이 불확실합니다.'] : []),
    ...(movieTitle === '제목 확인 필요' ? ['영화 제목을 확인해야 합니다.'] : []),
    ...(screenName === '상영관 확인 필요' ? ['상영관을 확인해야 합니다.'] : []),
  ]

  if (!dateTime.valid && movieTitle === '제목 확인 필요') return null

  return buildCandidate({
    context,
    movieTitle,
    showDate: dateTime.date,
    showTime: dateTime.time,
    screenName,
    formatText: text,
    seatAvailable: seat.available,
    seatTotal: seat.total,
    price: parsePrice(text),
    bookingUrl,
    rawText: text,
    confidence: Math.max(0.35, 0.9 - warnings.length * 0.18),
    warnings,
  })
}

function parseCsv(content: string, context: ParseContext) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const header = splitCsvLine(lines[0] ?? '')

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    const row = Object.fromEntries(header.map((key, index) => [key, values[index] ?? '']))
    const warnings = [
      ...(!row.movieTitle ? ['영화 제목이 비어 있습니다.'] : []),
      ...(!row.showDate || !row.showTime ? ['상영 일시가 비어 있습니다.'] : []),
    ]

    return buildCandidate({
      context,
      movieTitle: row.movieTitle || '제목 확인 필요',
      showDate: row.showDate || todayIsoDate(),
      showTime: row.showTime || '00:00',
      screenName: row.screenName || '상영관 확인 필요',
      formatText: row.formatType || 'standard',
      seatAvailable: toInt(row.seatAvailable, DEFAULT_SEAT_TOTAL),
      seatTotal: toInt(row.seatTotal, DEFAULT_SEAT_TOTAL),
      price: toInt(row.price, DEFAULT_PRICE),
      bookingUrl: row.bookingUrl,
      rawText: line,
      confidence: warnings.length ? 0.62 : 0.95,
      warnings,
    })
  })
}

function buildCandidate(input: {
  context: ParseContext
  movieTitle: string
  showDate: string
  showTime: string
  endTime?: string
  screenName: string
  formatText: string
  seatAvailable: number
  seatTotal: number
  price: number
  bookingUrl?: string
  rawText: string
  confidence: number
  warnings: string[]
}): CrawledShowtimeCandidate {
  const fingerprint = [
    input.context.source.theaterId,
    input.movieTitle,
    input.showDate,
    input.showTime,
    input.screenName,
  ]
    .join('|')
    .toLowerCase()

  return {
    id: stableId(fingerprint),
    sourceId: input.context.source.id,
    theaterId: input.context.source.theaterId,
    theaterName: input.context.source.theaterName,
    movieTitle: input.movieTitle.trim(),
    screenName: input.screenName.trim(),
    showDate: input.showDate,
    showTime: input.showTime,
    endTime: input.endTime,
    formatType: normalizeFormat(input.formatText),
    language: normalizeLanguage(input.formatText),
    seatAvailable: input.seatAvailable,
    seatTotal: input.seatTotal,
    price: input.price,
    bookingUrl: input.bookingUrl,
    sourceUrl: input.context.sourceUrl ?? input.context.source.listingUrl,
    rawText: input.rawText,
    confidence: Number(input.confidence.toFixed(2)),
    warnings: input.warnings,
    status: input.warnings.length || input.confidence < 0.8 ? 'needs_review' : 'draft',
    fingerprint,
  }
}

function normalizeDateTime(value: string) {
  const normalized = normalizeWhitespace(value)
  const iso = normalized.match(/(\d{4})[-.](\d{1,2})[-.](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2}))?/)
  const timeOnly = normalized.match(/(\d{1,2}):(\d{2})/)

  if (iso) {
    const date = `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
    const time = `${(iso[4] ?? timeOnly?.[1] ?? '00').padStart(2, '0')}:${iso[5] ?? timeOnly?.[2] ?? '00'}`
    return { date, time, valid: Boolean(iso[4] || timeOnly) }
  }

  return {
    date: todayIsoDate(),
    time: timeOnly ? `${timeOnly[1].padStart(2, '0')}:${timeOnly[2]}` : '00:00',
    valid: Boolean(timeOnly),
  }
}

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    headers,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`디트릭스 API 요청 실패: ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function mapWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
) {
  const results: T[] = []
  let nextIndex = 0

  async function worker() {
    while (nextIndex < tasks.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await tasks[currentIndex]()
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()),
  )

  return results
}

function extractDtryxCgid(url: string) {
  try {
    const parsed = new URL(url)
    const cgid = parsed.searchParams.get('cgid')
    if (cgid) return cgid
  } catch {
    const cgid = url.match(/[?&]cgid=([^&]+)/)?.[1]
    if (cgid) return decodeURIComponent(cgid)
  }

  throw new Error('디트릭스 예매 URL에서 cgid를 찾지 못했습니다.')
}

function createDtryxParams(cgid: string, overrides: Partial<Record<string, string>> = {}) {
  return new URLSearchParams({
    cgid,
    BrandCd: 'dtryx',
    CinemaCd: 'all',
    MovieCd: 'all',
    PlaySDT: 'all',
    Sort: 'boxoffice',
    ScreenCd: '',
    ShowSeq: '',
    TabBrandCd: 'dtryx',
    TabRegionCd: 'all',
    TabMovieType: 'all',
    ...overrides,
  })
}

function pickDtryxCinema(cinemas: DtryxCinema[], theaterName: string) {
  const normalizedTarget = normalizeKoreanName(theaterName)

  return cinemas.find((cinema) => normalizeKoreanName(cinema.CinemaNm) === normalizedTarget) ??
    cinemas.find((cinema) => normalizeKoreanName(cinema.CinemaNm).includes(normalizedTarget)) ??
    cinemas.find((cinema) => normalizedTarget.includes(normalizeKoreanName(cinema.CinemaNm)))
}

function normalizeKoreanName(value: string) {
  return value.replace(/\s+/g, '').replace(/[()（）\-_·.]/g, '').toLowerCase()
}

function normalizeDtryxTime(value: unknown) {
  const text = String(value ?? '').trim()
  const match = text.match(/^(\d{1,2}):?(\d{2})$/)

  if (!match) return undefined

  return `${match[1].padStart(2, '0')}:${match[2]}`
}

function splitByDateLabel(content: string) {
  const parts = content.split(/<div[^>]+class=["'][^"']*dateLabel[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
  const sections: Array<{ label: string; html: string }> = []

  for (let index = 1; index < parts.length; index += 2) {
    sections.push({
      label: normalizeWhitespace(stripHtml(parts[index] ?? '')),
      html: parts[index + 1] ?? '',
    })
  }

  return sections
}

function normalizeKoreanDateLabel(label: string) {
  const currentYear = new Date().getFullYear()
  const match = label.match(/(\d{1,2})\s*\/\s*(\d{1,2})/)

  if (!match) return todayIsoDate()

  return `${currentYear}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
}

function extractTimelineMovieTitle(card: string, text: string) {
  const nameBox = card.match(/<div[^>]+class=["'][^"']*nameBox[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]
  const nameBoxText = normalizeWhitespace(stripHtml(nameBox ?? ''))
  const fromNameBox = nameBoxText
    .replace(/^.*radio_button_checked\s*/i, '')
    .replace(/\s*schedule\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}.*$/i, '')
    .trim()
  const fromTitle = card.match(/title=["']([^"']+)["']/i)?.[1]?.trim()
  const fromText = text.match(/radio_button_checked\s*(.*?)\s*schedule/i)?.[1]?.trim()

  return fromNameBox || fromTitle || fromText || '제목 확인 필요'
}

function extractScreenNameFromVenue(venue: string, theaterName: string) {
  if (!venue) return theaterName || '상영관 확인 필요'

  const suffix = venue.split('_').slice(1).join('_').trim()
  if (suffix) return suffix

  if (venue.includes(theaterName)) return theaterName

  return venue || '상영관 확인 필요'
}

function normalizeFormat(text: string) {
  const lower = text.toLowerCase()
  if (lower.includes('imax')) return 'imax'
  if (lower.includes('dolby')) return 'dolby'
  if (lower.includes('4k')) return '4k'
  if (lower.includes('2k')) return '2k'
  return 'standard'
}

function normalizeLanguage(text: string) {
  const lower = text.toLowerCase()
  if (lower.includes('english') || lower.includes('영어')) return 'english'
  if (lower.includes('original') || lower.includes('원어')) return 'original'
  return 'korean'
}

function parseSeat(text: string) {
  const pair = text.match(/(?:잔여\s*)?(\d+)\s*\/\s*(\d+)/)
  if (pair) return { available: toInt(pair[1], DEFAULT_SEAT_TOTAL), total: toInt(pair[2], DEFAULT_SEAT_TOTAL) }

  const total = text.match(/(\d+)\s*석/)
  const seatTotal = total ? toInt(total[1], DEFAULT_SEAT_TOTAL) : DEFAULT_SEAT_TOTAL

  return { available: seatTotal, total: seatTotal }
}

function parsePrice(text: string) {
  const price = text.match(/(?:가격|price|₩)\s*(\d{1,3}(?:,\d{3})+|\d{4,5})|(\d{1,3}(?:,\d{3})+|\d{4,5})\s*원/i)
  return price ? toInt((price[1] ?? price[2]).replaceAll(',', ''), DEFAULT_PRICE) : DEFAULT_PRICE
}

function normalizeScreenName(value: unknown, theaterName: string) {
  const screen = String(value ?? '').replace(theaterName, '').trim()
  return screen || '상영관 확인 필요'
}

function splitCsvLine(line: string) {
  return line
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map((value) => value.replace(/^"|"$/g, '').trim())
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ')
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function toInt(value: string | number | undefined, fallback: number) {
  const next = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(next) ? next : fallback
}

function stableId(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return `st_${Math.abs(hash).toString(36)}`
}

function dedupeCandidates(candidates: CrawledShowtimeCandidate[]) {
  const seen = new Map<string, CrawledShowtimeCandidate>()

  for (const candidate of candidates) {
    const existing = seen.get(candidate.fingerprint)
    if (!existing || candidate.confidence > existing.confidence) {
      seen.set(candidate.fingerprint, candidate)
    }
  }

  return Array.from(seen.values()).sort((a, b) => {
    const left = `${a.showDate} ${a.showTime} ${a.movieTitle}`
    const right = `${b.showDate} ${b.showTime} ${b.movieTitle}`
    return left.localeCompare(right)
  })
}
