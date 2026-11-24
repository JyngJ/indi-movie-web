import { describe, expect, it } from 'vitest'
import { theaterSharePath } from './theaterSharePath'

describe('theaterSharePath', () => {
  it('회차가 없으면 극장 상세 — 극장 이름이 미리보기에 뜨는 경로', () => {
    expect(theaterSharePath('t1')).toBe('/films/theater/t1')
    expect(theaterSharePath('t1', null)).toBe('/films/theater/t1')
  })

  it('회차를 고르면 회차 공유 경로 — 영화·시각이 미리보기에 뜬다', () => {
    expect(theaterSharePath('t1', 's9')).toBe('/films/theater/t1/s/s9')
  })

  it('지도(/map) 링크를 만들지 않는다 — /map 미리보기는 고정값이라 극장이 안 보인다', () => {
    expect(theaterSharePath('t1', 's9')).not.toContain('/map')
  })
})
