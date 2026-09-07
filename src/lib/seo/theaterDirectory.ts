import type { ScreeningTheater } from './getScreeningIndex'

/**
 * 지역 페이지의 "극장 목록" 조립 — 순수 함수라 DB·브라우저 없이 테스트한다.
 *
 * 배경: "서울 독립영화관" 실제 SERP 1페이지는 9개 중 6개가 블로그·나무위키·매거진의
 * **추천 리스트** 글이다. 구글은 이 쿼리를 "몇 시에 뭘 하나"가 아니라 "서울에 독립영화관이
 * 어디어디 있나"로 해석한다. 회차만으로는 그 의도를 못 채운다 — 어떤 극장이 어디에
 * 있는지를 목록으로 줘야 한다.
 *
 * 블로그가 못 하는 것도 여기서 나온다: 이 목록은 매일 갱신되고 오늘 상영 편수가 붙는다.
 * 2023년에 쓰인 "독립영화관 9선"보다 나은 답이 될 수 있는 지점이다.
 */

export interface TheaterProfile {
  id: string
  name: string
  address: string
  /** '종로구' 같은 자치구. 못 읽으면 null */
  district: string | null
  screenCount: number | null
  /** 오늘 상영 편수. 0이면 오늘 상영 없음 */
  todayMovieCount: number
}

export interface DistrictGroup {
  /** '종로구', 또는 구를 못 읽은 극장들을 담는 '기타' */
  district: string
  theaters: TheaterProfile[]
}

const UNKNOWN_DISTRICT = '기타'

/**
 * 주소에서 자치구를 읽는다 — '서울 종로구 삼일대로 428' → '종로구'.
 *
 * 시·도 다음 토큰이 구/군/시로 끝나면 그것을 쓴다. 광역시가 아닌 지역의 '수원시'처럼
 * 시 단위도 같은 규칙으로 잡히므로 서울 전용이 아니다.
 */
export function parseDistrict(address: string): string | null {
  const tokens = address.trim().split(/\s+/)
  // 첫 토큰은 시·도라 건너뛴다. 두세 번째까지만 본다 — 그 뒤는 도로명이다.
  for (const token of tokens.slice(1, 3)) {
    if (/[구군시]$/.test(token) && token.length >= 2) return token
  }
  return null
}

/** 극장 목록을 자치구별로 묶는다. 구는 극장 수 많은 순 → 이름 순. */
export function groupByDistrict(theaters: TheaterProfile[]): DistrictGroup[] {
  const byDistrict = new Map<string, TheaterProfile[]>()

  for (const theater of theaters) {
    const key = theater.district ?? UNKNOWN_DISTRICT
    if (!byDistrict.has(key)) byDistrict.set(key, [])
    byDistrict.get(key)!.push(theater)
  }

  return [...byDistrict.entries()]
    .map(([district, list]) => ({
      district,
      theaters: [...list].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    }))
    .sort((a, b) => {
      // '기타'는 항상 끝으로 — 구를 못 읽은 것들이라 목록의 앞에 올 이유가 없다
      if (a.district === UNKNOWN_DISTRICT) return 1
      if (b.district === UNKNOWN_DISTRICT) return -1
      if (a.theaters.length !== b.theaters.length) return b.theaters.length - a.theaters.length
      return a.district.localeCompare(b.district, 'ko')
    })
}

/**
 * 극장 한 줄 소개. **데이터에 있는 사실만** 쓴다 — 극장 성격·분위기를 지어내면
 * 그 순간 이 목록의 값어치가 블로그 글 이하가 된다.
 */
export function describeTheater(theater: TheaterProfile): string {
  const parts: string[] = []
  if (theater.district) parts.push(theater.district)
  if (theater.screenCount) parts.push(`상영관 ${theater.screenCount}개`)
  parts.push(
    theater.todayMovieCount > 0
      ? `오늘 ${theater.todayMovieCount}편 상영`
      : '오늘은 상영 없음',
  )
  return parts.join(' · ')
}

/** 지역 극장과 오늘 상영 편수를 합쳐 목록용 프로필로. */
export function toTheaterProfiles(
  theaters: ScreeningTheater[],
  todayMovieCountByTheaterId: Map<string, number>,
): TheaterProfile[] {
  return theaters.map((t) => ({
    id: t.id,
    name: t.name,
    address: t.address,
    district: parseDistrict(t.address),
    screenCount: t.screenCount,
    todayMovieCount: todayMovieCountByTheaterId.get(t.id) ?? 0,
  }))
}
