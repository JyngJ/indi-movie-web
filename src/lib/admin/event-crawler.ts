import type { AdminEventSource, CrawledEventCandidate, EventType } from '@/types/admin'

export interface EventParseContext {
  source: AdminEventSource
}

// ── fingerprint + stable id ────────────────────────────────────────────────

function stableId(fingerprint: string): string {
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    hash = (Math.imul(31, hash) + fingerprint.charCodeAt(i)) | 0
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  return `ev-${hex}-${fingerprint.slice(0, 8).replace(/[^a-z0-9]/gi, '')}`
}

function buildEventCandidate(input: {
  context: EventParseContext
  eventType: EventType
  title: string
  movieTitle?: string
  eventDate: string
  eventTime?: string
  endTime?: string
  guests?: string[]
  description?: string
  bookingUrl?: string
  sourceUrl: string
  rawText: string
  confidence: number
  warnings?: string[]
}): CrawledEventCandidate {
  const fingerprint = [
    input.context.source.theaterId,
    input.eventType,
    input.movieTitle ?? input.title,
    input.eventDate,
    input.eventTime ?? '',
  ]
    .join('|')
    .toLowerCase()

  return {
    id: stableId(fingerprint),
    sourceId: input.context.source.id,
    theaterId: input.context.source.theaterId,
    theaterName: input.context.source.theaterName,
    eventType: input.eventType,
    title: input.title.trim(),
    movieTitle: input.movieTitle?.trim(),
    eventDate: input.eventDate,
    eventTime: input.eventTime,
    endTime: input.endTime,
    guests: input.guests ?? [],
    description: input.description,
    bookingUrl: input.bookingUrl,
    sourceUrl: input.sourceUrl,
    rawText: input.rawText,
    confidence: input.confidence,
    warnings: input.warnings ?? [],
    status: 'draft',
    fingerprint,
  }
}

async function fetchEventHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; indi-movie-web-admin-crawler/0.1)',
      accept: 'text/html,*/*',
      'accept-language': 'ko-KR,ko;q=0.9',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`fetch 실패: ${url} (HTTP ${res.status})`)
  return res.text()
}

// ── 날짜 파싱 헬퍼 ────────────────────────────────────────────────────────

/**
 * "11/21", "3/5" 형태 → "2026-11-21" (올해/내년 추론)
 */
function parseKoreanSlashDate(monthDay: string): string | undefined {
  const m = monthDay.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!m) return undefined
  const month = parseInt(m[1], 10)
  const day = parseInt(m[2], 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined

  const now = new Date()
  let year = now.getFullYear()
  const candidate = new Date(year, month - 1, day)
  // 30일 이상 지난 날짜면 내년
  const stale = new Date(now)
  stale.setDate(now.getDate() - 30)
  if (candidate < stale) year += 1

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * "오후 7시 20분", "오전 10시" → "19:20", "10:00"
 */
function parseKoreanTime(period: string, hour: string, minute?: string): string {
  let h = parseInt(hour, 10)
  const m = parseInt(minute ?? '0', 10)
  if (period === '오후' && h < 12) h += 12
  if (period === '오전' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ── 더숲아트시네마 (deosup.com/25) ────────────────────────────────────────
// 구조: imweb board, 목록 페이지에 숲톡/씨네모어 + 영화제목 + 날짜 패턴
// 게스트 정보는 개별 포스트 og:description에서 추출

export async function crawlDeosupEvents(
  context: EventParseContext,
): Promise<CrawledEventCandidate[]> {
  const listingUrl = context.source.listingUrl // https://deosup.com/25
  const html = await fetchEventHtml(listingUrl)
  const tail = html.slice(Math.floor(html.length * 0.65))

  // 태그 제거 (주석 포함), 엔티티 유지
  const clean = tail.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

  // 패턴: 숲톡/씨네모어: &lt;영화제목&gt; MM/DD(요일) 오전|오후 H시 [M분]
  const entryRe =
    /(숲톡|씨네모어)[:\s]+&lt;([^&]{2,60})&gt;[^0-9가-힣]{0,20}(\d{1,2}\/\d{1,2})\([월화수목금토일]\)\s*(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/g

  // idx 순서 추출 (목록 순서대로 게시글 URL 구성)
  const idxMatches = Array.from(tail.matchAll(/idx=(\d+)/g)).map((m) => m[1])
  const idxList = [...new Set(idxMatches)]

  const candidates: CrawledEventCandidate[] = []
  let match: RegExpExecArray | null
  let entryIndex = 0

  while ((match = entryRe.exec(clean)) !== null) {
    const [, rawType, movieTitle, dateStr, period, hourStr, minuteStr] = match
    const eventDate = parseKoreanSlashDate(dateStr)
    if (!eventDate) continue

    const eventTime = parseKoreanTime(period, hourStr, minuteStr)
    const eventType: EventType = rawType === '씨네모어' ? 'talk' : 'gv'
    const title = `${rawType}: <${movieTitle}> ${dateStr} ${period} ${hourStr}시${minuteStr ? ` ${minuteStr}분` : ''}`
    const idx = idxList[entryIndex]
    const postUrl = idx
      ? `${listingUrl}/?q=YToxOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjt9&bmode=view&idx=${idx}&t=board`
      : listingUrl

    candidates.push(
      buildEventCandidate({
        context,
        eventType,
        title,
        movieTitle,
        eventDate,
        eventTime,
        sourceUrl: postUrl,
        bookingUrl: postUrl,
        rawText: match[0],
        confidence: 0.9,
      }),
    )
    entryIndex++
  }

  return dedupEventCandidates(candidates)
}

// ── 한국영상자료원 시네마테크 KOFA GV 전용 ─────────────────────────────────
// 기존 kofaCinematheque 파서에서 isGv=true인 회차만 event_candidates로 변환
// listingUrl: https://www.koreafilm.or.kr/cinematheque/schedule?keySort=GV

export async function crawlKofaEvents(
  context: EventParseContext,
): Promise<CrawledEventCandidate[]> {
  const url = context.source.listingUrl
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; indi-movie-web-admin-crawler/0.1)',
      accept: 'text/html,*/*',
      'accept-language': 'ko-KR,ko;q=0.9',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`KOFA GV fetch 실패: HTTP ${res.status}`)
  const html = await res.text()

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const candidates: CrawledEventCandidate[] = []

  for (const calBlock of html.split('<dl class="list-kofa-calendar-1">').slice(1)) {
    const monthMatch = calBlock.match(/<dt class="txt-month">(\d{1,2})월<\/dt>/)
    if (!monthMatch) continue
    const month = parseInt(monthMatch[1], 10)
    const nowMonth = now.getMonth() + 1
    const year = month < nowMonth - 6 ? now.getFullYear() + 1 : now.getFullYear()

    for (const dayBlock of calBlock.split('<dl class="list-day-1">').slice(1)) {
      const dayMatch = dayBlock.match(/<dt class="txt-day">(\d{1,2})\.\S+<\/dt>/)
      if (!dayMatch) continue
      const day = parseInt(dayMatch[1], 10)
      const eventDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      if (eventDate < today) continue

      for (const detailBlock of dayBlock.split('<ul class="list-detail-1">').slice(1)) {
        const isGv = detailBlock.includes('cm-icon-screen-1')
        if (!isGv) continue

        const timeMatch = detailBlock.match(/<span class="icon-dot">(\d{1,2}:\d{2})<\/span>/)
        if (!timeMatch) continue
        const eventTime = timeMatch[1].padStart(5, '0')

        const titleMatch = detailBlock.match(/<p class="txt-1"><a[^>]*>([^<]+)<\/a>/)
        if (!titleMatch) continue
        const movieTitle = titleMatch[1].trim()

        const roomMatch = detailBlock.match(/<li class="txt-room">([^<]+)<\/li>/)
        const room = roomMatch ? roomMatch[1].trim() : ''

        candidates.push(
          buildEventCandidate({
            context,
            eventType: 'gv',
            title: `GV: <${movieTitle}> ${eventDate} ${eventTime}${room ? ` (${room})` : ''}`,
            movieTitle,
            eventDate,
            eventTime,
            sourceUrl: url,
            bookingUrl: url,
            rawText: detailBlock.slice(0, 300).replace(/\s+/g, ' '),
            confidence: 0.93,
          }),
        )
      }
    }
  }

  return dedupEventCandidates(candidates)
}

// ── 씨네큐브 씨네토크 (cinecube.co.kr/event/EG002) ─────────────────────────
// 구조: 이벤트 카드 목록, 날짜 범위 + 영화제목. 정확한 시간은 이미지 내에 있어 추출 불가.
// eventDate = 기간 시작일, eventTime = undefined

export async function crawlCinecubeEvents(
  context: EventParseContext,
): Promise<CrawledEventCandidate[]> {
  const url = context.source.listingUrl // https://cinecube.co.kr/event/EG002
  const html = await fetchEventHtml(url)

  // 이벤트 카드: <a href="/event/view/ID"> ... 기간 YY.MM.DD ~ YY.MM.DD <영화제목> 씨네토크
  const cardRe =
    /<a[^>]+href="\/event\/view\/(\d+)"[^>]*>([\s\S]{50,1200}?)<\/a>/g
  const candidates: CrawledEventCandidate[] = []
  let cardMatch: RegExpExecArray | null

  while ((cardMatch = cardRe.exec(html)) !== null) {
    const [, eventId, cardHtml] = cardMatch
    const clean = cardHtml
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 영화 제목: <제목> 씨네토크
    const titleMatch = clean.match(/<([^>]{2,60})>\s*씨네토크/)
    if (!titleMatch) continue
    const movieTitle = titleMatch[1].trim()

    // 날짜 범위: "26.06.19 ~ 26.06.28"
    const dateMatch = clean.match(/(\d{2})\.(\d{2})\.(\d{2})\s*~\s*\d{2}\.\d{2}\.\d{2}/)
    if (!dateMatch) continue
    const year = 2000 + parseInt(dateMatch[1], 10)
    const month = dateMatch[2]
    const day = dateMatch[3]
    const eventDate = `${year}-${month}-${day}`

    const postUrl = `https://cinecube.co.kr/event/view/${eventId}`

    candidates.push(
      buildEventCandidate({
        context,
        eventType: 'talk',
        title: `씨네토크: <${movieTitle}>`,
        movieTitle,
        eventDate,
        // 정확한 시간은 이미지에만 있어 추출 불가
        sourceUrl: postUrl,
        bookingUrl: postUrl,
        rawText: clean.slice(0, 200),
        confidence: 0.8,
        warnings: ['씨네토크 정확한 시간은 이벤트 페이지에서 확인 필요'],
      }),
    )
  }

  return dedupEventCandidates(candidates)
}

// ── 인디스페이스 인디토크 (indiespace.kr) ─────────────────────────────────
// 구조: Tistory 블로그, 작품별 상영일정 카테고리
// JSON-LD ListItem → 포스트 URL → description에 "일시:", "참석:" 패턴

export async function crawlIndispaceEvents(
  context: EventParseContext,
): Promise<CrawledEventCandidate[]> {
  const listUrl = context.source.listingUrl // INDISPACE_CATEGORY
  const listHtml = await fetchEventHtml(listUrl)

  // JSON-LD ListItem에서 포스트 URL 추출
  const postUrls = Array.from(
    listHtml.matchAll(/"@id"\s*:\s*"(https:\/\/indiespace\.kr\/\d+)"/g),
  ).map((m) => m[1])

  const uniqueUrls = [...new Set(postUrls)].slice(0, 30)
  if (uniqueUrls.length === 0) {
    throw new Error('인디스페이스 포스트 URL을 찾지 못했습니다.')
  }

  const today = new Date().toISOString().slice(0, 10)
  const candidates: CrawledEventCandidate[] = []

  for (const postUrl of uniqueUrls) {
    try {
      const postHtml = await fetchEventHtml(postUrl)

      // JSON-LD Article — description에 인디토크 정보 포함
      const jsonLd = postHtml.match(
        /"description"\s*:\s*"([^"]{20,2000})"/,
      )
      if (!jsonLd) continue

      const desc = jsonLd[1]
        .replace(/\\u003c/gi, '<')
        .replace(/\\u003e/gi, '>')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&middot;/g, '·')
        .replace(/\\n/g, '\n')

      // 인디토크 포함 여부 확인
      if (!desc.includes('인디토크') && !desc.includes('GV') && !desc.includes('관객과의')) continue

      // 영화 제목 (og:title에서)
      const ogTitle = postHtml.match(/og:title[^>]*content="([^"]+)"/)
      const rawTitle = ogTitle ? ogTitle[1] : ''
      const movieTitleMatch = rawTitle.match(/<([^>]{2,60})>/)
      const movieTitle = movieTitleMatch ? movieTitleMatch[1].trim() : rawTitle.trim()

      // 일시: MM월 DD일(요일) 오전|오후 H시 [M분]
      const dateTimeMatch = desc.match(
        /일시\s*:\s*(\d{1,2})월\s*(\d{1,2})일[^가-힣]{0,10}(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/,
      )
      if (!dateTimeMatch) continue

      const month = String(parseInt(dateTimeMatch[1], 10)).padStart(2, '0')
      const day = String(parseInt(dateTimeMatch[2], 10)).padStart(2, '0')
      const now = new Date()
      let year = now.getFullYear()
      const candidate = new Date(`${year}-${month}-${day}`)
      const stale = new Date(now)
      stale.setDate(now.getDate() - 30)
      if (candidate < stale) year += 1
      const eventDate = `${year}-${month}-${day}`
      if (eventDate < today) continue

      const eventTime = parseKoreanTime(dateTimeMatch[3], dateTimeMatch[4], dateTimeMatch[5])

      // 참석: 이름 역할, 이름 역할
      const guestsMatch = desc.match(/참석\s*:\s*([^\n*]{5,150})/)
      const guests = guestsMatch
        ? guestsMatch[1].split(/[,，]/).map((g) => g.trim()).filter(Boolean)
        : []

      candidates.push(
        buildEventCandidate({
          context,
          eventType: 'gv',
          title: `인디토크: <${movieTitle}> ${month}/${day} ${dateTimeMatch[3]} ${dateTimeMatch[4]}시`,
          movieTitle,
          eventDate,
          eventTime,
          guests,
          description: desc.slice(0, 400),
          sourceUrl: postUrl,
          bookingUrl: postUrl,
          rawText: desc.slice(0, 300),
          confidence: 0.92,
        }),
      )
    } catch {
      // 개별 포스트 실패 → skip
    }
  }

  return dedupEventCandidates(candidates)
}

// ── 에무시네마 (Naver 블로그 RSS) ─────────────────────────────────────────
// emuartspace.com은 JS 리다이렉트 구조로 크롤 불가.
// 대신 Naver 블로그 RSS (rss.blog.naver.com/emuartspace.xml) 사용.
// 제목에 "GV" 또는 "씨네토크" 포함된 포스트만 처리.
// 포스트 본문: "일시: YY/M/DD(요일) H:MM 상영", "참석: ...", "진행: ..."

export async function crawlEmuEvents(
  context: EventParseContext,
): Promise<CrawledEventCandidate[]> {
  const rssUrl = context.source.listingUrl // https://rss.blog.naver.com/emuartspace.xml
  const rssXml = await fetchEventHtml(rssUrl)

  const itemBlocks = rssXml.split('<item>').slice(1)
  const today = new Date().toISOString().slice(0, 10)
  const candidates: CrawledEventCandidate[] = []

  for (const block of itemBlocks) {
    const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]>/)
    if (!titleMatch) continue
    const rssTitle = titleMatch[1].trim()

    if (!rssTitle.includes('GV') && !rssTitle.includes('씨네토크')) continue

    const urlMatch = block.match(/<link><!\[CDATA\[([\s\S]*?)\]\]>/)
    if (!urlMatch) continue
    const rssPostUrl = urlMatch[1].trim()

    const logNoMatch = rssPostUrl.match(/\/(\d{8,})(?:[?#]|$)/)
    if (!logNoMatch) continue
    const logNo = logNoMatch[1]

    try {
      const viewUrl = `https://blog.naver.com/PostView.nhn?blogId=emuartspace&logNo=${logNo}`
      const postHtml = await fetchEventHtml(viewUrl)

      // Naver SmartEditor 본문 영역 텍스트 추출
      const bodyText = postHtml
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')

      // 일시: 26/6/15(월) 20:00 상영
      const dtMatch = bodyText.match(
        /일시\s*:\s*(\d{2})\/(\d{1,2})\/(\d{1,2})\([월화수목금토일]\)\s*(\d{1,2}:\d{2})/,
      )
      if (!dtMatch) continue

      const year = 2000 + parseInt(dtMatch[1], 10)
      const month = String(parseInt(dtMatch[2], 10)).padStart(2, '0')
      const day = String(parseInt(dtMatch[3], 10)).padStart(2, '0')
      const eventDate = `${year}-${month}-${day}`
      if (eventDate < today) continue
      const eventTime = dtMatch[4].padStart(5, '0')

      // 영화 제목 — RSS 제목에서 <제목> 패턴
      const movieTitleMatch = rssTitle.match(/<([^>]{2,60})>/)
      const movieTitle = movieTitleMatch ? movieTitleMatch[1].trim() : ''

      // 참석: 이름 역할, 이름 역할 (GV — 감독/배우 참석)
      const guestsRawMatch = bodyText.match(/참석\s*:\s*([^·*\n]{5,150})/)
      const guests = guestsRawMatch
        ? guestsRawMatch[1].split(/[,，]/).map((g) => g.trim()).filter(Boolean)
        : []

      // 진행: 이름 역할 (talk — 평론가/프로듀서 진행)
      const moderatorMatch = bodyText.match(/진행\s*:\s*([^·*\n]{3,60})/)
      if (moderatorMatch && guests.length === 0) {
        guests.push(moderatorMatch[1].trim())
      }

      // 참석 필드 있으면 gv, 진행만 있으면 talk
      const eventType: EventType = guestsRawMatch ? 'gv' : 'talk'
      const label = eventType === 'gv' ? 'GV' : '씨네토크'

      // Naver 예매 링크 (포스트 본문에 포함된 경우)
      const bookingMatch = bodyText.match(/booking\.naver\.com\/[^\s"<>]+/)
      const bookingUrl = bookingMatch ? `https://${bookingMatch[0]}` : undefined

      candidates.push(
        buildEventCandidate({
          context,
          eventType,
          title: `${label}: <${movieTitle || rssTitle}> ${month}/${day} ${eventTime}`,
          movieTitle: movieTitle || undefined,
          eventDate,
          eventTime,
          guests,
          sourceUrl: viewUrl,
          bookingUrl,
          rawText: rssTitle + ' | ' + bodyText.slice(bodyText.indexOf('일시'), bodyText.indexOf('일시') + 200),
          confidence: 0.91,
        }),
      )
    } catch {
      // 개별 포스트 실패 → skip
    }
  }

  return dedupEventCandidates(candidates)
}

// ── 라이카시네마 우주토크 (laikacinema.com/program?category=1M84541271) ───────
// imweb board, GV 카테고리 필터 URL
// 포스트 JSON-LD description에 "일시 - MM/DD(요일) HH:MM", "참석 - 이름 역할" 패턴

export async function crawlLaikaCinemaEvents(
  context: EventParseContext,
): Promise<CrawledEventCandidate[]> {
  const listUrl = context.source.listingUrl // .../program?category=1M84541271
  const html = await fetchEventHtml(listUrl)
  const tail = html.slice(Math.floor(html.length * 0.55))

  // idx 목록 추출
  const idxList = [...new Set(Array.from(tail.matchAll(/idx=(\d+)/g), (m) => m[1]))]
  if (idxList.length === 0) throw new Error('라이카 GV 포스트 idx를 찾지 못했습니다.')

  const today = new Date().toISOString().slice(0, 10)
  const candidates: CrawledEventCandidate[] = []

  const baseUrl = new URL(listUrl)
  const boardBase = `${baseUrl.origin}/program`

  for (const idx of idxList.slice(0, 30)) {
    try {
      const postUrl = `${boardBase}/?q=YToxOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjt9&bmode=view&idx=${idx}&t=board`
      const postHtml = await fetchEventHtml(postUrl)

      // og:title — "<영화> 우주 토크 ..."
      const ogTitle = postHtml.match(/og:title[^>]*content="([^"]+)"/)
      const rawTitle = ogTitle
        ? ogTitle[1].replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        : ''
      const movieTitleMatch = rawTitle.match(/<([^>]{2,60})>/)
      const movieTitle = movieTitleMatch ? movieTitleMatch[1].trim() : ''
      if (!movieTitle) continue

      // JSON-LD description — "일시 - MM/DD(요일) HH:MM\n참석 - 이름 역할"
      const jld = postHtml.match(/"description"\s*:\s*"([^"]{20,1000})"/)
      if (!jld) continue
      const desc = jld[1]
        .replace(/\\u003c/g, '<').replace(/\\u003e/g, '>')
        .replace(/\\u0026lt;/g, '<').replace(/\\u0026gt;/g, '>')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ').replace(/\\n/g, '\n')

      // 일시 - MM/DD(요일) HH:MM
      const dtMatch = desc.match(
        /일시\s*[-–]\s*(\d{1,2})\/(\d{1,2})\([월화수목금토일]\)\s*(\d{1,2}:\d{2})/,
      )
      if (!dtMatch) continue

      const eventDate = parseKoreanSlashDate(`${dtMatch[1]}/${dtMatch[2]}`)
      if (!eventDate || eventDate < today) continue
      const eventTime = dtMatch[3].padStart(5, '0')

      // 참석 - 이름 역할, 이름 역할
      const guestsMatch = desc.match(/참석\s*[-–]\s*([^\n*]{5,200})/)
      const guests = guestsMatch
        ? guestsMatch[1].split(/[,，]/).map((g) => g.trim()).filter(Boolean)
        : []

      candidates.push(
        buildEventCandidate({
          context,
          eventType: 'gv',
          title: `우주토크: <${movieTitle}> ${dtMatch[1]}/${dtMatch[2]} ${eventTime}`,
          movieTitle,
          eventDate,
          eventTime,
          guests,
          description: desc.slice(0, 300),
          sourceUrl: postUrl,
          bookingUrl: postUrl,
          rawText: desc.slice(0, 200),
          confidence: 0.93,
        }),
      )
    } catch {
      // 개별 포스트 실패 → skip
    }
  }

  return dedupEventCandidates(candidates)
}

// ── 메인 디스패처 ─────────────────────────────────────────────────────────

export async function crawlEventCandidates(
  context: EventParseContext,
): Promise<CrawledEventCandidate[]> {
  switch (context.source.parser) {
    case 'deosupEvents':
      return crawlDeosupEvents(context)
    case 'kofaCinemathequeEvents':
      return crawlKofaEvents(context)
    case 'emuBoard':
      return crawlEmuEvents(context)
    case 'cinecubeEvents':
      return crawlCinecubeEvents(context)
    case 'indispaceEvents':
      return crawlIndispaceEvents(context)
    case 'laikaCinemaEvents':
      return crawlLaikaCinemaEvents(context)
    default:
      throw new Error(`알 수 없는 이벤트 파서: ${context.source.parser}`)
  }
}

// ── 유틸 ──────────────────────────────────────────────────────────────────

function dedupEventCandidates(
  candidates: CrawledEventCandidate[],
): CrawledEventCandidate[] {
  const seen = new Set<string>()
  return candidates.filter((c) => {
    if (seen.has(c.fingerprint)) return false
    seen.add(c.fingerprint)
    return true
  })
}
