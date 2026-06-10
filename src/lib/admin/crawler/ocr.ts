import type { CrawledShowtimeCandidate } from '@/types/admin'
import type { ParseContext } from './utils'
import { buildCandidate, dedupeCandidates } from './utils'

/* ── screenshotOcr (Playwright + GPT-4o) — gymc 등 JS 렌더링 사이트 ── */
export async function crawlScreenshotOcr(context: ParseContext): Promise<CrawledShowtimeCandidate[]> {
  const url = context.sourceUrl ?? context.source.listingUrl
  const theaterName = context.source.theaterName

  const { chromium } = await import(/* webpackIgnore: true */ 'playwright-chromium' as any)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 900 })

  let screenshotBase64: string
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    const buf = await page.screenshot({ fullPage: true, type: 'png' })
    screenshotBase64 = buf.toString('base64')
  } finally {
    await browser.close()
  }

  // GPT-4o OCR
  const OpenAI = (await import('openai')).default
  const openai = new OpenAI()
  const year = new Date().getFullYear()
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/png;base64,${screenshotBase64}` } },
        { type: 'text', text: `이 이미지는 한국 영화관 "${theaterName}"의 상영시간표입니다.\n모든 상영 정보를 빠짐없이 추출해서 JSON으로만 반환하세요.\n- 날짜: YYYY-MM-DD (연도 없으면 ${year} 사용)\n- 시간: HH:MM (24시간제, "2:00 pm" → "14:00")\n- 대관/휴관 제외\n\n{"theaterName":"${theaterName}","showtimes":[{"movieTitle":"영화 제목","showDate":"${year}-06-01","showTime":"14:00","screenName":"1관","endTime":null}],"corrections":[],"confidence":0.9}` },
      ],
    }],
  })

  const text = response.choices[0].message.content?.trim() ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('OCR JSON 파싱 실패')

  const schedule = JSON.parse(match[0]) as {
    showtimes: Array<{ movieTitle: string; showDate: string; showTime: string; screenName?: string; endTime?: string }>
    confidence: number
    corrections: string[]
  }

  const today = new Date().toISOString().slice(0, 10)
  return dedupeCandidates(
    schedule.showtimes
      .filter(st => st.showDate >= today && st.movieTitle?.trim())
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
        bookingUrl: url,
        rawText: JSON.stringify(st),
        confidence: schedule.confidence ?? 0.88,
        warnings: schedule.corrections?.length ? schedule.corrections : [],
      }))
  )
}

/* ── boardImageOcr: 게시판 이미지 다운로드 → GPT-4o OCR ── */
export async function crawlBoardImageOcr(context: ParseContext): Promise<CrawledShowtimeCandidate[]> {
  const url = context.sourceUrl ?? context.source.listingUrl
  const theaterName = context.source.theaterName

  // 1) 게시글 HTML 가져오기
  const pageRes = await fetch(url, {
    headers: { 'user-agent': 'indi-movie-web-admin-crawler/0.1' },
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
  const base64 = Buffer.from(buf).toString('base64')
  const rawType = imgRes.headers.get('content-type') ?? 'image/jpeg'
  const mediaType = (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(rawType)
    ? rawType : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

  // 4) GPT-4o OCR
  const OpenAI = (await import('openai')).default
  const openai = new OpenAI()
  const year = new Date().getFullYear()
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
        { type: 'text', text: `이 이미지는 한국 영화관 "${theaterName}"의 상영시간표입니다.\n모든 상영 정보를 빠짐없이 추출해서 JSON으로만 반환하세요.\n- 날짜: YYYY-MM-DD (연도 없으면 ${year} 사용)\n- 시간: HH:MM (24시간제)\n- 대관/휴관 제외\n\n{"theaterName":"${theaterName}","showtimes":[{"movieTitle":"영화 제목","showDate":"${year}-06-01","showTime":"14:00","screenName":"1관","endTime":null}],"corrections":[],"confidence":0.9}` },
      ],
    }],
  })

  const text = response.choices[0].message.content?.trim() ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('OCR JSON 파싱 실패')

  const schedule = JSON.parse(match[0]) as {
    showtimes: Array<{ movieTitle: string; showDate: string; showTime: string; screenName?: string; endTime?: string }>
    confidence: number
    corrections: string[]
  }

  const today = new Date().toISOString().slice(0, 10)
  return dedupeCandidates(
    schedule.showtimes
      .filter(st => st.showDate >= today && st.movieTitle?.trim())
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
        bookingUrl: url,
        rawText: `${imgUrl}|${JSON.stringify(st)}`,
        confidence: schedule.confidence ?? 0.88,
        warnings: schedule.corrections?.length ? schedule.corrections : [],
      }))
  )
}
