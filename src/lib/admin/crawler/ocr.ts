import type { CrawledShowtimeCandidate } from '@/types/admin'
import { CrawlNotice, SOURCE_SITE_ERROR_PREFIX, detectSourceSiteError } from '@/lib/crawl/crawlNotice'
import type { ParseContext } from './utils'
import { buildCandidate, dedupeCandidates } from './utils'
import { buildBoardSubjectSearchUrl, extractBoardImageUrls, findLatestBoardPostUrl, isBoardPostUrl } from './board'

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

interface OcrImage {
  base64: string
  mediaType: ImageMediaType
  /** 원본 이미지 주소 — 스크린샷이면 undefined */
  url?: string
}

interface OcrShowtime {
  movieTitle: string
  showDate: string
  showTime: string
  screenName?: string
  endTime?: string
}

// gpt-4o는 같은 시간표를 매번 다른 제목으로 읽었다(2026-10 실측). gpt-4.1은 JSON 안에 주석을 섞었다
const OCR_MODEL = process.env.OCR_MODEL || 'gpt-5.5'

// 이 크기보다 작은 이미지는 아이콘·배너로 보고 건너뛴다
const MIN_TIMETABLE_IMAGE_WIDTH = 600

function toMediaType(contentType: string | null | undefined): ImageMediaType {
  const type = (contentType ?? '').split(';')[0].trim()
  return (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(type) ? type : 'image/jpeg') as ImageMediaType
}

export function buildOcrPrompt(theaterName: string, year: number, pageText?: string) {
  return [
    `이 이미지는 한국 영화관 "${theaterName}"의 상영시간표입니다.`,
    '모든 상영 정보를 빠짐없이 추출해서 JSON으로만 반환하세요.',
    `- 날짜: YYYY-MM-DD (연도 없으면 ${year} 사용). 표에서 날짜 칸이 여러 줄에 걸쳐 합쳐져 있으면 아래 줄에도 같은 날짜를 적용`,
    '- 시간: HH:MM (24시간제, "2:00 pm" → "14:00", "13시16분" → "13:16")',
    '- movieTitle에는 영화 제목 칸의 글자만 이미지에 적힌 그대로 적는다. 감독 이름·기획전 이름·프로그램 이름 칸은 제목이 아니다',
    '- 읽기 어려운 글자를 비슷한 단어로 추측해 바꾸지 말 것. 확신이 없는 제목은 corrections에 적는다',
    '- 대관/휴관 제외',
    // 고양영상미디어센터는 표에 시각 칸이 없고 "<액터 편>(화14시)"처럼 본문에만 요일별 시각을 적는다
    ...(pageText ? [
      '- 이미지에 상영 시각이 없으면 아래 페이지 본문에 적힌 요일·프로그램별 시각을 적용한다',
      '',
      '[페이지 본문]',
      pageText,
    ] : []),
    '',
    `{"theaterName":"${theaterName}","showtimes":[{"movieTitle":"영화 제목","showDate":"${year}-06-01","showTime":"14:00","screenName":"1관","endTime":null}],"corrections":[],"confidence":0.9}`,
  ].join('\n')
}

async function ocrScheduleImages(images: OcrImage[], theaterName: string, pageText?: string) {
  const OpenAI = (await import('openai')).default
  const openai = new OpenAI()
  const year = new Date().getFullYear()
  const response = await openai.chat.completions.create({
    model: OCR_MODEL,
    max_completion_tokens: 8192,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: [
        // detail: 'high' — 기본값(auto)은 큰 이미지를 줄여 읽어 한글 제목이 비슷한 단어로 바뀌어 나왔다
        ...images.map((image) => ({
          type: 'image_url' as const,
          image_url: { url: `data:${image.mediaType};base64,${image.base64}`, detail: 'high' as const },
        })),
        { type: 'text' as const, text: buildOcrPrompt(theaterName, year, pageText) },
      ],
    }],
  })

  const text = response.choices[0].message.content?.trim() ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('OCR JSON 파싱 실패')

  return JSON.parse(match[0]) as {
    showtimes: OcrShowtime[]
    confidence: number
    corrections: string[]
  }
}

function candidatesFromSchedule(
  context: ParseContext,
  schedule: Awaited<ReturnType<typeof ocrScheduleImages>>,
  bookingUrl: string,
  rawPrefix?: string,
) {
  const today = new Date().toISOString().slice(0, 10)
  return dedupeCandidates(
    schedule.showtimes
      .filter(st => st.showDate >= today && st.movieTitle?.trim() && /^\d{1,2}:\d{2}(?::\d{2})?$/.test(st.showTime))
      .map(st => buildCandidate({
        context,
        movieTitle: st.movieTitle.trim(),
        showDate: st.showDate,
        showTime: st.showTime,
        endTime: st.endTime ?? undefined,
        screenName: st.screenName ?? '1관',
        formatText: '',
        seatAvailable: 0,
        seatTotal: 0,
        price: 0,
        bookingUrl,
        rawText: rawPrefix ? `${rawPrefix}|${JSON.stringify(st)}` : JSON.stringify(st),
        confidence: schedule.confidence ?? 0.88,
        warnings: schedule.corrections?.length ? schedule.corrections : [],
      }))
  )
}

/* ── screenshotOcr (Playwright + GPT) — gymc 등 JS 렌더링 사이트 ──
 * 본문에 시간표 이미지가 있으면 원본 파일을 받아 읽는다. 페이지 전체 스크린샷은
 * 1212px 시간표가 축소돼 찍혀 제목이 매번 다르게 깨졌다(고양영상미디어센터, 2026-10).
 * 큰 이미지가 없을 때만 스크린샷으로 돌아간다. */
export async function crawlScreenshotOcr(context: ParseContext): Promise<CrawledShowtimeCandidate[]> {
  const url = context.sourceUrl ?? context.source.listingUrl
  const theaterName = context.source.theaterName

  const { chromium } = await import(/* webpackIgnore: true */ 'playwright-chromium' as any)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 900 })

  const images: OcrImage[] = []
  let pageText = ''
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const imageUrls: string[] = await page.evaluate((minWidth: number) =>
      Array.from(document.images)
        .filter((img) => img.naturalWidth >= minWidth)
        .map((img) => img.currentSrc || img.src),
    MIN_TIMETABLE_IMAGE_WIDTH)

    for (const imageUrl of Array.from(new Set(imageUrls))) {
      // page.request는 페이지 세션 쿠키를 그대로 쓴다 (getImage.do처럼 세션을 타는 첨부 경로)
      const res = await page.request.get(imageUrl, { timeout: 15000 })
      if (!res.ok()) continue
      const body = await res.body()
      images.push({ base64: body.toString('base64'), mediaType: toMediaType(res.headers()['content-type']), url: imageUrl })
    }

    if (images.length > 0) {
      pageText = (await page.evaluate(() => document.body.innerText) as string)
        .replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim().slice(0, 3000)
    } else {
      const buf = await page.screenshot({ fullPage: true, type: 'png' })
      images.push({ base64: buf.toString('base64'), mediaType: 'image/png' })
    }
  } finally {
    await browser.close()
  }

  const schedule = await ocrScheduleImages(images, theaterName, pageText || undefined)
  const imageUrls = images.map((image) => image.url).filter(Boolean).join(',')
  return candidatesFromSchedule(context, schedule, url, imageUrls || undefined)
}

/* ── boardImageOcr: 게시판 이미지 다운로드 → GPT OCR ── */
export async function crawlBoardImageOcr(context: ParseContext): Promise<CrawledShowtimeCandidate[]> {
  const url = context.sourceUrl ?? context.source.listingUrl
  const theaterName = context.source.theaterName

  const fetchHtml = async (target: string) => {
    const res = await fetch(target, {
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(12000),
    })
    const body = await res.text()
    // 출처 사이트 자체 장애(5xx, 200에 실린 "Connect Error: Too many connections")는 파서 문제가 아니다.
    // 2026-11-24 sunamswc.or.kr이 이 상태였는데 "글을 찾을 수 없습니다"로 기록돼 파서가 깨진 것처럼 보였다.
    const siteError = detectSourceSiteError(res.status, body)
    if (siteError) {
      throw new CrawlNotice('source-site-error', `${SOURCE_SITE_ERROR_PREFIX}${new URL(target).hostname} 응답: ${siteError} — 다음 수집에 다시 시도해요`)
    }
    if (!res.ok) throw new Error(`게시판 fetch 실패: ${res.status}`)
    return body
  }

  // 1) 소스 주소가 게시판 목록이면 제목에 극장 이름이 든 최신 글을 고른다
  let postUrl = url
  if (!isBoardPostUrl(url)) {
    const listHtml = await fetchHtml(url)
    let found = findLatestBoardPostUrl(listHtml, url, theaterName)
    // 1쪽에 없으면 제목 검색 한 번 — 새 공지에 밀려 2쪽으로 넘어간 경우(2026-11 선암)
    const searchUrl = found ? undefined : buildBoardSubjectSearchUrl(url, theaterName)
    if (searchUrl) found = findLatestBoardPostUrl(await fetchHtml(searchUrl), url, theaterName)
    if (!found) {
      // 글 링크가 하나도 없으면 목록 자체를 못 받은 것이다 — 제목 검색 실패와 구분해 남긴다
      const postLinkCount = listHtml.match(/wr_id=\d+/g)?.length ?? 0
      throw new Error(postLinkCount === 0
        ? `게시판 목록에 글 링크가 하나도 없어요(응답 ${listHtml.length}바이트) — 게시판 주소나 마크업이 바뀌었을 수 있어요`
        : `게시판에서 "${theaterName}" 글을 찾을 수 없습니다`)
    }
    postUrl = found
  }
  const html = await fetchHtml(postUrl)

  // 2) 이미지 URL 추출 — 썸네일보다 원본 우선
  const imgUrls = extractBoardImageUrls(html, postUrl)
  if (!imgUrls.length) throw new Error('게시글에서 이미지를 찾을 수 없습니다')

  // 3) 첫 번째 콘텐츠 이미지 다운로드
  const imgUrl = imgUrls[0]
  const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(10000) })
  if (!imgRes.ok) throw new Error(`이미지 다운로드 실패: ${imgRes.status}`)
  const buf = await imgRes.arrayBuffer()
  const image: OcrImage = {
    base64: Buffer.from(buf).toString('base64'),
    mediaType: toMediaType(imgRes.headers.get('content-type')),
    url: imgUrl,
  }

  // 4) GPT OCR
  const schedule = await ocrScheduleImages([image], theaterName)
  return candidatesFromSchedule(context, schedule, postUrl, imgUrl)
}
