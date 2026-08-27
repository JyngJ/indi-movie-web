import { describe, expect, it } from 'vitest'
import { truncateSnippet } from './truncateSnippet'

describe('truncateSnippet', () => {
  it('null·빈 문자열은 null', () => {
    expect(truncateSnippet(null, 80)).toBeNull()
    expect(truncateSnippet(undefined, 80)).toBeNull()
    expect(truncateSnippet('   ', 80)).toBeNull()
  })

  it('maxLength 이하는 그대로 (공백만 정규화)', () => {
    expect(truncateSnippet('짧은  시놉시스\n두 줄', 80)).toBe('짧은 시놉시스 두 줄')
  })

  it('문장 경계가 후반부에 있으면 그 문장까지, 말줄임 없음', () => {
    const text = '첫 문장은 여기서 끝난다. 두 번째 문장은 길게 이어져서 잘려 나가야 한다'
    const result = truncateSnippet(text, 30)
    expect(result).toBe('첫 문장은 여기서 끝난다.')
  })

  it('문장 경계가 없으면 어절 경계에서 자르고 말줄임', () => {
    const text = '키보이스의 바닷가의 추억을 비롯해 조용필의 킬리만자로의 표범 등 국민 애창곡을 만들어 낸 전설의 작곡가'
    const result = truncateSnippet(text, 40)
    expect(result!.endsWith('…')).toBe(true)
    expect(result!.length).toBeLessThanOrEqual(40)
    // 단어 중간 절단 금지 — 말줄임을 뗀 지점이 원문의 어절 경계여야 한다
    const stripped = result!.slice(0, -1)
    expect(text.startsWith(stripped)).toBe(true)
    expect(text[stripped.length]).toBe(' ')
  })

  it('공백이 전혀 없으면 하드 컷 + 말줄임', () => {
    const result = truncateSnippet('가'.repeat(100), 20)
    expect(result).toBe(`${'가'.repeat(19)}…`)
    expect(result!.length).toBe(20)
  })
})
