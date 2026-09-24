import { describe, expect, it } from 'vitest'

import type { Festival } from '@/types/festival'

import { buildSuggestions } from './FilmsSearchBar'

const biff: Festival = {
  id: 'biff31',
  name: '제31회 부산국제영화제',
  slug: 'biff31',
  startDate: '2026-10-06',
  endDate: '2026-10-15',
  region: '부산',
  city: '부산',
  venueText: null,
  bannerUrl: null,
  posterUrl: null,
  shortcutImageUrl: '/images/festivals/biff31-shortcut.png',
  linkUrl: null,
  description: null,
  isActive: true,
}

describe('buildSuggestions', () => {
  it('띄어 쓴 부산 국제 영화제 검색어로 BIFF 상세를 찾는다', () => {
    expect(buildSuggestions('부산 국제 영화제', [], [], [biff])).toContainEqual({
      type: 'festival',
      label: '제31회 부산국제영화제',
      navigateTo: '/festival/biff31',
    })
  })
})
