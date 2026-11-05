import { describe, expect, it } from 'vitest'
import { dtryxHiddenCinemaError } from './crawler'

const list = [
  { CinemaCd: '000069', CinemaNm: '에무시네마', HiddenYn: 'Y' },
  { CinemaCd: '000065', CinemaNm: '더숲아트시네마', HiddenYn: 'N' },
]

describe('dtryxHiddenCinemaError', () => {
  it('주소의 극장 코드가 숨김이면 오류 문구를 낸다', () => {
    expect(dtryxHiddenCinemaError(list, '에무시네마', '000069')).toContain('숨김')
  })
  it('공개 극장은 통과한다', () => {
    expect(dtryxHiddenCinemaError(list, '더숲아트시네마', '000065')).toBeUndefined()
  })
  it('목록에 없는 코드는 판단하지 않는다(기존 대체 경로 유지)', () => {
    expect(dtryxHiddenCinemaError(list, '판타스틱 큐브', '000056')).toBeUndefined()
  })
})
