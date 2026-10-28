// ================================
// 동명 영화 자동 판별 — 상영 시간·관람 등급 (순수 함수)
// ================================
//
// 2026-10-28 「최종면접」(KMDb 2012·2021·2026)·「욕쟁이 할머니」(2010·2026)가 연도 없이 들어와 미매칭됐다.
// 연도로 고르는 건 재상영·동명 단편 때문에 틀리기 쉽다(project memory: 연도 앵커 폐기).
// 대신 상영 시간을 본다 — 예매 사이트의 종료 − 시작이 KMDb 러닝타임과 분 단위로 같다
// (10/29 이후 승인 회차 실측, ±2분: 무비이 94% · 쁘띠씨네 100% · KOFA 93% · dtryx 76%).
// dtryx 일부 극장은 광고를 넣어 +10분 안팎으로 늘어난다 — 그런 회차는 판별하지 않고 검수로 넘긴다.

import { extractListingHints, parseRawJson } from './matchReviewHints'

/** 이 차이 안이면 같은 영화로 본다 */
const EXACT_MINUTES = 2
/** 회차가 러닝타임보다 이만큼 길거나(광고) 짧아도 그 후보일 수 있다 — 이 범위에 다른 후보가 있으면 판별하지 않는다 */
const RIVAL_LONGER = 2
const RIVAL_SHORTER = 15

export interface ListingIdentity {
  runtimeMinutes?: number
  /** 관람 연령 0·12·15·18 */
  minAge?: number
}

export interface IdentityOption {
  runtimeMinutes?: number | null
  certification?: string | null
}

function toMinutes(time: string | undefined) {
  const match = time?.match(/^(\d{1,2}):?(\d{2})/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined
}

/** 관람 등급 표기를 연령으로 — "15", "15세이상관람가", "전체관람가", "00", "청소년관람불가" */
export function certificationAge(value: string | null | undefined): number | undefined {
  const text = value?.trim()
  if (!text) return undefined
  if (/전체|^all$|^0+$/i.test(text)) return 0
  if (/청소년\s*관람\s*불가|제한/.test(text)) return 18
  const age = Number(text.match(/\d{2}/)?.[0])
  return age === 12 || age === 15 || age === 18 ? age : undefined
}

/** 회차 원문에서 영화 식별에 쓸 상영 시간·등급 — 러닝타임 필드가 없으면 종료 − 시작 */
export function listingIdentity(candidate: { rawText?: string; showTime: string; endTime?: string }): ListingIdentity {
  const hints = extractListingHints(parseRawJson(candidate.rawText))
  let runtimeMinutes = hints.runtimeMinutes
  if (!runtimeMinutes) {
    const start = toMinutes(candidate.showTime)
    let end = toMinutes(candidate.endTime)
    if (start != null && end != null) {
      if (end < start) end += 24 * 60
      const span = end - start
      // 종료 시각을 시작과 같게 채우거나 하루치를 넣는 수집처가 있다 — 영화 길이로 볼 수 없는 값은 버린다
      if (span >= 20 && span <= 300) runtimeMinutes = span
    }
  }
  return { runtimeMinutes, minAge: certificationAge(hints.grade) }
}

/**
 * 동명 후보 중 상영 시간이 분 단위로 맞는 후보가 하나뿐이면 그것을 고른다.
 * - 다른 후보가 광고 포함 범위(−2 ~ +15분)에 걸리면 고르지 않는다.
 * - 관람 등급이 양쪽에 다 있고 다르면 그 후보는 고르지 않는다.
 * - 러닝타임이 비어 있는 후보는 반증할 수 없으니 막지 않는다 — KMDb에서 러닝타임이 빈 건 대개 옛 기록이다.
 */
export function pickByRuntime<T>(
  options: readonly T[],
  listing: ListingIdentity,
  identityOf: (option: T) => IdentityOption = (option) => option as IdentityOption,
): T | undefined {
  const runtime = listing.runtimeMinutes
  if (!runtime || options.length < 2) return undefined
  const diff = (option: T) => {
    const minutes = identityOf(option).runtimeMinutes
    return minutes ? minutes - runtime : undefined
  }
  const exact = options.filter((option) => {
    const d = diff(option)
    return d != null && Math.abs(d) <= EXACT_MINUTES
  })
  if (exact.length !== 1) return undefined
  const picked = exact[0]
  const rivals = options.filter((option) => {
    if (option === picked) return false
    const d = diff(option)
    // 회차 길이 = 러닝타임 + 광고이므로 회차가 더 길다 — 후보 러닝타임이 회차보다 최대 15분 짧은 경우까지 겹친다
    return d != null && d >= -RIVAL_SHORTER && d <= RIVAL_LONGER
  })
  if (rivals.length > 0) return undefined
  const pickedAge = certificationAge(identityOf(picked).certification)
  if (listing.minAge != null && pickedAge != null && listing.minAge !== pickedAge) return undefined
  return picked
}
