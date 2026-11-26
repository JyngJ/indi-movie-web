// ================================
// 0건 수집처 진단 (순수 함수)
// ================================

/**
 * 2026-11-26 가람영화관·동구영상미디어센터: 매일 "완료 · 0건"으로 끝나는데 원인을 볼 재료가 없었다.
 * 오류가 아니라서 crawl_runs.error가 비어 있고, 클라우드 세션에서는 두 사이트 모두 해외 IP로
 * 응답을 못 받는다(dtryx 연결 끊김 · donggumc.kr 403). 라즈베리파이(국내 IP)에서
 * scripts/diagnose-stale-sources.ts로 실제 응답을 떠서 이 함수들로 판정한다.
 */

export interface DtryxMainList {
  CinemaList?: Array<{ CinemaCd: string; CinemaNm: string; HiddenYn?: string }>
  MovieList?: Array<{ MovieCd: string; MovieNm: string; HiddenYn?: string }>
  PlaySdtList?: Array<{ PlaySDT: string; HiddenYn?: string }>
}

export type DtryxCinemaVerdict =
  | 'listed'          // 예매 목록에 공개 상태로 있다 — 회차가 비면 정말 회차가 없는 것
  | 'hidden'          // 목록에 있지만 HiddenYn=Y — 지금 열린 회차가 없다(휴관·예매 중단)
  | 'renamed'         // 코드는 없고 같은 이름은 있다 — CinemaCd가 바뀌었다
  | 'missing'         // 코드도 이름도 없다 — 예매처를 옮겼거나 이 주소(origin)에서 안 판다

export interface DtryxCinemaDiagnosis {
  verdict: DtryxCinemaVerdict
  cinemaCount: number
  visibleMovieCount: number
  visiblePlayDates: string[]
  /** 코드가 가리키는 극장(또는 이름이 같은 극장) */
  entry: { CinemaCd: string; CinemaNm: string; HiddenYn?: string } | null
  /** 지역명·별칭으로 찾은 후보 — 사람이 보고 고른다 */
  nameHints: Array<{ CinemaCd: string; CinemaNm: string; HiddenYn?: string }>
}

const norm = (s: string) => s.replace(/[^a-z0-9가-힣]/gi, '').toLowerCase()

export function diagnoseDtryxCinema(
  main: DtryxMainList,
  cinemaCd: string | null,
  names: readonly string[],
): DtryxCinemaDiagnosis {
  const cinemas = main.CinemaList ?? []
  const wanted = names.map(norm).filter(Boolean)
  const byCode = cinemaCd ? cinemas.find((c) => c.CinemaCd === cinemaCd) ?? null : null
  const byName = cinemas.find((c) => wanted.includes(norm(c.CinemaNm))) ?? null
  const nameHints = cinemas.filter((c) => wanted.some((w) => norm(c.CinemaNm).includes(w) || w.includes(norm(c.CinemaNm))))

  let verdict: DtryxCinemaVerdict
  let entry = byCode
  if (byCode) verdict = byCode.HiddenYn === 'Y' ? 'hidden' : 'listed'
  else if (byName) { verdict = 'renamed'; entry = byName }
  else verdict = 'missing'

  return {
    verdict,
    cinemaCount: cinemas.length,
    visibleMovieCount: (main.MovieList ?? []).filter((m) => m.HiddenYn !== 'Y').length,
    visiblePlayDates: (main.PlaySdtList ?? []).filter((d) => d.HiddenYn !== 'Y').map((d) => d.PlaySDT),
    entry,
    nameHints,
  }
}

export interface HtmlListingSummary {
  title: string | null
  bytes: number
  /** 19:30 같은 시각 */
  timeTokens: number
  /** 11.26 · 11/26 · 11월 26일 · 2026-11-26 같은 날짜 */
  dateTokens: number
  images: number
  /** 그누보드 게시판 글 링크(wr_id) — 시간표를 글로 올리는 곳인지 본다 */
  boardPosts: Array<{ href: string; title: string }>
  /** 접근 거부·점검·이전 안내 문구 */
  notices: string[]
}

const NOTICE_WORDS = ['Forbidden', '접근이 거부', '권한이 없', '점검', '이전', '폐관', '휴관', '리모델링', '운영 중단', '도메인']

export function summarizeHtmlListing(html: string): HtmlListingSummary {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  const visible = text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || null
  const boardPosts: HtmlListingSummary['boardPosts'] = []
  for (const m of text.matchAll(/<a[^>]+href=["']([^"']*wr_id=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (!label) continue
    const href = m[1].replace(/&amp;/g, '&')
    if (boardPosts.some((p) => p.href === href)) continue
    boardPosts.push({ href, title: label })
    if (boardPosts.length >= 10) break
  }
  return {
    title,
    bytes: new TextEncoder().encode(html).length,
    timeTokens: (visible.match(/(?<!\d)(?:[01]?\d|2[0-3]):[0-5]\d(?!\d)/g) ?? []).length,
    dateTokens: (visible.match(/(?:20\d{2}[-./]\d{1,2}[-./]\d{1,2})|(?:(?<!\d)\d{1,2}\s*월\s*\d{1,2}\s*일)|(?:(?<![\d.])\d{1,2}[./]\d{1,2}(?![\d.]))/g) ?? []).length,
    images: (html.match(/<img\b/gi) ?? []).length,
    boardPosts,
    notices: NOTICE_WORDS.filter((w) => visible.includes(w)),
  }
}
