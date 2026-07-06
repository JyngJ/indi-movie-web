import { describe, expect, it } from 'vitest'
import { candidateMovieTitleCandidates, extractTitleYear } from './store'

describe('extractTitleYear', () => {
  it('제목 끝 괄호 연도를 파싱한다', () => {
    expect(extractTitleYear('데미트리우스 (1954)')).toBe(1954)
    expect(extractTitleYear('금지된 장난 (1952)')).toBe(1952)
  })
  it('연도가 없거나 범위 밖이면 undefined', () => {
    expect(extractTitleYear('사무라이 타임슬리퍼')).toBeUndefined()
    expect(extractTitleYear('가상 (0999)')).toBeUndefined()
    expect(extractTitleYear('(1954) 데미트리우스')).toBeUndefined()
  })
})

describe('candidateMovieTitleCandidates — 선행 괄호 토큰', () => {
  it('(더빙)/(자막)/(리플레이) 선행 토큰을 제거한 변형을 만든다', () => {
    expect(candidateMovieTitleCandidates('(더빙)토이 스토리 5')).toContain('토이 스토리 5')
    expect(candidateMovieTitleCandidates('(자막)토이 스토리 5')).toContain('토이 스토리 5')
    expect(candidateMovieTitleCandidates('(리플레이)싱 스트리트')).toContain('싱 스트리트')
  })
  it('선행 토큰이 없으면 변형이 추가되지 않는다', () => {
    const variants = candidateMovieTitleCandidates('토이 스토리 5')
    expect(variants).toContain('토이 스토리 5')
  })
  it('연도 괄호 제거 변형은 유지된다', () => {
    expect(candidateMovieTitleCandidates('데미트리우스 (1954)')).toContain('데미트리우스')
  })
})
