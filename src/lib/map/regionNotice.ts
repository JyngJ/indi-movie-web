import { withJosa } from '@/lib/josa'

/** 지역 필터가 걸린 지도에서 영화 필터 결과를 지역 안/밖으로 나눈 수치 */
export interface RegionSplit {
  /** 현재 지역 안에서 그 영화를 트는 극장 수 */
  inRegion: number
  /** 그 극장들의 회차 합 */
  inRegionShowtimes: number
  /** 지역 밖에서 트는 극장 수 */
  outRegion: number
  /** 지역 밖 상영이 퍼져 있는 지역 수 */
  regionCount: number
}

/** 지역 필터가 가린 것을 알리는 한 줄. 두 경우 모두 토스트로 말한다. */
export interface RegionNotice {
  /** 지역 안에 상영이 있어 결과를 요약하는 줄인지, 없어서 다른 지역을 알리는 줄인지 */
  kind: 'summary' | 'empty'
  /** (영화 × 지역) 조합 — 같은 조합에서 같은 말을 두 번 하지 않기 위한 열쇠 */
  key: string
  message: string
}

/**
 * 지역 필터 때문에 화면 밖으로 밀려난 상영을 알릴 문장을 만든다.
 *
 * - 상영이 있으면 결과 요약, 없으면 다른 지역에 있다는 사실. 둘 다 토스트다.
 * - 예전엔 둘 다 닫기 버튼 달린 카드였다. 결과 요약까지 지도 위에 남아서 자기가 건
 *   필터의 결과를 매번 손으로 치워야 했다. 카드를 없앤 뒤에도 빠져나갈 길은 남는다 —
 *   지역 필터 칩이 화면 위에 그대로 있고, 거기서 지역을 지우면 전국이 된다.
 * - 지역 필터가 없으면(전국) 가려진 게 없으니 아무것도 알리지 않는다.
 */
export function buildRegionNotice({
  movieTitle,
  movieId,
  regionId,
  split,
}: {
  movieTitle: string
  movieId: string
  regionId: string | null
  split: RegionSplit | null
}): RegionNotice | null {
  if (!regionId || !split) return null
  const key = `${movieId}:${regionId}`
  const { inRegion, inRegionShowtimes, outRegion, regionCount } = split

  if (inRegion > 0) {
    return { kind: 'summary', key, message: `극장 ${inRegion}곳에서 상영 ${inRegionShowtimes}회를 찾았어요` }
  }
  if (outRegion === 0) return null
  return {
    kind: 'empty',
    key,
    message: `${regionId}에서 ${withJosa(`「${movieTitle}」`, '을/를')} 상영하는 극장이 없어요. 다른 ${regionCount}개 지역에서 상영 중이에요`,
  }
}
