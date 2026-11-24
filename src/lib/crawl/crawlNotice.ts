// ================================
// 수집 결과 분류 (순수 모듈 — 프레임워크·DB 의존 없음)
// ================================

/**
 * "수집이 깨졌다"와 "수집은 됐는데 보여 줄 게 없다", "출처 사이트가 죽어 있다"는 서로 다른 일이다.
 * 2026-11-24 05시 리포트에서 셋이 한 바구니(⚠️ 실패)에 섞였다.
 *
 * - no-open-sessions: 예매처에 극장은 등재돼 있는데 열린 회차가 없다(설성·에무·허리우드클래식).
 *   수집 자체는 정상이므로 완료(0건)로 기록하고 실패 경보를 울리지 않는다. 극장을 내리지 않는다.
 * - source-site-error: 출처 사이트가 DB 연결 초과·5xx 같은 자체 장애 응답을 줬다(시네마 in 선암).
 *   우리 파서 문제가 아니라 다음 실행에 다시 시도하면 된다 — 실패로는 남기되 따로 묶는다.
 */
import type { CrawlNoticeKind } from '@/types/admin'

export type { CrawlNoticeKind }

export class CrawlNotice extends Error {
  readonly kind: CrawlNoticeKind

  constructor(kind: CrawlNoticeKind, message: string) {
    super(message)
    this.name = 'CrawlNotice'
    this.kind = kind
  }
}

export function isCrawlNotice(error: unknown): error is CrawlNotice {
  return error instanceof CrawlNotice
    || (error instanceof Error && error.name === 'CrawlNotice' && 'kind' in error)
}

/** crawl_runs.error에 남기는 접두어 — 리포트가 이걸로 출처 사이트 오류를 따로 묶는다 */
export const SOURCE_SITE_ERROR_PREFIX = '[출처 사이트 오류] '
/** 완료(0건) 실행의 안내 문구 접두어 — crawl_runs에는 안내 전용 칸이 없어 error 칸에 함께 남긴다 */
export const NO_OPEN_SESSIONS_PREFIX = '[열린 회차 없음] '

export function isSourceSiteErrorMessage(message: string | undefined | null) {
  return Boolean(message?.startsWith(SOURCE_SITE_ERROR_PREFIX))
}

export function isNoOpenSessionsMessage(message: string | undefined | null) {
  return Boolean(message?.startsWith(NO_OPEN_SESSIONS_PREFIX))
}

/**
 * 출처 사이트가 200으로 돌려준 장애 페이지를 알아본다.
 * 그누보드·자체 PHP 사이트는 MySQL 연결이 넘치면 HTTP 200에 본문 한 줄
 * "Connect Error: Too many connections"만 준다(2026-11-24 sunamswc.or.kr 실측, 35바이트).
 * 이걸 목록으로 읽으면 "글을 찾을 수 없습니다"가 되어 파서가 깨진 것처럼 보인다.
 */
const SITE_ERROR_BODY_PATTERNS: RegExp[] = [
  /Connect Error\s*:/i,
  /Too many connections/i,
  /mysqli?_connect|SQLSTATE\[/i,
  /Database connection (?:failed|error)/i,
]

/** 이 길이를 넘는 정상 페이지 본문 어딘가에 같은 문구가 섞여도 장애로 보지 않는다 */
const SITE_ERROR_BODY_MAX = 2000

export function detectSourceSiteError(status: number, body: string): string | undefined {
  if (status >= 500) return `HTTP ${status}`
  const trimmed = body.trim()
  if (trimmed.length > SITE_ERROR_BODY_MAX) return undefined
  if (!SITE_ERROR_BODY_PATTERNS.some((pattern) => pattern.test(trimmed))) return undefined
  return trimmed.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
}
