import type {
  AdminTheaterSource,
  CrawledShowtimeCandidate,
  CrawlInputKind,
} from '@/types/admin'

export const DEFAULT_PRICE = 12000
export const DEFAULT_SEAT_TOTAL = 80

export interface ParseContext {
  source: AdminTheaterSource
  inputKind: CrawlInputKind
  sourceUrl?: string
  content?: string
}

export interface DtryxCinema {
  CinemaCd: string
  CinemaNm: string
  HiddenYn?: string
}

export function buildCandidate(input: {
  context: ParseContext
  movieTitle: string
  releaseYear?: number
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
    releaseYear: input.releaseYear,
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

export function normalizeDateTime(value: string) {
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

/**
 * 크롤러 신원. 사이트 주소와 연락처를 담아 상대가 우리를 특정하고 연락할 수 있게 한다.
 *
 * 한동안 크롬 UA에 sec-ch-ua 클라이언트 힌트까지 맞춰 브라우저인 척했다. 예전에 UA에
 * "crawler"가 박혀 dtryx 봇 필터에 걸린 적이 있어서였는데, 2026-09-18에 RPi(운영 IP)에서
 * 활성 크롤 소스 32곳을 두 UA로 직접 찔러 확인했다:
 *   · 30곳 — 응답 코드·크기가 바이트 단위로 동일
 *   · tinyticket — 정직한 UA 44KB 정상 / 브라우저 UA 820B 빈 껍데기 (위장이 오히려 방해)
 *   · gymc.or.kr — UA와 무관하게 연결 실패(별건)
 * dtryx가 막는 건 `curl/8.x` 같은 기본 UA(403)이지 봇이 아니다. 신원을 밝힌 UA는 200이다.
 *
 * 위장을 유지하면 얻는 것 없이, IP 차단 후 로테이션 기록과 합쳐져
 * "차단 인지 → 신원 은닉 → 우회"라는 그림만 남는다. 도메인은 punycode로 쓴다 —
 * 헤더 값에 비ASCII를 넣으면 fetch가 거부한다.
 */
export const CRAWLER_UA =
  'indi-movie-web/1.0 (+https://www.xn--hq1bv8o5phw2d7wt.com; mail.jaeyong@gmail.com)'

/** 크롤 요청 기본 헤더. extra로 API별 헤더(accept 등)를 덮어쓴다. */
export function crawlerHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'user-agent': CRAWLER_UA,
    'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    ...extra,
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 일시적 네트워크 오류(타임아웃, 5xx, 연결 끊김)를 지수 백오프로 재시도한다.
 * dtryx IP 밴처럼 지속적으로 실패하는 경우는 retries 소진 후 그대로 던진다.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const { retries = 2, baseDelayMs = 500, label } = options
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === retries) break
      const wait = baseDelayMs * 2 ** attempt
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`${label ?? '요청'} 실패 (${attempt + 1}/${retries + 1}), ${wait}ms 후 재시도: ${message}`)
      await delay(wait)
    }
  }

  throw lastError
}

export async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  return withRetry(async () => {
    const response = await fetch(url, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new Error(`디트릭스 API 요청 실패: ${response.status}`)
    }

    return response.json() as Promise<T>
  }, { label: '디트릭스 API 요청' })
}

export async function fetchText(url: string) {
  return withRetry(async () => {
    const response = await fetch(url, {
      headers: crawlerHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new Error(`무비랜드 상품 페이지 요청 실패: ${response.status}`)
    }

    return response.text()
  }, { label: '무비랜드 상품 페이지 요청' })
}

export async function mapWithConcurrency<T>(
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

export function extractDtryxCgid(url: string) {
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

export function extractMovieeTheaterId(url: string) {
  try {
    const parsed = new URL(url)
    const tid = parsed.searchParams.get('tid') ?? parsed.searchParams.get('thsynid')
    if (tid) return tid
  } catch {
    const tid = url.match(/[?&](?:tid|thsynid)=([^&]+)/i)?.[1]
    if (tid) return decodeURIComponent(tid)
  }

  return '' // 서브도메인 사이트는 tid 없이 동작
}

export function createDtryxParams(cgid: string, overrides: Partial<Record<string, string>> = {}, brandCd = 'dtryx') {
  return new URLSearchParams({
    cgid,
    BrandCd: brandCd,
    CinemaCd: 'all',
    MovieCd: 'all',
    PlaySDT: 'all',
    Sort: 'boxoffice',
    ScreenCd: '',
    ShowSeq: '',
    TabBrandCd: brandCd,
    TabRegionCd: 'all',
    TabMovieType: 'all',
    ...overrides,
  })
}

export function createMovieePlayDateParams(tid: string) {
  return new URLSearchParams({
    tIdList: tid,
    mId: '',
    groupCd: '-1',
    mode: '0',
    gId: '',
    pId: '',
  })
}

export function createMovieeTimeParams(tid: string, playDate: string) {
  return new URLSearchParams({
    tId: tid,
    mId: '',
    playDt: playDate,
    ntId: '',
    gId: '',
  })
}

export function pickDtryxCinema(cinemas: DtryxCinema[], theaterName: string) {
  const normalizedTarget = normalizeKoreanName(theaterName)

  return cinemas.find((cinema) => normalizeKoreanName(cinema.CinemaNm) === normalizedTarget) ??
    cinemas.find((cinema) => normalizeKoreanName(cinema.CinemaNm).includes(normalizedTarget)) ??
    cinemas.find((cinema) => normalizedTarget.includes(normalizeKoreanName(cinema.CinemaNm)))
}

export function normalizeKoreanName(value: string | undefined | null) {
  return String(value ?? '').replace(/\s+/g, '').replace(/[()（）\-_·.]/g, '').toLowerCase()
}

export function normalizeDtryxTime(value: unknown) {
  const text = String(value ?? '').trim()
  const match = text.match(/^(\d{1,2}):?(\d{2})$/)

  if (!match) return undefined

  const hour = parseInt(match[1], 10) % 24
  return `${String(hour).padStart(2, '0')}:${match[2]}`
}

export function parseDtryxReleaseYear(value: unknown) {
  const match = String(value ?? '').match(/^(\d{4})-/)
  return match ? Number(match[1]) : undefined
}

export function normalizeCompactTime(value: unknown) {
  const text = String(value ?? '').trim()
  const compact = text.match(/^(\d{1,2})(\d{2})$/)
  if (compact) {
    const hour = parseInt(compact[1], 10) % 24
    return `${String(hour).padStart(2, '0')}:${compact[2]}`
  }

  return normalizeDtryxTime(text)
}

export function normalizeMovieeMovieTitle(value: unknown) {
  return String(value ?? '')
    .replace(/\((?:2D|3D|4D|영문자막|한글자막|자막|더빙|굿즈패키지|GV|시네토크|씨네토크)\)\s*$/i, '')
    .trim()
}

export function splitByDateLabel(content: string) {
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

export function normalizeKoreanDateLabel(label: string) {
  const currentYear = new Date().getFullYear()
  const match = label.match(/(\d{1,2})\s*\/\s*(\d{1,2})/)

  if (!match) return todayIsoDate()

  return `${currentYear}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
}

export function extractTimelineMovieTitle(card: string, text: string) {
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

export function extractScreenNameFromVenue(venue: string, theaterName: string) {
  if (!venue) return theaterName || '상영관 확인 필요'

  const suffix = venue.split('_').slice(1).join('_').trim()
  if (suffix) return suffix

  if (venue.includes(theaterName)) return theaterName

  return venue || '상영관 확인 필요'
}

export function normalizeFormat(text: string) {
  const lower = text.toLowerCase()
  if (lower.includes('imax')) return 'imax'
  if (lower.includes('dolby')) return 'dolby'
  if (lower.includes('4k')) return '4k'
  if (lower.includes('2k')) return '2k'
  return 'standard'
}

export function normalizeLanguage(text: string) {
  const lower = text.toLowerCase()
  if (lower.includes('english') || lower.includes('영어')) return 'english'
  if (lower.includes('original') || lower.includes('원어')) return 'original'
  return 'korean'
}

export function parseSeat(text: string) {
  const pair = text.match(/(?:잔여\s*)?(\d+)\s*\/\s*(\d+)/)
  if (pair) return { available: toInt(pair[1], DEFAULT_SEAT_TOTAL), total: toInt(pair[2], DEFAULT_SEAT_TOTAL) }

  const total = text.match(/(\d+)\s*석/)
  const seatTotal = total ? toInt(total[1], DEFAULT_SEAT_TOTAL) : DEFAULT_SEAT_TOTAL

  return { available: seatTotal, total: seatTotal }
}

export function parsePrice(text: string) {
  const price = text.match(/(?:가격|price|₩)\s*(\d{1,3}(?:,\d{3})+|\d{4,5})|(\d{1,3}(?:,\d{3})+|\d{4,5})\s*원/i)
  return price ? toInt((price[1] ?? price[2]).replaceAll(',', ''), DEFAULT_PRICE) : DEFAULT_PRICE
}

export function normalizeScreenName(value: unknown, theaterName: string) {
  const screen = String(value ?? '').replace(theaterName, '').trim()
  return screen || '상영관 확인 필요'
}

export function splitCsvLine(line: string) {
  return line
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map((value) => value.replace(/^"|"$/g, '').trim())
}

export function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ')
}

export function decodeHtmlEntity(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export function toInt(value: string | number | undefined, fallback: number) {
  const next = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(next) ? next : fallback
}

export function stableId(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return `st_${Math.abs(hash).toString(36)}`
}

export function absolutizeUrl(value: string, origin: string) {
  try {
    return new URL(value, origin).toString()
  } catch {
    return undefined
  }
}

export function dedupeCandidates(candidates: CrawledShowtimeCandidate[]) {
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
