import { CRAWLER_UA } from '@/lib/admin/crawler/utils'
import { parseIndiegroundDetail, type IndiegroundDetail } from './parseIndiegroundDetail'
import { parseIndiegroundReleases } from './parseIndiegroundReleases'
import type { UpcomingReleaseInput } from './types'

/**
 * 인디그라운드(영화진흥위원회) 독립영화 개봉 소식 목록.
 * 요청 1건으로 전체 목록(최근 반년 치, 2026-11 기준 62편)을 받는다. `setYear`는 서버가 무시한다.
 * 신원을 밝히는 크롤러 UA를 그대로 쓴다(AGENTS.md Crawler Operations).
 */
const ENDPOINT = 'https://indieground.kr/indie/releaseListMore.do'
const TIMEOUT_MS = 10_000
const PAGE_SIZE = 200

export async function fetchIndiegroundReleases(): Promise<UpcomingReleaseInput[]> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'user-agent': CRAWLER_UA,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      accept: 'application/json',
    },
    body: new URLSearchParams({ mode: 'list', start: '0', end: String(PAGE_SIZE), setYear: '' }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`인디그라운드 응답 ${res.status}`)
  const text = await res.text()
  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error(`인디그라운드 응답이 JSON이 아님: ${text.slice(0, 120)}`)
  }
  return parseIndiegroundReleases(payload)
}

const DETAIL_URL = 'https://indieground.kr/indie/movieLibraryView.do'

/** 영화 상세의 감독·개봉일 — 연도로 가릴 수 없는 매칭을 감독으로 가를 때만 부른다 */
export async function fetchIndiegroundDetail(sourceMovieId: string): Promise<IndiegroundDetail> {
  const url = `${DETAIL_URL}?${new URLSearchParams({ seq: sourceMovieId })}`
  const res = await fetch(url, {
    headers: { 'user-agent': CRAWLER_UA, accept: 'text/html' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`인디그라운드 상세 응답 ${res.status} (seq=${sourceMovieId})`)
  return parseIndiegroundDetail(await res.text())
}
