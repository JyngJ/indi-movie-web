import type { UpcomingReleaseInput } from './types'

/**
 * 인디그라운드 `releaseListMore.do` 응답 → 개봉 소식 목록.
 *
 * 응답 행에는 포스터 경로(pathname)·파일명도 있지만 옮기지 않는다 — 이용허락 근거가 없는
 * 배급사 저작물이다(AGENTS.md 광고·이미지 권리). 제목·개봉일·제작연도·id만 읽는다.
 */
export class IndiegroundResponseError extends Error {}

interface RawRow {
  korSubject?: unknown
  releaseDateString?: unknown
  productionYear?: unknown
  movieSeq?: unknown
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function parseIndiegroundReleases(payload: unknown): UpcomingReleaseInput[] {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { list?: unknown }).list)) {
    throw new IndiegroundResponseError('응답에 list 배열이 없음')
  }
  const rows = (payload as { list: RawRow[] }).list
  const seen = new Set<string>()
  const out: UpcomingReleaseInput[] = []

  for (const row of rows) {
    const title = typeof row.korSubject === 'string' ? row.korSubject.trim() : ''
    const releaseDate = typeof row.releaseDateString === 'string' ? row.releaseDateString.trim() : ''
    const sourceMovieId = row.movieSeq != null ? String(row.movieSeq).trim() : ''
    if (!title || !sourceMovieId || !ISO_DATE.test(releaseDate) || Number.isNaN(Date.parse(releaseDate))) continue
    // 같은 영화가 개봉 소식 글 두 개로 올라오는 경우 — 먼저 나온(최신 정렬) 행을 쓴다
    if (seen.has(sourceMovieId)) continue
    seen.add(sourceMovieId)

    const year = Number(row.productionYear)
    out.push({
      source: 'indieground',
      sourceMovieId,
      title,
      productionYear: Number.isInteger(year) && year >= 1888 && year <= 2100 ? year : undefined,
      releaseDate,
    })
  }
  return out
}
