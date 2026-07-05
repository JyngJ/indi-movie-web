import { describe, expect, it } from 'vitest'
import {
  buildYearsOnScreenCaptions,
  getYearsOnScreenCaption,
  YEARS_ON_SCREEN_MIN_AGE,
} from './yearsOnScreenCaption'

const CURRENT_YEAR = 2026

describe('getYearsOnScreenCaption', () => {
  it('formats old films as production-year copy — never "N년 만에 재개봉"', () => {
    expect(getYearsOnScreenCaption(1998, CURRENT_YEAR)).toBe('1998년작, 다시 스크린으로')
    expect(getYearsOnScreenCaption(1960, CURRENT_YEAR)).toBe('1960년작, 다시 스크린으로')
  })

  it('includes films exactly at the minimum age boundary', () => {
    const boundaryYear = CURRENT_YEAR - YEARS_ON_SCREEN_MIN_AGE
    expect(getYearsOnScreenCaption(boundaryYear, CURRENT_YEAR)).toBe(
      `${boundaryYear}년작, 다시 스크린으로`,
    )
  })

  it('returns null for recent films below the minimum age — small numbers are noise', () => {
    expect(getYearsOnScreenCaption(CURRENT_YEAR - YEARS_ON_SCREEN_MIN_AGE + 1, CURRENT_YEAR)).toBeNull()
    expect(getYearsOnScreenCaption(CURRENT_YEAR - 1, CURRENT_YEAR)).toBeNull()
    expect(getYearsOnScreenCaption(CURRENT_YEAR, CURRENT_YEAR)).toBeNull()
  })

  it('returns null for missing or invalid years', () => {
    expect(getYearsOnScreenCaption(null, CURRENT_YEAR)).toBeNull()
    expect(getYearsOnScreenCaption(undefined, CURRENT_YEAR)).toBeNull()
    expect(getYearsOnScreenCaption(0, CURRENT_YEAR)).toBeNull()
    expect(getYearsOnScreenCaption(-1998, CURRENT_YEAR)).toBeNull()
    expect(getYearsOnScreenCaption(NaN, CURRENT_YEAR)).toBeNull()
    expect(getYearsOnScreenCaption(1998.5, CURRENT_YEAR)).toBeNull()
  })

  it('returns null for future years — data error, not a hook', () => {
    expect(getYearsOnScreenCaption(CURRENT_YEAR + 1, CURRENT_YEAR)).toBeNull()
    expect(getYearsOnScreenCaption(9999, CURRENT_YEAR)).toBeNull()
  })
})

describe('buildYearsOnScreenCaptions', () => {
  it('maps only films that qualify — no entry for recent or invalid years', () => {
    const captions = buildYearsOnScreenCaptions(
      [
        { id: 'old', year: 1998 },
        { id: 'recent', year: CURRENT_YEAR - 3 },
        { id: 'missing', year: 0 },
        { id: 'future', year: CURRENT_YEAR + 2 },
      ],
      CURRENT_YEAR,
    )

    expect(captions.get('old')).toBe('1998년작, 다시 스크린으로')
    expect(captions.has('recent')).toBe(false)
    expect(captions.has('missing')).toBe(false)
    expect(captions.has('future')).toBe(false)
    expect(captions.size).toBe(1)
  })

  it('returns an empty map for an empty list', () => {
    expect(buildYearsOnScreenCaptions([], CURRENT_YEAR).size).toBe(0)
  })
})
