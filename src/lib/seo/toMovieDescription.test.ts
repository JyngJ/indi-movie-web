import { describe, expect, it } from 'vitest'
import { toMovieDescription, type MovieDescriptionInput } from './toMovieDescription'

/** 네이버가 잡은 실제 케이스 — 시놉시스가 없고 상영도 없는 영화들 */
const 선셋대로: MovieDescriptionInput = {
  title: '선셋대로',
  year: 1950,
  director: ['빌리 와일더'],
  nation: '미국',
  genre: ['느와르', '드라마', '멜로·로맨스'],
  theaterNames: [],
}
const 비커밍: MovieDescriptionInput = {
  title: '비커밍',
  year: 2020,
  director: ['오마 나임'],
  nation: '미국',
  genre: ['스릴러', '드라마'],
  theaterNames: [],
}

describe('toMovieDescription', () => {
  it('시놉시스가 없어도 편마다 다른 문장을 만든다', () => {
    // 예전 구현은 제목만 바뀐 같은 템플릿이라 네이버가 중복으로 잡았다
    expect(toMovieDescription(선셋대로)).not.toBe(toMovieDescription(비커밍))
  })

  it('감독·연도·국가·장르를 식별 문구에 싣는다', () => {
    const result = toMovieDescription(선셋대로)
    expect(result).toContain('선셋대로')
    expect(result).toContain('빌리 와일더 감독')
    expect(result).toContain('1950년')
    expect(result).toContain('미국')
    expect(result).toContain('느와르')
  })

  it('상영 중이면 극장 이름을 실어 또 한 번 구분한다', () => {
    const a = toMovieDescription({ ...선셋대로, theaterNames: ['광주극장'] })
    const b = toMovieDescription({ ...선셋대로, theaterNames: ['애관극장'] })
    expect(a).toContain('광주극장')
    expect(b).toContain('애관극장')
    expect(a).not.toBe(b)
  })

  it('극장이 많으면 앞 3곳만 적고 나머지는 "등"으로 줄인다', () => {
    const result = toMovieDescription({
      ...선셋대로,
      theaterNames: ['광주극장', '애관극장', '오오극장', '에무시네마', '인디스페이스'],
    })
    expect(result).toContain('5곳에서 상영 중')
    expect(result).toContain('등')
    expect(result).not.toContain('인디스페이스')
  })

  it('상영이 없으면 갱신 안내로 끝난다', () => {
    expect(toMovieDescription(선셋대로)).toContain('매일 갱신')
  })

  it('극장을 넘기지 않으면 상영 여부를 단정하지 않는다', () => {
    // /films/movie/[id]는 시간표를 조회하지 않는다 — 빈 배열로 넘기면
    // 상영 중인 영화에 "상영 일정이 없다"고 거짓말을 하게 된다
    const { theaterNames: _생략, ...조회안함 } = 선셋대로
    const result = toMovieDescription(조회안함)
    expect(result).not.toContain('상영 일정은 없습니다')
    expect(result).not.toContain('상영 중')
    expect(result).toContain('빌리 와일더 감독')
  })

  it('극장 미제공이어도 편마다 다른 문장을 만든다', () => {
    const { theaterNames: _a, ...선셋 } = 선셋대로
    const { theaterNames: _b, ...비커 } = 비커밍
    expect(toMovieDescription(선셋)).not.toBe(toMovieDescription(비커))
  })

  it('러닝타임이 있으면 붙이고 없으면 뺀다', () => {
    expect(toMovieDescription({ ...선셋대로, runtimeMinutes: 110 })).toContain('110분')
    expect(toMovieDescription(선셋대로)).not.toContain('분.')
  })

  it('합작은 국가를 앞 2개까지만 적는다', () => {
    const result = toMovieDescription({
      ...선셋대로,
      nation: '사우디아라비아,이라크,이집트,영국',
    })
    expect(result).toContain('사우디아라비아·이라크')
    expect(result).not.toContain('이집트')
  })

  it('메타 필드가 통째로 비어도 제목만으로 문장이 성립한다', () => {
    const result = toMovieDescription({ title: '무제', theaterNames: [] })
    expect(result.startsWith('무제 — 영화.')).toBe(true)
  })

  it('길이 상한을 넘지 않는다', () => {
    const result = toMovieDescription({
      ...선셋대로,
      synopsis: '가'.repeat(500),
      theaterNames: ['광주극장', '애관극장', '오오극장', '에무시네마'],
    })
    expect(result.length).toBeLessThanOrEqual(155)
  })

  it('시놉시스를 붙일 자리가 모자라면 통째로 생략한다', () => {
    // 꼬리에 "…" 한 조각만 남는 지저분한 절단을 막는다
    const 긴제목 = '가'.repeat(70)
    const result = toMovieDescription({
      ...선셋대로,
      title: 긴제목,
      synopsis: '나'.repeat(300),
      theaterNames: ['광주극장', '애관극장', '오오극장', '에무시네마'],
    })
    expect(result).not.toContain('나')
  })
})
