import { describe, expect, it } from 'vitest'
import { orderDtryxScanDates, scanDtryxDates } from './dtryxScan'

const sequential = async <R,>(tasks: Array<() => Promise<R>>) => {
  const out: R[] = []
  for (const task of tasks) out.push(await task())
  return out
}

// 2026-11-24(화) 05시 수집과 같은 모양: 7일 창 = 화~다음 주 월, 화·월 휴관, 다음 주 월은 편성 전
const WEEK = ['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30']
const MOVIES = ['A', 'B', 'C', 'D']
const OPEN: Record<string, string[]> = {
  '2026-11-25': ['A', 'B'],
  '2026-11-26': ['A', 'B'],
  '2026-11-27': ['A', 'C'],
  '2026-11-28': ['A', 'C'],
  '2026-11-29': ['B'],
}

function makeProbe(open: Record<string, string[]>) {
  const calls: string[] = []
  const probe = async (movie: string, date: string) => {
    calls.push(`${date}:${movie}`)
    return (open[date] ?? []).includes(movie) ? [`${date} ${movie}`] : []
  }
  return { probe, calls }
}

describe('orderDtryxScanDates', () => {
  it('첫날·마지막 날을 먼저, 나머지는 날짜순으로', () => {
    expect(orderDtryxScanDates(['d1', 'd2', 'd3', 'd4'])).toEqual(['d1', 'd4', 'd2', 'd3'])
    expect(orderDtryxScanDates(['d1', 'd2'])).toEqual(['d1', 'd2'])
  })
})

describe('scanDtryxDates', () => {
  it('첫날·마지막 날이 모두 휴관이어도 그 주 회차를 0건으로 단정하지 않는다', async () => {
    const { probe } = makeProbe(OPEN)
    const { candidates } = await scanDtryxDates(WEEK, MOVIES, (m) => m, probe, sequential)
    // 예전: 화·월 두 날만 스캔 → 0건. 이제 수요일부터 다 잡힌다
    expect(candidates).toEqual(expect.arrayContaining(['2026-11-25 A', '2026-11-26 B', '2026-11-28 A', '2026-11-29 B']))
    // 한계(예전과 같음): 상영작 집합은 전 영화 스캔한 날에서만 넓어져, 금요일에 처음 붙은 C는 놓친다
    expect(candidates).not.toContain('2026-11-27 C')
    expect(candidates).toHaveLength(7)
  })

  it('상영작을 찾기 전 날짜만 전 영화로 스캔하고, 그 뒤는 상영작만 묻는다', async () => {
    const { probe, calls } = makeProbe(OPEN)
    const { fullScanCount } = await scanDtryxDates(WEEK, MOVIES, (m) => m, probe, sequential)
    // 화(휴관)·월(편성 전)·수(첫 상영) 세 날만 전 영화 스캔
    expect(fullScanCount).toBe(3)
    expect(calls.filter((c) => c.startsWith('2026-11-26:'))).toEqual(['2026-11-26:A', '2026-11-26:B'])
  })

  it('첫날에 상영작이 잡히면 전 영화 스캔은 첫날·마지막 날 두 번뿐(예전 요청 수 유지)', async () => {
    const { probe } = makeProbe({ ...OPEN, '2026-11-24': ['A'] })
    const { fullScanCount } = await scanDtryxDates(WEEK, MOVIES, (m) => m, probe, sequential)
    expect(fullScanCount).toBe(2)
  })

  it('정말 한 주 내내 회차가 없으면 모든 날짜를 물은 뒤에야 0건', async () => {
    const { probe, calls } = makeProbe({})
    const { candidates, fullScanCount } = await scanDtryxDates(WEEK, MOVIES, (m) => m, probe, sequential)
    expect(candidates).toHaveLength(0)
    expect(fullScanCount).toBe(WEEK.length)
    expect(calls).toHaveLength(WEEK.length * MOVIES.length)
  })
})
