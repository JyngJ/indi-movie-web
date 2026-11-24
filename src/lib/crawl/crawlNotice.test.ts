import { describe, expect, it } from 'vitest'
import {
  CrawlNotice,
  SOURCE_SITE_ERROR_PREFIX,
  detectSourceSiteError,
  isCrawlNotice,
  isSourceSiteErrorMessage,
} from './crawlNotice'

describe('detectSourceSiteError', () => {
  it('200에 실린 MySQL 연결 초과 한 줄을 출처 사이트 장애로 본다 (2026-11-24 sunamswc.or.kr 실측 본문)', () => {
    expect(detectSourceSiteError(200, 'Connect Error: Too many connections')).toBe('Connect Error: Too many connections')
  })

  it('5xx는 본문과 상관없이 장애다', () => {
    expect(detectSourceSiteError(500, '<html>Internal Server Error</html>')).toBe('HTTP 500')
  })

  it('정상 게시판 페이지는 통과한다 — 긴 본문에 같은 낱말이 섞여도', () => {
    const page = `<html>${'<li><a href="board.php?bo_table=notice&wr_id=1">공지</a></li>'.repeat(60)}Too many connections</html>`
    expect(detectSourceSiteError(200, page)).toBeUndefined()
    expect(detectSourceSiteError(200, '<a href="?wr_id=3">시네마 in 선암 11월 상영</a>')).toBeUndefined()
  })
})

describe('CrawlNotice', () => {
  it('kind를 실어 나르고 판별된다', () => {
    const notice = new CrawlNotice('source-site-error', `${SOURCE_SITE_ERROR_PREFIX}x`)
    expect(isCrawlNotice(notice)).toBe(true)
    expect(isCrawlNotice(new Error('보통 오류'))).toBe(false)
    expect(isSourceSiteErrorMessage(notice.message)).toBe(true)
  })
})
