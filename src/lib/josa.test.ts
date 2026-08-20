import { describe, expect, it } from 'vitest'
import { hasFinalConsonant, withJosa } from './josa'

describe('hasFinalConsonant', () => {
  it('받침 있는 한글', () => {
    expect(hasFinalConsonant('경멸')).toBe(true)
    expect(hasFinalConsonant('오디세이 앤')).toBe(true)
  })
  it('받침 없는 한글', () => {
    expect(hasFinalConsonant('오디세이')).toBe(false)
    expect(hasFinalConsonant('지느러미')).toBe(false)
  })
  it('숫자로 끝나면 읽는 소리 기준', () => {
    expect(hasFinalConsonant('공각기동대 3')).toBe(true)   // 삼
    expect(hasFinalConsonant('토이스토리 4')).toBe(false)  // 사
    expect(hasFinalConsonant('스타워즈 9')).toBe(false)    // 구
  })
  it('따옴표·괄호로 감싼 말은 안쪽 글자로 판정한다', () => {
    expect(hasFinalConsonant('「경멸」')).toBe(true)
    expect(hasFinalConsonant('「오디세이」')).toBe(false)
    expect(hasFinalConsonant('"지느러미"')).toBe(false)
  })
  it('라틴 문자·빈 문자열은 받침 없음으로', () => {
    expect(hasFinalConsonant('Her')).toBe(false)
    expect(hasFinalConsonant('')).toBe(false)
  })
})

describe('withJosa', () => {
  it('은/는', () => {
    expect(withJosa('경멸', '은/는')).toBe('경멸은')
    expect(withJosa('오디세이', '은/는')).toBe('오디세이는')
  })
  it('감싼 말에도 올바른 조사', () => {
    expect(withJosa('「경멸」', '은/는')).toBe('「경멸」은')
    expect(withJosa('「오디세이」', '은/는')).toBe('「오디세이」는')
  })
  it('이/가 · 을/를', () => {
    expect(withJosa('경멸', '이/가')).toBe('경멸이')
    expect(withJosa('지느러미', '을/를')).toBe('지느러미를')
  })
})
