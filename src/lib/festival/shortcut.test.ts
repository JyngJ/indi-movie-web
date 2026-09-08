import { describe, expect, it } from 'vitest'
import { festivalShortcutDateLabel, selectShortcutFestivals } from './shortcut'
import type { Festival } from '@/types/festival'

function makeFestival(over: Partial<Festival> = {}): Festival {
  return {
    id: 'f', name: '어떤 영화제', slug: 'some', startDate: '2026-10-06', endDate: '2026-10-15',
    region: '부산', city: '부산', venueText: null, bannerUrl: null, linkUrl: null,
    description: null, isActive: true,
    ...over,
  }
}

describe('selectShortcutFestivals', () => {
  const biff = makeFestival({ slug: 'biff31', startDate: '2026-10-06', endDate: '2026-10-15' })

  it('진행 중이면 띄운다', () => {
    expect(selectShortcutFestivals([biff], '2026-10-08')).toHaveLength(1)
  })
  it('개막 30일 전이면 띄운다', () => {
    expect(selectShortcutFestivals([biff], '2026-09-06')).toHaveLength(1)
  })
  it('개막 31일 전이면 아직 안 띄운다', () => {
    expect(selectShortcutFestivals([biff], '2026-09-05')).toHaveLength(0)
  })
  it('폐막 다음 날이면 사라진다', () => {
    expect(selectShortcutFestivals([biff], '2026-10-16')).toHaveLength(0)
  })
  it('폐막일 당일까지는 남는다', () => {
    expect(selectShortcutFestivals([biff], '2026-10-15')).toHaveLength(1)
  })
  it('여러 개면 개막이 가까운 순', () => {
    const later = makeFestival({ slug: 'later', startDate: '2026-10-20', endDate: '2026-10-25' })
    const sooner = makeFestival({ slug: 'sooner', startDate: '2026-10-10', endDate: '2026-10-12' })
    expect(selectShortcutFestivals([later, sooner], '2026-10-05').map((f) => f.slug))
      .toEqual(['sooner', 'later'])
  })
  it('leadDays를 좁히면 그만큼만 띄운다', () => {
    expect(selectShortcutFestivals([biff], '2026-09-20', 7)).toHaveLength(0)
    expect(selectShortcutFestivals([biff], '2026-10-01', 7)).toHaveLength(1)
  })
})

describe('festivalShortcutDateLabel', () => {
  const biff = makeFestival({ startDate: '2026-10-06', endDate: '2026-10-15' })
  it('개막 전엔 D-n', () => {
    expect(festivalShortcutDateLabel(biff, '2026-10-01')).toBe('D-5')
  })
  it('회기 중엔 언제까지인지', () => {
    expect(festivalShortcutDateLabel(biff, '2026-10-08')).toBe('10월 15일까지')
  })
})
