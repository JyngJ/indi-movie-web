/**
 * 「이번 주가 마지막」 오탐률 백테스트 — 기존 로직(전체 후보를 "종영" 단정) vs
 * 리드타임 판정으로 confirmed만 "종영" 단정하는 새 로직 비교.
 * 사용법: npm run backtest:last-week
 *
 * 방법: showtimes.created_at을 "그 시점에 크롤러가 알고 있던 데이터"로 취급해
 * 과거 특정 날짜(asOfDate) 기준으로 판정을 재현하고, 오늘 시점 전체 데이터로
 * "실제로 그 이후에도 상영했는지"(ground truth)를 대조한다.
 *
 * 주의: asOfDate+7일 시점의 데이터를 알아야 ground truth를 확인할 수 있다.
 * show_date 히스토리가 짧으면(크롤러가 과거 날짜를 보존한 지 얼마 안 됐으면)
 * 유효한 asOfDate가 하나도 없을 수 있다 — 이 경우 조용히 스킵하지 않고
 * 왜 측정 불가인지 명시한다.
 */
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const [, key, value] = match
      if (!process.env[key.trim()]) process.env[key.trim()] = value.trim()
    }
  })
}

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { computeLeadtimeDays, isLeadtimeConfirmed, toLeadtimeDiffs } from '@/lib/curation/leadtime'
import type { TheaterLeadtimeSample } from '@/lib/curation/types'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

interface Row {
  movieId: string
  theaterId: string
  showDate: string
  createdAt: string
  title: string
}

async function main() {
  const supabase = createSupabaseAdminClient()
  const today = todayIso()

  const { data, error } = await supabase
    .from('showtimes')
    .select('movie_id, theater_id, show_date, created_at, movies(title)')

  if (error) throw error

  const rows: Row[] = (data ?? [])
    .map((r) => {
      const movieRaw = r.movies as unknown as { title?: string } | null
      return {
        movieId: r.movie_id as string,
        theaterId: r.theater_id as string,
        showDate: r.show_date as string,
        createdAt: r.created_at as string,
        title: movieRaw?.title ?? '(제목 미상)',
      }
    })
    .filter((r) => r.movieId && r.theaterId)

  if (rows.length === 0) {
    console.log('showtimes 데이터가 없어 백테스트를 실행할 수 없습니다.')
    return
  }

  const earliestShowDate = rows.reduce((min, r) => (r.showDate < min ? r.showDate : min), rows[0].showDate)

  // 유효한 asOfDate 조건: (1) asOfDate+7 <= today (ground truth 확인 가능), (2) asOfDate >= earliestShowDate
  const candidateAsOfDates: string[] = []
  for (let back = 1; back <= 30; back++) {
    const asOfDate = addDaysIso(today, -back)
    if (addDaysIso(asOfDate, 7) > today) continue
    if (asOfDate < earliestShowDate) continue
    candidateAsOfDates.push(asOfDate)
  }

  if (candidateAsOfDates.length === 0) {
    const readyDate = addDaysIso(earliestShowDate, 7)
    console.log('=== 백테스트 실행 불가 ===')
    console.log(`show_date 히스토리가 ${earliestShowDate}부터라 "그로부터 7일 뒤 결과"를 아직 확인할 수 없습니다.`)
    console.log(`${readyDate} 이후 재실행하면 최소 1개 asOfDate로 측정 가능합니다. 표본이 쌓일수록(수 주) 신뢰도가 올라갑니다.`)
    return
  }

  // 극장별 리드타임(현재 전체 데이터 기준 근사치 — asOfDate별로 재계산하지 않음. 리드타임은
  // 극장의 안정적인 속성이라 근사가 크게 틀어지지 않는다고 보고 단순화했다)
  const byTheater = new Map<string, TheaterLeadtimeSample[]>()
  for (const r of rows) {
    if (!byTheater.has(r.theaterId)) byTheater.set(r.theaterId, [])
    byTheater.get(r.theaterId)!.push({ showDate: r.showDate, createdAt: r.createdAt })
  }
  const leadtimeByTheater = new Map<string, number | null>()
  for (const [theaterId, samples] of byTheater.entries()) {
    leadtimeByTheater.set(theaterId, computeLeadtimeDays(toLeadtimeDiffs(samples)))
  }

  let totalCandidates = 0
  let falsePositiveOld = 0 // 기존 로직: 후보 전부를 "종영" 단정
  let totalConfirmed = 0
  let falsePositiveConfirmed = 0 // 새 로직: confirmed만 "종영" 단정

  for (const asOfDate of candidateAsOfDates) {
    const horizon = addDaysIso(asOfDate, 7)

    // "그 시점에 알려진" 데이터만 사용
    const knownAsOf = rows.filter((r) => r.createdAt.slice(0, 10) <= asOfDate)

    const movieMaxDate = new Map<string, string>()
    const movieTheaterMax = new Map<string, Map<string, string>>()
    for (const r of knownAsOf) {
      if (r.showDate < asOfDate || r.showDate > horizon) continue
      const cur = movieMaxDate.get(r.movieId)
      if (!cur || r.showDate > cur) movieMaxDate.set(r.movieId, r.showDate)
      if (!movieTheaterMax.has(r.movieId)) movieTheaterMax.set(r.movieId, new Map())
      const tm = movieTheaterMax.get(r.movieId)!
      const tcur = tm.get(r.theaterId)
      if (!tcur || r.showDate > tcur) tm.set(r.theaterId, r.showDate)
    }
    const hadFutureAsOf = new Set(knownAsOf.filter((r) => r.showDate > horizon).map((r) => r.movieId))

    for (const [movieId, ] of movieMaxDate) {
      if (hadFutureAsOf.has(movieId)) continue // 후보 조건: 이 시점에 이후 상영 안 보임

      totalCandidates++
      // ground truth: 오늘 시점 전체 데이터로 봤을 때 실제로 horizon 이후에도 상영했는가
      const actuallyContinued = rows.some((r) => r.movieId === movieId && r.showDate > horizon)
      if (actuallyContinued) falsePositiveOld++

      const theaterMaxList = [...(movieTheaterMax.get(movieId) ?? new Map())]
        .map(([theaterId, maxShowDate]) => ({ theaterId, maxShowDate }))
      const confirmed = isLeadtimeConfirmed(theaterMaxList, leadtimeByTheater, asOfDate)
      if (confirmed) {
        totalConfirmed++
        if (actuallyContinued) falsePositiveConfirmed++
      }
    }
  }

  const pct = (n: number, d: number) => (d === 0 ? 'N/A' : `${((n / d) * 100).toFixed(1)}%`)

  console.log('=== 「이번 주가 마지막」 오탐률 백테스트 ===')
  console.log(`대상 asOfDate: ${candidateAsOfDates.length}일 (${candidateAsOfDates.join(', ')})`)
  if (candidateAsOfDates.length < 7) {
    console.log('⚠️ 표본(asOfDate 수)이 적어 수치의 신뢰도가 낮습니다 — show_date 히스토리가 쌓일수록 정확해집니다.')
  }
  console.log(`기존 로직(후보 전부 "종영" 단정) 오탐률: ${falsePositiveOld}/${totalCandidates} = ${pct(falsePositiveOld, totalCandidates)}`)
  console.log(`새 로직(confirmed만 "종영" 단정) 오탐률: ${falsePositiveConfirmed}/${totalConfirmed} = ${pct(falsePositiveConfirmed, totalConfirmed)}`)
  console.log(`(likely로 분류된 ${totalCandidates - totalConfirmed}건은 "종영"을 단정하지 않으므로 오탐 비용이 없음)`)
}

main()
