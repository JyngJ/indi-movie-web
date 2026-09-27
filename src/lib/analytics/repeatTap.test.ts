import { describe, expect, it } from 'vitest'
import { RepeatTapTracker, STREAK_MS, tapTargetKey } from './repeatTap'

const URL_A = 'https://x/films'
const URL_B = 'https://x/festival/biff31'

describe('RepeatTapTracker', () => {
  it('같은 요소를 창 안에 여러 번 누르면 묶음이 끝날 때 한 건으로 센다', () => {
    const t = new RepeatTapTracker()
    expect(t.tap('바로가기', URL_A, '/films', 0)).toBeNull()
    expect(t.tap('바로가기', URL_A, '/films', 800)).toBeNull()
    expect(t.tap('바로가기', URL_A, '/films', 1500)).toBeNull()
    expect(t.flush(1500 + STREAK_MS - 1)).toBeNull()
    expect(t.flush(1500 + STREAK_MS)).toEqual({ target: '바로가기', count: 3, path: '/films' })
  })

  it('한 번만 누르면 아무것도 올리지 않는다', () => {
    const t = new RepeatTapTracker()
    t.tap('바로가기', URL_A, '/films', 0)
    expect(t.flush(STREAK_MS)).toBeNull()
  })

  it('주소가 바뀐 뒤 누른 건 새 묶음이다 — 반응이 있었으니 연타가 아니다', () => {
    const t = new RepeatTapTracker()
    t.tap('다음', URL_A, '/films', 0)
    expect(t.tap('다음', URL_B, '/festival/biff31', 500)).toBeNull()
    expect(t.flush(500 + STREAK_MS)).toBeNull()
  })

  it('창을 넘긴 두 번째 탭은 새 묶음이다', () => {
    const t = new RepeatTapTracker()
    t.tap('버튼', URL_A, '/films', 0)
    t.tap('버튼', URL_A, '/films', STREAK_MS + 1)
    expect(t.flush(STREAK_MS * 3)).toBeNull()
  })

  it('다른 요소를 누르면 이전 연타 묶음을 바로 닫아 돌려준다', () => {
    const t = new RepeatTapTracker()
    t.tap('A', URL_A, '/films', 0)
    t.tap('A', URL_A, '/films', 300)
    expect(t.tap('B', URL_A, '/films', 600)).toEqual({ target: 'A', count: 2, path: '/films' })
  })
})

describe('tapTargetKey', () => {
  it('data-rc → aria-label → 글자 → 태그 순으로 고른다', () => {
    expect(tapTargetKey({ rc: 'booking-cta', ariaLabel: '예매', text: '예매하러 가기', tag: 'A' })).toBe('booking-cta')
    expect(tapTargetKey({ rc: null, ariaLabel: '제31회 부산국제영화제 상영 시간표 보기', text: '', tag: 'BUTTON' })).toBe('제31회 부산국제영화제 상영 시간표 보기')
    expect(tapTargetKey({ rc: null, ariaLabel: null, text: '  공식   사이트 ', tag: 'A' })).toBe('공식 사이트')
    expect(tapTargetKey({ rc: null, ariaLabel: null, text: null, tag: 'BUTTON' })).toBe('button')
  })
})
