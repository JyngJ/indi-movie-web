import { describe, expect, it } from 'vitest'
import { isMultiplexVenue, multiplexNotice } from './venue'

describe('isMultiplexVenue', () => {
  it('CGV 지점을 잡는다', () => {
    expect(isMultiplexVenue('CGV 센텀시티')).toBe(true)
  })
  it('띄어쓰기가 없어도 잡는다', () => {
    expect(isMultiplexVenue('CGV센텀시티')).toBe(true)
  })
  it('롯데시네마를 잡는다', () => {
    expect(isMultiplexVenue('롯데시네마 센텀시티')).toBe(true)
  })
  it('메가박스를 잡는다', () => {
    expect(isMultiplexVenue('메가박스 부산극장')).toBe(true)
  })
  it('독립·예술영화관은 아니다', () => {
    expect(isMultiplexVenue('영화의전당')).toBe(false)
    expect(isMultiplexVenue('부산시청자미디어센터')).toBe(false)
    expect(isMultiplexVenue('모퉁이극장')).toBe(false)
  })
  it('소문자 표기도 잡는다', () => {
    expect(isMultiplexVenue('cgv 아트하우스')).toBe(true)
  })
})

describe('multiplexNotice', () => {
  it('극장 이름을 넣어 안내를 만든다', () => {
    expect(multiplexNotice('CGV 센텀시티')).toBe('CGV 센텀시티 회차는 모으지 않아요 — 해당 극장 상영 시간표에서 확인해 주세요')
  })
})
