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
