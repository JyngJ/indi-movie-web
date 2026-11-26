import type { CrawledShowtimeCandidate } from '@/types/admin'
import type { ParseContext } from './utils'
import { buildCandidate, crawlerHeaders, decodeHtmlEntity, dedupeCandidates } from './utils'

/* 광주 동구영상미디어센터(donggumc.kr) — 그누보드 게시판(bo_table=6_1)에 상영 한 건이 글 하나로 올라온다.
 * 목록 화면에 글마다 상영일·상영시간·상영장소·러닝타임이 3칸 표(라벨 · 공백 · 값)로 찍힌다.
 *
 *   <td height="30" colspan="3" class="size_1"><a href="...bo_table=6_1&amp;wr_id=290">파이어하트</a></td>
 *   <td width="60" height="30">상&nbsp;&nbsp;영&nbsp;&nbsp;일 :</td><td width="10">&nbsp;</td><td width="450">2026년 11월 27일 금요일</td>
 *   <td height="30">상영시간 :</td><td>&nbsp;</td><td>저녁 7시</td>
 *
 * 2026-11-26: 이 수집처가 범용 파서(tableText)로 돌아 5월 31일 이후 매일 "완료 · 0건"이었다.
 * 5월에 잡힌 19회는 수동 스크립트(scripts/crawl-gwangju.ts)의 정규식이 가져온 것이었고, 매일 도는 크롤은
 * 한 번도 이 표를 읽지 못했다. 사이트는 그대로였다(브라우저 확인: 11월 27일 파이어하트까지 올라와 있음).
 */

export interface DonggumcScreening {
  postId: string
  movieTitle: string
  showDate: string
  showTime: string
  /** 시각에 오전·오후 표기가 없어 추정했으면 true */
  timeGuessed: boolean
  screenName: string
  runtimeMinutes?: number
}

const LABELS = {
  date: '상영일',
  time: '상영시간',
  place: '상영장소',
  runtime: '러닝타임',
} as const

function cellText(value: string) {
  return decodeHtmlEntity(value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ')).replace(/\s+/g, ' ').trim()
}

/** "2026년 11월 27일 금요일" → "2026-11-27" */
export function parseDonggumcDate(value: string): string | null {
  const m = value.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
  if (!m) return null
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

/** "저녁 7시" → 19:00 · "오후 3시 30분" → 15:30 · "14:00" → 14:00 */
export function parseDonggumcTime(value: string): { time: string; guessed: boolean } | null {
  const colon = value.match(/(\d{1,2}):(\d{2})/)
  const korean = value.match(/(오전|오후|저녁|밤|낮|새벽)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*반)?/)
  const period = value.match(/오전|오후|저녁|밤|낮|새벽/)?.[0] ?? ''
  let hour: number
  let minute: number
  if (colon) {
    hour = Number(colon[1])
    minute = Number(colon[2])
  } else if (korean) {
    hour = Number(korean[2])
    minute = korean[3] ? Number(korean[3]) : /시\s*반/.test(value) ? 30 : 0
  } else {
    return null
  }
  if (hour > 24 || minute > 59) return null

  let guessed = false
  if (period === '오후' || period === '저녁' || period === '밤') {
    if (hour < 12) hour += 12
  } else if (period === '낮') {
    if (hour < 7) hour += 12
  } else if (period === '오전' || period === '새벽') {
    if (hour === 12) hour = 0
  } else if (!colon && hour >= 1 && hour <= 7) {
    // "7시"만 적힌 경우 — 이 센터 상영은 오후·저녁이라 오후로 본다. 검수에서 보이도록 표시한다.
    hour += 12
    guessed = true
  }
  return { time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, guessed }
}

/** 게시판 목록 한 페이지에서 상영을 뽑는다. 날짜·시각을 못 읽은 글은 버린다 */
export function parseDonggumcBoard(html: string): DonggumcScreening[] {
  const anchor = /<a\b[^>]*href=["'][^"']*bo_table=6_1(?:&amp;|&)wr_id=(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi
  const posts = [...html.matchAll(anchor)]
  const screenings: DonggumcScreening[] = []
  const seen = new Set<string>()

  posts.forEach((post, index) => {
    const postId = post[1]
    const movieTitle = cellText(post[2])
    if (!movieTitle || seen.has(postId)) return
    const start = (post.index ?? 0) + post[0].length
    const end = posts.slice(index + 1).find((p) => p[1] !== postId)?.index ?? html.length
    const block = html.slice(start, end)

    // 라벨 칸 → (공백 칸) → 값 칸. 라벨 안의 &nbsp;·공백(“상&nbsp;&nbsp;영&nbsp;&nbsp;일 :”)은 지우고 비교한다.
    // 항목 사이에 1px 구분선 행(<td bgcolor="#CCCCCC">)이 끼어 있어 칸을 세 개씩 끊어 읽지 않고, 라벨 칸을 찾아 그 뒤를 본다.
    const cells = [...block.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => cellText(m[1]))
    const labels: readonly string[] = Object.values(LABELS)
    const fields = new Map<string, string>()
    cells.forEach((cell, i) => {
      const label = cell.replace(/[\s:：]/g, '')
      if (!labels.includes(label) || fields.has(label)) return
      const value = [cells[i + 1], cells[i + 2]].find((v) => v && v.length > 0)
      if (value) fields.set(label, value)
    })

    const showDate = parseDonggumcDate(fields.get(LABELS.date) ?? '')
    const time = parseDonggumcTime(fields.get(LABELS.time) ?? '')
    if (!showDate || !time) return
    seen.add(postId)
    const runtime = Number((fields.get(LABELS.runtime) ?? '').match(/(\d{2,3})\s*분/)?.[1])
    screenings.push({
      postId,
      movieTitle,
      showDate,
      showTime: time.time,
      timeGuessed: time.guessed,
      screenName: fields.get(LABELS.place) || '아트홀',
      runtimeMinutes: Number.isFinite(runtime) && runtime > 0 ? runtime : undefined,
    })
  })
  return screenings
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  if (total >= 24 * 60) return undefined
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** 응답 바이트를 페이지가 밝힌 문자셋으로 읽는다(그누보드 옛 사이트는 euc-kr일 수 있다) */
export function decodeHtmlBytes(bytes: ArrayBuffer, contentType: string | null) {
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 2048))
  const charset = (contentType?.match(/charset=([\w-]+)/i)?.[1] ?? head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ?? 'utf-8').toLowerCase()
  try {
    return new TextDecoder(charset === 'ks_c_5601-1987' ? 'euc-kr' : charset).decode(bytes)
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

export function donggumcHttpError(status: number) {
  // 클라우드 세션(해외 IP)에서는 403 Forbidden이 난다. 운영(RPi)은 200을 받는다(2026-11 "완료 · 0건" 기록).
  return status === 403
    ? `동구영상미디어센터 접근 거부(HTTP 403) — IP 또는 UA 차단일 수 있어요. RPi에서 scripts/diagnose-stale-sources.ts로 실제 응답을 확인해 주세요`
    : `동구영상미디어센터 게시판 요청 실패: HTTP ${status}`
}

function kstToday(now = new Date()) {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10)
}

export async function crawlDonggumcBoard(context: ParseContext): Promise<CrawledShowtimeCandidate[]> {
  const listingUrl = context.sourceUrl ?? context.source.listingUrl
  const res = await fetch(listingUrl, {
    headers: crawlerHeaders({ accept: 'text/html,*/*' }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(donggumcHttpError(res.status))
  const html = decodeHtmlBytes(await res.arrayBuffer(), res.headers.get('content-type'))
  return donggumcCandidates(parseDonggumcBoard(html), context, listingUrl, kstToday())
}

/** 지난 상영은 뺀다(목록에 몇 달 치가 같이 있다) */
export function donggumcCandidates(
  screenings: readonly DonggumcScreening[],
  context: ParseContext,
  listingUrl: string,
  today: string,
): CrawledShowtimeCandidate[] {
  const base = new URL(listingUrl)
  return dedupeCandidates(screenings.filter((s) => s.showDate >= today).map((s) => {
    const postUrl = new URL(base)
    postUrl.searchParams.set('wr_id', s.postId)
    const warnings = s.timeGuessed ? ['상영 시각에 오전·오후 표기가 없어 오후로 읽었어요'] : []
    return buildCandidate({
      context,
      movieTitle: s.movieTitle,
      showDate: s.showDate,
      showTime: s.showTime,
      endTime: s.runtimeMinutes ? addMinutes(s.showTime, s.runtimeMinutes) : undefined,
      screenName: s.screenName,
      formatText: s.movieTitle,
      seatAvailable: 0,
      seatTotal: 0,
      price: 0,
      bookingUrl: postUrl.toString(),
      rawText: JSON.stringify(s),
      confidence: s.timeGuessed ? 0.82 : 0.92,
      warnings,
    })
  }))
}
