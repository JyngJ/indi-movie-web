import { describe, expect, it } from 'vitest'
import type { AdminExternalMovie } from '@/types/admin'
import { pickRereleaseExternalMovie } from './store'
import { stripTitleFormatSuffix } from './crawler/utils'

const kmdb = (title: string, year: number, movieSeq: string): AdminExternalMovie => ({
  provider: 'kmdb', externalId: `F${movieSeq}`, movieId: 'F', movieSeq, title, year, genre: [], director: [],
})

describe('pickRereleaseExternalMovie — 재상영 연도 구제', () => {
  it('같은 제목이 한 편뿐이고 기대 연도보다 오래됐으면 재상영으로 본다', () => {
    const movies = [kmdb('사탄탱고', 1994, '28215'), kmdb('파멸', 1988, '30385')]
    expect(pickRereleaseExternalMovie('사탄탱고', movies, 2026)?.movieSeq).toBe('28215')
  })
  it('띄어쓰기만 다른 제목도 같은 제목으로 친다', () => {
    const movies = [kmdb('셀린느와 줄리 배타러 가다', 1974, '27682')]
    expect(pickRereleaseExternalMovie('셀린느와 줄리 배 타러 가다', movies, 2026)?.movieSeq).toBe('27682')
  })
  it('같은 제목이 여러 편이면 가리지 않는다', () => {
    const movies = [kmdb('파멸', 1961, '00660'), kmdb('파멸', 1970, '30221'), kmdb('파멸', 1988, '30385')]
    expect(pickRereleaseExternalMovie('파멸', movies, 2026)).toBeUndefined()
  })
  it('기대 연도가 없거나 KMDB 쪽이 더 최신이면 구제하지 않는다', () => {
    const movies = [kmdb('사탄탱고', 1994, '28215')]
    expect(pickRereleaseExternalMovie('사탄탱고', movies, undefined)).toBeUndefined()
    expect(pickRereleaseExternalMovie('사탄탱고', movies, 1990)).toBeUndefined()
  })
  it('제목이 정확히 같지 않으면 구제하지 않는다', () => {
    const movies = [kmdb('사탄탱고 리마스터', 1994, '28215')]
    expect(pickRereleaseExternalMovie('사탄탱고', movies, 2026)).toBeUndefined()
  })
})

describe('stripTitleFormatSuffix', () => {
  it('제목의 일부인 괄호는 남긴다', () => {
    expect(stripTitleFormatSuffix('암살자(들)')).toBe('암살자(들)')
  })
  it('상영 형식 꼬리표만 뗀다', () => {
    expect(stripTitleFormatSuffix('토이 스토리 5(더빙)')).toBe('토이 스토리 5')
    expect(stripTitleFormatSuffix('듄(2D)')).toBe('듄')
  })
})
