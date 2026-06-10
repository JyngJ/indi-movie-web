import type {
  AdminTheaterSource,
  CrawledShowtimeCandidate,
  CrawlInputKind,
} from '@/types/admin'
import { SAMPLE_CRAWL_CSV, SAMPLE_CRAWL_HTML } from './sources'
import {
  DEFAULT_PRICE,
  DEFAULT_SEAT_TOTAL,
  buildCandidate,
  normalizeDateTime,
  fetchJson,
  fetchText,
  mapWithConcurrency,
  extractDtryxCgid,
  extractMovieeTheaterId,
  createDtryxParams,
  createMovieePlayDateParams,
  createMovieeTimeParams,
  pickDtryxCinema,
  normalizeDtryxTime,
  normalizeCompactTime,
  normalizeMovieeMovieTitle,
  splitByDateLabel,
  normalizeKoreanDateLabel,
  extractTimelineMovieTitle,
  extractScreenNameFromVenue,
  parseSeat,
  parsePrice,
  normalizeScreenName,
  splitCsvLine,
  stripHtml,
  decodeHtmlEntity,
  normalizeWhitespace,
  todayIsoDate,
  toInt,
  absolutizeUrl,
  dedupeCandidates,
} from './crawler/utils'
import type { ParseContext, DtryxCinema } from './crawler/utils'
import { crawlTinyticketEventManager } from './crawler/browser'
import { crawlScreenshotOcr, crawlBoardImageOcr } from './crawler/ocr'

interface DtryxMovie {
  MovieCd: string
  MovieNm: string
  MovieNmEng?: string
  Rating?: string
  RunningTime?: string
  Url?: string
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

interface MovieePlayDate {
  PLAY_DT?: string
  PLAY_DT_STR?: string
}

interface MovieeShowtime {
  PT_ID?: string
  TS_NM?: string
  PLAY_TIME?: string
  END_TIME?: string
  SEAT_CNT?: string | number
  REMAINSEAT_CNT?: string | number
  T_ID?: string
  T_NM?: string
  M_ID?: string
  M_NM?: string
  PLAY_DT?: string
  SUBTITLE?: string
  TICKET_STOP_YN?: string
  RESERVE_YN?: string
}

interface MovielandOptionStock {
  option_value?: string
  option_value_orginal?: string[]
  stock_number?: number | string
  option_price?: number | string
  is_display?: string
  is_selling?: string
  use_soldout?: string
  use_soldout_original?: string
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
      signal: AbortSignal.timeout(15000),
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

  if (context.source.parser === 'movieeTicketApi') {
    return crawlMovieeTicketApi(context)
  }

  if (context.source.parser === 'movielandProductOptions') {
    return crawlMovielandProductOptions(context)
  }

  if (context.source.parser === 'seoulArtTimetable') {
    return crawlSeoulArtTimetable(context)
  }

  if (context.source.parser === 'selfHosted') {
    return crawlSelfHosted(context)
  }

  if (context.source.parser === 'tinyticketEventManager') {
    return crawlTinyticketEventManager(context)
  }

  if (context.source.parser === 'petitecine') {
    return crawlPetitecine(context)
  }

  if (context.source.parser === 'drfa') {
    return crawlDrfa(context)
  }

  if (context.source.parser === 'screenshotOcr') {
    return crawlScreenshotOcr(context)
  }

  if (context.source.parser === 'boardImageOcr') {
    return crawlBoardImageOcr(context)
  }

  const content = await resolveCrawlInput(
    context.inputKind,
    context.content,
    context.sourceUrl ?? context.source.listingUrl,
  )

  return parseShowtimeCandidates(content, context)
}

export async function crawlDtryxReservationApi(context: ParseContext) {
  const sourceUrl = context.sourceUrl ?? context.source.listingUrl
  const cgid = extractDtryxCgid(sourceUrl)
  const baseUrl = new URL(sourceUrl)
  const origin = baseUrl.origin
  const brandCd = baseUrl.searchParams.get('BrandCd') ?? 'dtryx'
  const screenFilter = baseUrl.searchParams.get('screenFilter') ?? null
  const urlCinemaCd = baseUrl.searchParams.get('CinemaCd') ?? null
  // screenFilter 한글 파라미터가 referer 헤더에 포함되지 않도록 제거
  baseUrl.searchParams.delete('screenFilter')
  const headers = buildDtryxHeaders(baseUrl.toString())
  const main = await fetchDtryxMain(origin, cgid, brandCd, headers)
  const cinemas = (main.CinemaList ?? []).filter((cinema) => cinema.HiddenYn !== 'Y')
  const movies = (main.MovieList ?? []).filter((movie) => movie.HiddenYn !== 'Y')
  const playDates = (main.PlaySdtList ?? []).filter((date) => date.HiddenYn !== 'Y').slice(0, 14)
  // 이름 매칭 → CinemaCd fallback → CinemaList에 없으면 synthetic cinema 생성
  const targetCinema = pickDtryxCinema(cinemas, context.source.theaterName)
    ?? (urlCinemaCd ? cinemas.find((c) => c.CinemaCd === urlCinemaCd) : undefined)
    ?? (urlCinemaCd ? { CinemaNm: context.source.theaterName, CinemaCd: urlCinemaCd, HiddenYn: 'N' as const } : undefined)

  if (!targetCinema) {
    throw new Error(`${context.source.theaterName} 영화관 코드를 찾지 못했습니다.`)
  }

  const candidates = await fetchDtryxShowtimes(origin, cgid, brandCd, headers, movies, playDates, targetCinema, context)
  if (!screenFilter) return candidates
  // 복합 건물 내 특정 관(screen)만 이 theater에 해당하는 경우 필터링
  return candidates.filter((c) => c.screenName.includes(screenFilter))
}

export async function crawlAllDtryxSources(
  sources: AdminTheaterSource[],
): Promise<Array<{ source: AdminTheaterSource; candidates: CrawledShowtimeCandidate[]; error?: string }>> {
  const groups = new Map<string, { origin: string; cgid: string; brandCd: string; sources: AdminTheaterSource[] }>()

  for (const source of sources) {
    try {
      const url = new URL(source.listingUrl)
      const brandCd = url.searchParams.get('BrandCd') ?? 'dtryx'
      const cgid = extractDtryxCgid(source.listingUrl)
      const key = `${url.origin}|${brandCd}`
      const group = groups.get(key) ?? { origin: url.origin, cgid, brandCd, sources: [] }
      group.sources.push(source)
      groups.set(key, group)
    } catch {
      // skip malformed URL sources
    }
  }

  const brandResults = await Promise.all(
    Array.from(groups.values()).map(async (group) => {
      try {
        const headers = buildDtryxHeaders(`${group.origin}/cinema/main.do?cgid=${group.cgid}&BrandCd=${group.brandCd}`)
        const main = await fetchDtryxMain(group.origin, group.cgid, group.brandCd, headers)
        const cinemas = (main.CinemaList ?? []).filter((c) => c.HiddenYn !== 'Y')
        const movies = (main.MovieList ?? []).filter((m) => m.HiddenYn !== 'Y')
        const playDates = (main.PlaySdtList ?? []).filter((d) => d.HiddenYn !== 'Y').slice(0, 14)

        return Promise.all(
          group.sources.map(async (source) => {
            const targetCinema = pickDtryxCinema(cinemas, source.theaterName)
            if (!targetCinema) {
              return { source, candidates: [], error: `${source.theaterName} 영화관 코드를 찾지 못했습니다.` }
            }
            const context: ParseContext = {
              source,
              inputKind: 'url',
              sourceUrl: source.listingUrl,
            }
            try {
              const candidates = await fetchDtryxShowtimes(group.origin, group.cgid, group.brandCd, headers, movies, playDates, targetCinema, context)
              return { source, candidates }
            } catch (error) {
              return { source, candidates: [], error: error instanceof Error ? error.message : '크롤링 오류' }
            }
          }),
        )
      } catch (error) {
        const msg = error instanceof Error ? error.message : '디트릭스 API 오류'
        return group.sources.map((source) => ({ source, candidates: [], error: msg }))
      }
    }),
  )

  return brandResults.flat()
}

function buildDtryxHeaders(referer: string): Record<string, string> {
  return {
    'user-agent': 'Mozilla/5.0 (compatible; indi-movie-web-admin-crawler/0.1)',
    accept: 'application/json, text/javascript, */*; q=0.01',
    'x-requested-with': 'XMLHttpRequest',
    referer,
  }
}

function buildDtryxBookingUrl(
  origin: string,
  _cgid: string,
  _brandCd: string,
  cinemaCd: string,
  movieCd: string,
  playSDT: string,
  showSeq: string | undefined,
  screenCd: string | undefined,
) {
  const params = new URLSearchParams({
    CinemaCd: cinemaCd,
    MovieCd: movieCd,
    PlaySDT: playSDT,
    ...(screenCd ? { ScreenCd: screenCd } : {}),
    ...(showSeq ? { ShowSeq: showSeq } : {}),
  })
  return `${origin}/reserve/cinema.do?${params}`
}

async function fetchDtryxMain(
  origin: string,
  cgid: string,
  brandCd: string,
  headers: Record<string, string>,
): Promise<{ MovieList?: DtryxMovie[]; CinemaList?: DtryxCinema[]; PlaySdtList?: DtryxPlayDate[] }> {
  const mainParams = createDtryxParams(cgid, {}, brandCd)
  return fetchJson(`${origin}/reserve/main_list.do?${mainParams}`, headers)
}

async function fetchDtryxShowtimes(
  origin: string,
  cgid: string,
  brandCd: string,
  headers: Record<string, string>,
  movies: DtryxMovie[],
  playDates: DtryxPlayDate[],
  targetCinema: DtryxCinema,
  context: ParseContext,
): Promise<CrawledShowtimeCandidate[]> {
  const tasks = playDates.flatMap((playDate) =>
    movies.map((movie) => async () => {
      const candidates: CrawledShowtimeCandidate[] = []
      const params = createDtryxParams(cgid, {
        CinemaCd: targetCinema.CinemaCd,
        MovieCd: movie.MovieCd,
        PlaySDT: playDate.PlaySDT,
      }, brandCd)
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
            bookingUrl: buildDtryxBookingUrl(origin, cgid, brandCd, targetCinema.CinemaCd, movie.MovieCd, playDate.PlaySDT, detail.ShowSeq, detail.ScreenCd),
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

export async function crawlMovieeTicketApi(context: ParseContext) {
  const sourceUrl = context.sourceUrl ?? context.source.listingUrl
  const tid = extractMovieeTheaterId(sourceUrl)
  const baseUrl = new URL(sourceUrl)
  const origin = baseUrl.origin
  const headers = {
    'user-agent': 'Mozilla/5.0 (compatible; indi-movie-web-admin-crawler/0.1)',
    accept: 'application/json, text/javascript, */*; q=0.01',
    'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
    'x-requested-with': 'XMLHttpRequest',
    referer: sourceUrl,
  }
  const dateParams = createMovieePlayDateParams(tid)
  const dateData = await fetchJson<{
    ResCd?: string
    ResData?: { Table?: MovieePlayDate[] }
  }>(`${origin}/api/TicketApi/GetPlayDateList?${dateParams}`, headers)
  const playDates = (dateData.ResData?.Table ?? [])
    .map((date) => date.PLAY_DT)
    .filter((date): date is string => Boolean(date))
    .slice(0, 14)

  const tasks = playDates.map((playDate) => async () => {
    const params = createMovieeTimeParams(tid, playDate)
    const timeData = await fetchJson<{
      ResCd?: string
      ResData?: { Table?: MovieeShowtime[] }
    }>(`${origin}/api/TicketApi/GetPlayTimeList?${params}`, headers)
    const rows = timeData.ResData?.Table ?? []

    return rows.flatMap((row) => {
      const showTime = normalizeCompactTime(row.PLAY_TIME)
      const movieTitle = normalizeMovieeMovieTitle(row.M_NM)
      const screenName = normalizeScreenName(row.TS_NM, context.source.theaterName)

      if (!showTime || !movieTitle) return []

      const closed = row.TICKET_STOP_YN === '1' || row.RESERVE_YN === '0'
      const warnings = [
        ...(closed ? ['예매 종료 또는 예매 불가 회차입니다.'] : []),
        ...(screenName === '상영관 확인 필요' ? ['상영관을 확인해야 합니다.'] : []),
      ]

      return [buildCandidate({
        context,
        movieTitle,
        showDate: row.PLAY_DT ?? playDate,
        showTime,
        endTime: normalizeCompactTime(row.END_TIME),
        screenName,
        formatText: [row.M_NM, row.SUBTITLE].filter(Boolean).join(' '),
        seatAvailable: toInt(row.REMAINSEAT_CNT, DEFAULT_SEAT_TOTAL),
        seatTotal: toInt(row.SEAT_CNT, DEFAULT_SEAT_TOTAL),
        price: DEFAULT_PRICE,
        bookingUrl: `${origin}/Movie/Ticket?tid=${encodeURIComponent(tid)}`,
        rawText: JSON.stringify(row),
        confidence: warnings.length ? 0.82 : 0.96,
        warnings,
      })]
    })
  })

  const candidateGroups = await mapWithConcurrency(tasks, 4)

  return dedupeCandidates(candidateGroups.flat())
}

export async function crawlMovielandProductOptions(context: ParseContext) {
  const sourceUrl = context.sourceUrl ?? context.source.listingUrl
  const content = await resolveCrawlInput(context.inputKind, context.content, sourceUrl)
  const productUrls = sourceUrl.includes('/product/')
    ? [sourceUrl]
    : extractMovielandProductUrls(content, sourceUrl)

  if (productUrls.length === 0) {
    throw new Error('무비랜드 Now Showing 페이지에서 상품 상세 URL을 찾지 못했습니다.')
  }

  const tasks = productUrls.map((productUrl) => async () => {
    const html = productUrl === sourceUrl ? content : await fetchText(productUrl)
    return parseMovielandProduct(html, productUrl, context)
  })
  const candidateGroups = await mapWithConcurrency(tasks, 4)

  return dedupeCandidates(candidateGroups.flat())
}

export async function crawlSelfHosted(context: ParseContext) {
  const url = context.sourceUrl ?? context.source.listingUrl
  const { hostname } = new URL(url)

  if (hostname.includes('moviee.co.kr')) {
    return crawlMovieeTicketApi(context)
  }
  if (hostname.includes('moonhwain.net') || hostname.includes('moonhwain.kr')) {
    return crawlMoonhwain(url, context)
  }
  if (hostname === 'www.dureraum.org' || hostname === 'dureraum.org') {
    return crawlDureraum(url, context)
  }

  throw new Error(`자체예매 시스템 파서가 없습니다: ${hostname}`)
}

async function crawlMoonhwain(sourceUrl: string, context: ParseContext) {
  const parsed = new URL(sourceUrl)
  const origin = parsed.origin
  const scheduleBase = `${origin}/reservation/01.html`

  const indexHtml = await fetchSelfHosted(scheduleBase)

  const bookingBase = indexHtml.match(
    /window\.open\(["'](https?:\/\/[^"']+?)\/rsvc\/rsv_mv\.html/,
  )?.[1] ?? origin

  const availableDates = Array.from(
    indexHtml.matchAll(/<div[^>]+class="day\s+on"[^>]*>[\s\S]*?<a[^>]+(?:href="[^"]*ss_date=([\d-]+)"|title="([\d-]+)")[^>]*>/g),
  )
    .map((m) => m[1] ?? m[2])
    .filter((d): d is string => Boolean(d))
    .slice(0, 14)

  if (availableDates.length === 0) {
    throw new Error(`moonhwain 상영 날짜를 찾지 못했습니다: ${scheduleBase}`)
  }

  const tasks = availableDates.map((date) => async () => {
    const html = await fetchSelfHosted(`${scheduleBase}?ss_date=${date}`)
    return parseMoonhwainDay(html, date, bookingBase, context)
  })

  const groups = await mapWithConcurrency(tasks, 3)
  return dedupeCandidates(groups.flat())
}

function parseMoonhwainDay(
  html: string,
  showDate: string,
  bookingBase: string,
  context: ParseContext,
): CrawledShowtimeCandidate[] {
  const candidates: CrawledShowtimeCandidate[] = []
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch: RegExpExecArray | null

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1]
    if (!/<td/.test(row)) continue

    const movieTitle = normalizeWhitespace(
      stripHtml(row.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1] ?? ''),
    )
    if (!movieTitle) continue

    const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) => m[1])
    const screenType = normalizeWhitespace(stripHtml(cells[1] ?? ''))
    const screenName = normalizeWhitespace(
      (cells[2] ?? '').replace(/<!--[\s\S]*?-->/g, ''),
    ).replace(/\s+/g, ' ').trim() || '상영관 확인 필요'

    const timeMatches = Array.from(
      row.matchAll(/javascript:wRsvMovie\('([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']*)'\)[^>]*>(\d{1,2}:\d{2})/g),
    )

    for (const [, bId, inSsIdx, q, rawTime] of timeMatches) {
      const showTime = normalizeDtryxTime(rawTime)
      if (!showTime) continue

      const bookingUrl = `${bookingBase}/rsvc/rsv_mv.html?b_id=${encodeURIComponent(bId)}&q=${encodeURIComponent(q)}&in_ss_idx=${encodeURIComponent(inSsIdx)}`
      const formatText = [screenType, screenName].filter(Boolean).join(' ')
      const warnings = screenName === '상영관 확인 필요' ? ['상영관을 확인해야 합니다.'] : []

      candidates.push(buildCandidate({
        context,
        movieTitle,
        showDate,
        showTime,
        screenName,
        formatText,
        seatAvailable: DEFAULT_SEAT_TOTAL,
        seatTotal: DEFAULT_SEAT_TOTAL,
        price: DEFAULT_PRICE,
        bookingUrl,
        rawText: JSON.stringify({ movieTitle, showDate, showTime, screenName, bId, inSsIdx }),
        confidence: warnings.length ? 0.82 : 0.93,
        warnings,
      }))
    }
  }

  return candidates
}

async function crawlDureraum(sourceUrl: string, context: ParseContext) {
  const base = 'https://www.dureraum.org/bcc/mcontents/caleList.do'
  const today = todayIsoDate()
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })

  const tasks = dates.map((date) => async () => {
    const html = await fetchSelfHosted(`${base}?rbsIdx=37&searchDate=${date}&spage=1`)
    return parseDurearumDay(html, date, context)
  })

  const groups = await mapWithConcurrency(tasks, 4)
  return dedupeCandidates(groups.flat())
}

function parseDurearumDay(html: string, showDate: string, context: ParseContext): CrawledShowtimeCandidate[] {
  const candidates: CrawledShowtimeCandidate[] = []
  const ulRegex = /<ul>\s*<li class="title">([\s\S]*?)<\/ul>/g
  let ulMatch: RegExpExecArray | null

  while ((ulMatch = ulRegex.exec(html)) !== null) {
    const block = ulMatch[1]

    const titleAnchor = block.match(/<a[^>]+href="(view\.do[^"]*)"[^>]+title="([^"]+)"/)
    if (!titleAnchor) continue

    const viewPath = titleAnchor[1]
    const rawTitle = titleAnchor[2]
    const movieTitle = rawTitle.trim()
    const bookingUrl = `https://www.dureraum.org/bcc/mcontents/${viewPath}`

    const screenName = normalizeWhitespace(
      block.match(/<li class="place">([^<]+)<\/li>/)?.[1] ?? '',
    ) || '영화의전당'

    const runtimeMatch = block.match(/(\d+)min/)
    const runtimeText = runtimeMatch ? `${runtimeMatch[1]}분` : ''
    const formatText = [screenName, runtimeText].filter(Boolean).join(' ')

    const timeMatches = Array.from(block.matchAll(/<li class="time">[\s\S]*?(\d{1,2}:\d{2})[\s\S]*?<\/li>/g))
    const times = [...new Set(
      timeMatches.map((m) => normalizeDtryxTime(m[1])).filter((t): t is string => Boolean(t)),
    )]

    if (times.length === 0) continue

    for (const showTime of times) {
      candidates.push(buildCandidate({
        context,
        movieTitle,
        showDate,
        showTime,
        screenName,
        formatText,
        seatAvailable: DEFAULT_SEAT_TOTAL,
        seatTotal: DEFAULT_SEAT_TOTAL,
        price: DEFAULT_PRICE,
        bookingUrl,
        rawText: JSON.stringify({ movieTitle, showDate, showTime, screenName }),
        confidence: 0.88,
        warnings: [],
      }))
    }
  }

  return candidates
}

async function fetchSelfHosted(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'ko-KR,ko;q=0.9',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`자체예매 페이지 요청 실패: ${url} (${response.status})`)
  }

  return response.text()
}

export async function crawlSeoulArtTimetable(context: ParseContext) {
  const sourceUrl = context.sourceUrl ?? context.source.listingUrl
  const content = await resolveCrawlInput(context.inputKind, context.content, sourceUrl)

  return parseSeoulArtTimetable(content, context)
}

function parseSeoulArtTimetable(content: string, context: ParseContext) {
  const dateLabels = Array.from(content.matchAll(/<td[^>]*>\s*<strong>\s*(\d{2}\.\d{2}\.[A-Za-z]{3})\s*<\/strong>\s*<\/td>/gi))
    .map((match) => match[1])
  const showDates = dateLabels.map(parseSeoulArtDate).filter((date): date is string => Boolean(date))

  if (showDates.length === 0) {
    throw new Error('서울아트시네마 상영시간표에서 날짜 헤더를 찾지 못했습니다.')
  }

  const rows = Array.from(content.matchAll(/<tr[^>]+class=["'][^"']*event[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi))
  const candidates: CrawledShowtimeCandidate[] = []

  rows.forEach((row) => {
    const cells = extractTableCells(row[1])
    const dayCells = cells.length > showDates.length ? cells.slice(cells.length - showDates.length) : cells

    dayCells.forEach((cell, index) => {
      const showDate = showDates[index]
      const showTime = normalizeDtryxTime(cell.match(/<strong>\s*(\d{1,2}:\d{2})\s*<\/strong>/i)?.[1])
      const bookingUrl = decodeHtmlEntity(cell.match(/<a[^>]+href=["']([^"']+)["']/i)?.[1] ?? '')
      const titleHtml = cell.match(/<p[^>]*class=["'][^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? ''
      const movieTitle = normalizeSeoulArtMovieTitle(titleHtml)

      if (!showDate || showDate < todayIsoDate() || !showTime || !movieTitle) return

      const warnings = [
        ...(isSeoulArtEventTitle(movieTitle) ? ['영화 본편이 아닌 행사/강연 회차일 수 있습니다.'] : []),
      ]

      candidates.push(buildCandidate({
        context,
        movieTitle,
        showDate,
        showTime,
        screenName: context.source.theaterName || '서울아트시네마',
        formatText: movieTitle,
        seatAvailable: DEFAULT_SEAT_TOTAL,
        seatTotal: DEFAULT_SEAT_TOTAL,
        price: DEFAULT_PRICE,
        bookingUrl: bookingUrl || context.sourceUrl || context.source.listingUrl,
        rawText: normalizeWhitespace(stripHtml(cell)),
        confidence: warnings.length ? 0.72 : 0.93,
        warnings,
      }))
    })
  })

  return dedupeCandidates(candidates)
}

function extractTableCells(row: string) {
  return Array.from(row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((match) => match[1])
}

function parseSeoulArtDate(value: string | undefined) {
  const match = String(value ?? '').match(/(\d{2})\.(\d{2})\./)
  if (!match) return undefined

  const today = new Date()
  const month = Number.parseInt(match[1], 10)
  const day = Number.parseInt(match[2], 10)
  let year = today.getFullYear()
  const candidate = new Date(year, month - 1, day)
  const staleThreshold = new Date(today)
  staleThreshold.setDate(today.getDate() - 30)

  if (candidate < staleThreshold) year += 1

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function normalizeSeoulArtMovieTitle(titleHtml: string) {
  return normalizeWhitespace(stripHtml(titleHtml))
    .replace(/\(\d+\s*min\).*$/i, '')
    .trim()
}

function isSeoulArtEventTitle(title: string) {
  return /섹션\s*\d+|시네토크|씨네토크|관객과의\s*대화|강연|포럼|토크|대담|특강/i.test(title)
}

function extractMovielandProductUrls(content: string, sourceUrl: string) {
  const origin = new URL(sourceUrl).origin
  const urls = Array.from(content.matchAll(/href=["']([^"']*\/product\/[^"']+\/category\/\d+\/[^"']*)["']/gi))
    .map((match) => absolutizeUrl(match[1], origin))
    .filter((url): url is string => Boolean(url))

  return Array.from(new Set(urls)).slice(0, 60)
}

function parseMovielandProduct(content: string, productUrl: string, context: ParseContext) {
  const stockData = parseMovielandOptionStockData(content)
  const movieTitle = extractMovielandMovieTitle(content)
  const price = extractMovielandPrice(content)
  const eventWarning = isMovielandEventProduct(movieTitle, content)
    ? '무비토크/GV 등 영화 본편이 아닌 이벤트 상품일 수 있습니다.'
    : undefined
  const showtimes = new Map<string, {
    showDate: string
    showTime: string
    seatTotal: number
    seatAvailable: number
    rawItems: MovielandOptionStock[]
  }>()

  for (const option of Object.values(stockData)) {
    const values = option.option_value_orginal ?? option.option_value?.split('-') ?? []
    const dateLabel = values[0]
    const timeLabel = values[1]
    const seatLabel = values[2]
    const showDate = parseMovielandDate(dateLabel)
    const showTime = normalizeDtryxTime(timeLabel)

    if (!showDate || !showTime || !seatLabel) continue
    if (showDate < todayIsoDate()) continue

    const key = `${showDate}|${showTime}`
    const current = showtimes.get(key) ?? {
      showDate,
      showTime,
      seatTotal: 0,
      seatAvailable: 0,
      rawItems: [],
    }
    const isDisplay = option.is_display !== 'F'
    const isSelling = option.is_selling !== 'F'
    const stockNumber = toInt(option.stock_number, 0)

    current.seatTotal += 1
    if (isDisplay && isSelling && stockNumber > 0) {
      current.seatAvailable += 1
    }
    current.rawItems.push(option)
    showtimes.set(key, current)
  }

  return Array.from(showtimes.values()).map((showtime) => {
    const warnings = [
      ...(showtime.seatAvailable === 0 ? ['무비랜드 상품 옵션상 매진 또는 판매 중지 회차입니다.'] : []),
      ...(movieTitle === '제목 확인 필요' ? ['영화 제목을 확인해야 합니다.'] : []),
      ...(eventWarning ? [eventWarning] : []),
    ]

    return buildCandidate({
      context: { ...context, sourceUrl: productUrl },
      movieTitle,
      showDate: showtime.showDate,
      showTime: showtime.showTime,
      screenName: context.source.theaterName || '무비랜드',
      formatText: 'standard',
      seatAvailable: showtime.seatAvailable,
      seatTotal: showtime.seatTotal || DEFAULT_SEAT_TOTAL,
      price,
      bookingUrl: productUrl,
      rawText: JSON.stringify({
        productUrl,
        options: showtime.rawItems.map((item) => item.option_value),
      }),
      confidence: eventWarning ? 0.72 : warnings.length ? 0.78 : 0.95,
      warnings,
    })
  })
}

function parseMovielandOptionStockData(content: string) {
  const encoded = content.match(/var\s+option_stock_data\s*=\s*'([\s\S]*?)';\s*var\s+stock_manage/)?.[1]
  if (!encoded) return {}

  try {
    return JSON.parse(decodeJsStringLiteral(encoded)) as Record<string, MovielandOptionStock>
  } catch {
    return {}
  }
}

function decodeJsStringLiteral(value: string) {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/')
}

// 페이지가 아직 JS로 값을 채우기 전이면 "LOADING . . ." 같은 placeholder 텍스트가 그대로 잡힌다 — 제목으로 취급하지 않는다
function isMovielandPlaceholderTitle(value: string) {
  return /^loading\b[\s.]*$/i.test(value.trim())
}

function extractMovielandMovieTitle(content: string) {
  const text = normalizeWhitespace(stripHtml(content))
  const koreanTitle =
    text.match(/영문상품명\s*([가-힣A-Za-z0-9\s:;,.!?'"()[\]-]{2,80})\s*판매가/)?.[1]?.trim() ??
    text.match(/상품요약정보\s*:?\s*([가-힣A-Za-z0-9\s:;,.!?'"()[\]-]{2,80})\s+\d{4}/)?.[1]?.trim()
  const heading = normalizeWhitespace(stripHtml(content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? ''))
  const ogTitle = decodeHtmlEntity(content.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? '')
    .replace(/\s*\|\s*영화 예매.*$/i, '')
    .trim()

  const candidates = [koreanTitle, heading, ogTitle]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .filter((value) => !isMovielandPlaceholderTitle(value))
  return candidates[0] || '제목 확인 필요'
}

function extractMovielandPrice(content: string) {
  const text = normalizeWhitespace(stripHtml(content))
  return parsePrice(text.match(/판매가\s*([0-9,]+원)/)?.[1] ?? text)
}

function isMovielandEventProduct(movieTitle: string, content: string) {
  const ogTitle = decodeHtmlEntity(content.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? '')
  const heading = normalizeWhitespace(stripHtml(content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? ''))
  return /무비\s*(토크|로크)|무비토크|movie\s*talk|\bgv\b|관객과의\s*대화/i.test(`${movieTitle} ${ogTitle} ${heading}`)
}

function parseMovielandDate(value: string | undefined) {
  const match = String(value ?? '').match(/(\d{1,2})\.(\d{1,2})/)
  if (!match) return undefined

  const today = new Date()
  const month = Number.parseInt(match[1], 10)
  const day = Number.parseInt(match[2], 10)
  let year = today.getFullYear()
  const candidate = new Date(year, month - 1, day)
  const staleThreshold = new Date(today)
  staleThreshold.setDate(today.getDate() - 30)

  if (candidate < staleThreshold) year += 1

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
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

/* ── petitecine (/api/W0060.do) ──────────────────────────────── */
async function crawlPetitecine(context: ParseContext): Promise<CrawledShowtimeCandidate[]> {
  const cinemaId = new URL(context.source.listingUrl).searchParams.get('cinema_id') ?? ''
  if (!cinemaId) throw new Error('petitecine: cinema_id 없음')

  const today = new Date()
  const allCandidates: CrawledShowtimeCandidate[] = []

  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}${mm}${dd}`
    const showDate = `${yyyy}-${mm}-${dd}`

    const resp = await fetch('https://petitecine.com/api/W0060.do', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'indi-movie-web-admin-crawler/0.1' },
      body: JSON.stringify({ req_cmd: 'selectlist', cinema_id: Number(cinemaId), chkCinemaId: 'N', movie_date: dateStr }),
      signal: AbortSignal.timeout(10000),
    })
    const res = await resp.json() as { result: number; data?: Array<Record<string, unknown>> }
    if (res.result !== 1) continue

    for (const row of res.data ?? []) {
      if (row['use_yn'] !== 'Y' || row['complete_yn'] === 'Y') continue
      const rawTime = String(row['movie_time'] ?? '')
      const rawEnd = String(row['movie_end'] ?? '')
      if (rawTime.length < 4) continue
      const showTime = `${rawTime.slice(0, 2)}:${rawTime.slice(2, 4)}`
      const endTime = rawEnd.length >= 4 ? `${rawEnd.slice(0, 2)}:${rawEnd.slice(2, 4)}` : undefined
      const movieTitle = String(row['movie_name'] ?? '').replace(/\s*\(.*?\)\s*/g, '').trim()
      const screenName = String(row['theater_name'] ?? '상영관')
      const seatAvail = Number(row['ticketing_seat_count'] ?? 0)
      const seatTotal = Number(row['movie_seat_count'] ?? 0)
      const closed = seatTotal > 0 && seatAvail === 0

      allCandidates.push(buildCandidate({
        context,
        movieTitle,
        showDate,
        showTime,
        endTime,
        screenName,
        formatText: '',
        seatAvailable: seatAvail,
        seatTotal,
        price: 0,
        bookingUrl: context.source.listingUrl,
        rawText: JSON.stringify(row),
        confidence: closed ? 0.82 : 0.95,
        warnings: closed ? ['매진'] : [],
      }))
    }
  }

  return dedupeCandidates(allCandidates)
}

/* ── DRFA (drfa.co.kr XE 캘린더) ────────────────────────────── */
async function crawlDrfa(context: ParseContext): Promise<CrawledShowtimeCandidate[]> {
  const url = context.sourceUrl ?? context.source.listingUrl
  const res = await fetch(url, {
    headers: { 'user-agent': 'indi-movie-web-admin-crawler/0.1' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`DRFA fetch 실패: ${res.status}`)
  const html = await res.text()

  // 연월 추출
  const ymMatch = html.match(/(\d{4})년\s*(\d{1,2})월/)
  const year = ymMatch ? parseInt(ymMatch[1]) : new Date().getFullYear()
  const month = ymMatch ? parseInt(ymMatch[2]) : new Date().getMonth() + 1

  // <td> 블록에서 날짜 + 상영 추출
  const tdBlocks = [...html.matchAll(/<td[^>]*>([\s\S]{0,2000}?)<\/td>/g)]
  const today = new Date().toISOString().slice(0, 10)
  const candidates: CrawledShowtimeCandidate[] = []

  for (const [, cell] of tdBlocks) {
    // 날짜 번호
    const dayMatch = cell.match(/class=['"](?:date|day)[^'"]*['"]>\s*(\d{1,2})\s*</)
      ?? cell.match(/>(\d{1,2})<\/(?:div|span|td)>/)
    if (!dayMatch) continue
    const day = parseInt(dayMatch[1])
    if (!day || day > 31) continue

    const showDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (showDate < today) continue

    // 시간 패턴: "2:00 pm" / "11:00 am"
    const timeMatches = [...cell.matchAll(/(\d{1,2}:\d{2})\s*(am|pm)/gi)]
    // 영화 제목 (한국어)
    const titleMatches = [...cell.matchAll(/<b>[\s\S]{0,20}?<br><br>([\s\S]{2,40}?)<\/font/g)]

    // 잔여좌석
    const seatMatch = cell.match(/잔여좌석.*?\/(\d+)석/)
    const seatTotal = seatMatch ? parseInt(seatMatch[1]) : 0

    for (let i = 0; i < timeMatches.length; i++) {
      const rawTime = timeMatches[i][1]
      const period = timeMatches[i][2].toLowerCase()
      const [hStr, mStr] = rawTime.split(':')
      let h = parseInt(hStr)
      const m = parseInt(mStr)
      if (period === 'pm' && h < 12) h += 12
      if (period === 'am' && h === 12) h = 0
      const showTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

      const rawTitle = titleMatches[i]?.[1]?.trim()
        ?? cell.match(/<b[^>]*>\s*(?:\d{1,2}:\d{2}\s*(?:am|pm)[^<]*<br><br>)?([\s\S]{2,40}?)<\/[^>]+>/i)?.[1]?.trim()
      const movieTitle = rawTitle
        ? rawTitle.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        : ''
      if (!movieTitle || movieTitle.length < 2) continue

      candidates.push(buildCandidate({
        context,
        movieTitle,
        showDate,
        showTime,
        screenName: '1관',
        formatText: '',
        seatAvailable: 0,
        seatTotal,
        price: 40000,
        bookingUrl: url,
        rawText: cell.slice(0, 200),
        confidence: 0.88,
        warnings: [],
      }))
    }
  }

  return dedupeCandidates(candidates)
}
