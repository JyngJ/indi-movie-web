import type { CrawledShowtimeCandidate } from '@/types/admin'
import type { ParseContext } from './utils'
import { buildCandidate, dedupeCandidates } from './utils'

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

  // 1) 게시글 HTML 가져오기
  const pageRes = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    signal: AbortSignal.timeout(12000),
  })
  if (!pageRes.ok) throw new Error(`게시글 fetch 실패: ${pageRes.status}`)
  const html = await pageRes.text()

  // 2) 이미지 URL 추출 (업로드된 첨부 이미지)
  const imgMatches = [
    ...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/g),
  ]
  const base = new URL(url)
  const imgUrls = imgMatches
    .map(m => {
      const src = m[1]
      if (!src || src.includes('logo') || src.includes('icon') || src.includes('banner') || src.includes('btn')) return null
      try { return new URL(src, base).toString() } catch { return null }
    })
    .filter((u): u is string => Boolean(u))
    // 콘텐츠 이미지만 (editor/data 경로 우선)
    .sort((a, b) => {
      const score = (u: string) => (u.includes('editor') || u.includes('data') || u.includes('upload') || u.includes('attach')) ? 1 : 0
      return score(b) - score(a)
    })

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
  return candidatesFromSchedule(context, schedule, url, imgUrl)
}
