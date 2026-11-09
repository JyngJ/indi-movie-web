import { describe, expect, it } from 'vitest'
import type { Feature, Geometry } from 'geojson'
import { createStationSnapper, normalizeLineName } from './stationSnap'

function line(name: string, coordinates: number[][][]): Feature<Geometry, { line: string }> {
  return { type: 'Feature', properties: { line: name }, geometry: { type: 'MultiLineString', coordinates } }
}

const LINE_2 = line('서울2호선', [[[127, 37.5], [127.01, 37.5]]])
const LINE_5 = line('서울5호선', [[[127, 37.5002], [127.01, 37.5002]]])

function station(lat: number, lines: string[], id = 's1') {
  return { id, lat, lng: 127.005, lines }
}

describe('createStationSnapper', () => {
  it('자기 노선 위로 옮긴다', () => {
    const snap = createStationSnapper([LINE_2])
    const moved = snap(station(37.5005, ['2호선']))
    expect(moved.lat).toBeCloseTo(37.5, 6)
    expect(moved.lng).toBeCloseTo(127.005, 6)
  })

  it('더 가까운 다른 노선에는 붙지 않는다', () => {
    const snap = createStationSnapper([LINE_2, LINE_5])
    expect(snap(station(37.5003, ['2호선'])).lat).toBeCloseTo(37.5, 6)
  })

  it('환승역은 자기 노선 중 가장 가까운 쪽에 붙는다', () => {
    const snap = createStationSnapper([LINE_2, LINE_5])
    expect(snap(station(37.5003, ['2호선', '5호선'])).lat).toBeCloseTo(37.5002, 6)
  })

  it('허용 거리보다 멀면 그대로 둔다', () => {
    const snap = createStationSnapper([LINE_2], 200)
    expect(snap(station(37.51, ['2호선'])).lat).toBe(37.51)
  })

  it('노선 데이터가 없는 역은 그대로 둔다', () => {
    const snap = createStationSnapper([LINE_2])
    expect(snap(station(37.5005, ['경의중앙선'])).lat).toBe(37.5005)
  })

  it('수도권 호선 이름만 서울 접두어를 붙인다', () => {
    expect(normalizeLineName('2호선')).toBe('서울2호선')
    expect(normalizeLineName('부산2호선')).toBe('부산2호선')
    expect(normalizeLineName('인천 1호선')).toBe('인천1호선')
  })
})
