import { describe, expect, it } from 'vitest'
import { decideSessionRegion, type SessionRegionInput } from './regionSession'

const base: SessionRegionInput = {
  stored: null,
  authResolved: true,
  preferred: null,
  located: null,
  isValidRegion: (id) => ['서울', '부산'].includes(id),
}

describe('decideSessionRegion', () => {
  it('이번 세션에 값이 있으면 건드리지 않는다', () => {
    expect(decideSessionRegion({ ...base, stored: '부산', preferred: '서울', located: '서울' })).toEqual({ kind: 'skip' })
  })

  it('로그인 확인 전엔 위치가 있어도 기다린다 — 위치가 DB 값을 앞지르지 않게', () => {
    expect(decideSessionRegion({ ...base, authResolved: false, located: '서울' })).toEqual({ kind: 'wait' })
  })

  it('DB의 마지막 지역이 접속 위치보다 우선한다', () => {
    expect(decideSessionRegion({ ...base, preferred: '부산', located: '서울' }))
      .toEqual({ kind: 'assign', regionId: '부산', source: 'restore' })
  })

  it('DB 값이 없거나 유효하지 않으면 접속 위치를 쓴다', () => {
    expect(decideSessionRegion({ ...base, located: '서울' }))
      .toEqual({ kind: 'assign', regionId: '서울', source: 'location' })
    expect(decideSessionRegion({ ...base, preferred: '없는지역', located: '서울' }))
      .toEqual({ kind: 'assign', regionId: '서울', source: 'location' })
  })

  it('둘 다 없으면 기다린다', () => {
    expect(decideSessionRegion(base)).toEqual({ kind: 'wait' })
  })
})
