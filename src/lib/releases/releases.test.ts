import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/indieground-releases.json'
import { decideReleaseMatch } from './matchRelease'
import { mergeRelease, needsMatching } from './mergeRelease'
import { IndiegroundResponseError, parseIndiegroundReleases } from './parseIndiegroundReleases'
import type { ReleaseRepository } from './repository'
import { planReleaseDateUpdates, syncReleases } from './syncReleases'
import type { ExternalMovieRef, LocalMovieRef, UpcomingRelease, UpcomingReleaseInput } from './types'

const input = (over: Partial<UpcomingReleaseInput> = {}): UpcomingReleaseInput => ({
  source: 'indieground', sourceMovieId: '6293', title: '내일의 민재', productionYear: 2025, releaseDate: '2026-12-02', ...over,
})

describe('parseIndiegroundReleases', () => {
  it('실제 응답에서 제목·개봉일·제작연도·id만 읽는다', () => {
    const rows = parseIndiegroundReleases(fixture)
    expect(rows).toHaveLength(4)
    expect(rows[0]).toEqual(input())
    // 포스터 경로는 옮기지 않는다 — 이용허락 근거 없음
    expect(JSON.stringify(rows)).not.toContain('fileFolder')
  })

  it('list가 없으면 오류', () => {
    expect(() => parseIndiegroundReleases({})).toThrow(IndiegroundResponseError)
    expect(() => parseIndiegroundReleases(null)).toThrow(IndiegroundResponseError)
  })

  it('날짜가 이상하거나 id가 없는 행은 건너뛰고, 같은 id는 한 번만', () => {
    const rows = parseIndiegroundReleases({ list: [
      { korSubject: 'A', releaseDateString: '2026-13-45', movieSeq: 1 },
      { korSubject: 'B', releaseDateString: '2026-12-01' },
      { korSubject: ' C ', releaseDateString: '2026-12-01', movieSeq: 3, productionYear: 'x' },
      { korSubject: 'C 다시', releaseDateString: '2026-12-08', movieSeq: 3 },
    ] })
    expect(rows).toEqual([{ source: 'indieground', sourceMovieId: '3', title: 'C', productionYear: undefined, releaseDate: '2026-12-01' }])
  })
})

describe('mergeRelease', () => {
  const now = '2026-11-17T00:00:00.000Z'
  const later = '2026-11-18T00:00:00.000Z'

  it('처음 보면 pending', () => {
    const row = mergeRelease(undefined, input(), now)
    expect(row).toMatchObject({ matchStatus: 'pending', movieId: null, firstSeenAt: now, releaseDateHistory: [] })
    expect(needsMatching(row)).toBe(true)
  })

  it('개봉일이 바뀌면 이전 값을 쌓고 매칭은 유지', () => {
    const prev: UpcomingRelease = { ...mergeRelease(undefined, input(), now), movieId: 'm1', matchStatus: 'matched' }
    const next = mergeRelease(prev, input({ releaseDate: '2026-12-09' }), later)
    expect(next.releaseDateHistory).toEqual([{ date: '2026-12-02', seenAt: now }])
    expect(next).toMatchObject({ movieId: 'm1', matchStatus: 'matched', lastSeenAt: later, firstSeenAt: now })
    expect(needsMatching(next)).toBe(false)
  })

  it('제목이 바뀌면 다시 매칭, rejected는 유지', () => {
    const matched: UpcomingRelease = { ...mergeRelease(undefined, input(), now), movieId: 'm1', matchStatus: 'matched' }
    expect(mergeRelease(matched, input({ title: '내일의 민재 (가제)' }), later)).toMatchObject({ movieId: null, matchStatus: 'pending' })
    const rejected: UpcomingRelease = { ...matched, movieId: null, matchStatus: 'rejected', matchNote: '광고물' }
    expect(mergeRelease(rejected, input({ title: '다른 제목' }), later)).toMatchObject({ matchStatus: 'rejected', matchNote: '광고물' })
  })
})

describe('decideReleaseMatch', () => {
  const local = (over: Partial<LocalMovieRef>): LocalMovieRef => ({ id: 'm1', title: '내일의 민재', year: 2025, ...over })
  const ext = (over: Partial<ExternalMovieRef>): ExternalMovieRef => ({ key: 'K1', title: '내일의 민재', year: 2025, ...over })

  it('로컬에 제목·연도가 맞는 영화가 하나면 matched', () => {
    expect(decideReleaseMatch(input(), [local({}), local({ id: 'x', title: '내일' })], undefined)).toEqual({ kind: 'matched', movieId: 'm1' })
  })

  it('공백·문장부호 차이는 같은 제목', () => {
    expect(decideReleaseMatch(input({ title: '포킴스: 네 남자의 이야기' }), [local({ title: '포킴스 네 남자의 이야기' })], undefined).kind).toBe('matched')
  })

  it('(장편) 꼬리표는 떼고도 비교한다', () => {
    expect(decideReleaseMatch(input({ title: '베리 베리 스트레인지 러브 (장편)', productionYear: 2025 }), [local({ title: '베리 베리 스트레인지 러브', year: 2026 })], undefined).kind).toBe('matched')
  })

  it('연도 ±1까지 허용, 그 밖은 동명 영화로 보고 검토', () => {
    expect(decideReleaseMatch(input(), [local({ year: 2026 })], undefined).kind).toBe('matched')
    expect(decideReleaseMatch(input(), [local({ year: 2012 })], undefined)).toMatchObject({ kind: 'needs_review' })
  })

  it('연도까지 같은 동명 2편이면 검토', () => {
    expect(decideReleaseMatch(input(), [local({}), local({ id: 'm2' })], undefined)).toMatchObject({ kind: 'needs_review' })
  })

  it('동명이 여럿이어도 연도로 가려지면 matched', () => {
    expect(decideReleaseMatch(input(), [local({ id: 'old', year: 1999 }), local({ id: 'new' })], undefined)).toEqual({ kind: 'matched', movieId: 'new' })
  })

  it('연도를 모르면 후보가 하나일 때만 받는다', () => {
    expect(decideReleaseMatch(input({ productionYear: undefined }), [local({})], undefined).kind).toBe('matched')
    expect(decideReleaseMatch(input({ productionYear: undefined }), [local({}), local({ id: 'm2', year: 2010 })], undefined).kind).toBe('needs_review')
  })

  it('로컬에 없으면 KMDb, 거기도 없으면 pending', () => {
    expect(decideReleaseMatch(input(), [], undefined).kind).toBe('pending')
    expect(decideReleaseMatch(input(), [], [ext({})])).toEqual({ kind: 'import', external: ext({}) })
    expect(decideReleaseMatch(input(), [], [ext({ title: '다른 영화' })]).kind).toBe('pending')
    expect(decideReleaseMatch(input(), [], [ext({}), ext({ key: 'K2' })]).kind).toBe('needs_review')
  })
})

describe('planReleaseDateUpdates', () => {
  const row = (over: Partial<UpcomingRelease>): UpcomingRelease => ({
    ...mergeRelease(undefined, input(), 'now'), movieId: 'm1', matchStatus: 'matched', ...over,
  })

  it('값이 같으면 쓰지 않고, 한 영화에 둘이면 이른 날짜', () => {
    expect(planReleaseDateUpdates([row({})], [{ id: 'm1', releaseDate: '2026-12-02' }])).toEqual([])
    expect(planReleaseDateUpdates(
      [row({ releaseDate: '2026-12-09', sourceMovieId: 'a' }), row({ releaseDate: '2026-12-02', sourceMovieId: 'b' }), row({ movieId: null, matchStatus: 'pending' })],
      [{ id: 'm1', releaseDate: null }],
    )).toEqual([{ movieId: 'm1', releaseDate: '2026-12-02' }])
  })
})

describe('syncReleases', () => {
  function fakeRepo(existing: UpcomingRelease[] = [], movies: LocalMovieRef[] = []) {
    const saved: UpcomingRelease[][] = []
    const dates: Array<Array<{ movieId: string; releaseDate: string }>> = []
    const repo: ReleaseRepository = {
      listReleases: async () => existing,
      saveReleases: async (rows) => { saved.push(rows) },
      listLocalMovies: async () => movies,
      setMovieReleaseDates: async (u) => { dates.push(u) },
    }
    return { repo, saved, dates }
  }
  const now = () => new Date('2026-11-17T00:00:00+09:00')

  it('로컬 매칭 · KMDb 가져오기 · 미등재를 나눠 저장하고 개봉일을 반영한다', async () => {
    const { repo, saved, dates } = fakeRepo([], [{ id: 'm-left', title: '왼손 피아니스트', year: 2026, releaseDate: null }])
    const searched: string[] = []
    const summary = await syncReleases({
      source: 'indieground',
      repo,
      now,
      fetchReleases: async () => [
        input({ sourceMovieId: '1', title: '왼손 피아니스트', productionYear: 2026, releaseDate: '2026-11-30' }),
        input({ sourceMovieId: '2', title: '레이오버 호텔', releaseDate: '2026-11-25' }),
        input({ sourceMovieId: '3', title: '더 버스', releaseDate: '2026-11-01' }),
      ],
      searchExternal: async (title) => { searched.push(title); return title === '레이오버 호텔' ? [{ key: 'K9', title, year: 2025 }] : [] },
      importExternal: async () => 'm-new',
    })

    expect(searched).toEqual(['레이오버 호텔', '더 버스'])
    expect(summary).toMatchObject({ fetched: 3, created: 3, matched: 2, imported: ['레이오버 호텔 ← K9 (2025)'], pending: ['더 버스'], stalePending: ['더 버스'], releaseDateUpdates: 2 })
    expect(saved[0].map((r) => [r.title, r.matchStatus, r.movieId])).toEqual([
      ['왼손 피아니스트', 'matched', 'm-left'], ['레이오버 호텔', 'matched', 'm-new'], ['더 버스', 'pending', null],
    ])
    expect(dates[0]).toEqual([{ movieId: 'm-left', releaseDate: '2026-11-30' }, { movieId: 'm-new', releaseDate: '2026-11-25' }])
  })

  it('dryRun이면 아무것도 쓰지 않고 가져오지도 않는다', async () => {
    const { repo, saved, dates } = fakeRepo()
    let imported = 0
    const summary = await syncReleases({
      source: 'indieground', repo, now, dryRun: true,
      fetchReleases: async () => [input()],
      searchExternal: async (title) => [{ key: 'K1', title, year: 2025 }],
      importExternal: async () => { imported++; return 'x' },
    })
    expect(summary.imported).toEqual(['내일의 민재 ← K1 (2025)'])
    expect(summary.pending).toEqual([])
    expect(imported).toBe(0)
    expect(saved).toEqual([])
    expect(dates).toEqual([])
  })

  it('이미 matched인 행은 다시 찾지 않고, 개봉일 변경을 요약에 남긴다', async () => {
    const prev: UpcomingRelease = { ...mergeRelease(undefined, input(), 'x'), movieId: 'm1', matchStatus: 'matched' }
    const { repo } = fakeRepo([prev], [{ id: 'm1', title: '내일의 민재', year: 2025, releaseDate: '2026-12-02' }])
    const summary = await syncReleases({
      source: 'indieground', repo, now,
      fetchReleases: async () => [input({ releaseDate: '2026-12-09' })],
      searchExternal: async () => { throw new Error('호출되면 안 됨') },
      importExternal: async () => 'x',
    })
    expect(summary.dateChanged).toEqual([{ title: '내일의 민재', from: '2026-12-02', to: '2026-12-09' }])
    expect(summary.releaseDateUpdates).toBe(1)
  })
})
