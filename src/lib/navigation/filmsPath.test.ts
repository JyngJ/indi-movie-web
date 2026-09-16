import { describe, expect, it } from 'vitest'
import { isFilmsPath } from './filmsPath'

describe('상영작 탐색 영역', () => {
  it.each(['/', '/films', '/movie/123', '/films/movie/123', '/films/theater/123', '/films/director/감독'])('%s 상세에서도 메뉴 선택을 유지한다', path => {
    expect(isFilmsPath(path)).toBe(true)
  })
  it.each(['/map', '/my', '/feed', '/movies', '/films-other'])('%s는 상영작 메뉴로 선택하지 않는다', path => {
    expect(isFilmsPath(path)).toBe(false)
  })
})
