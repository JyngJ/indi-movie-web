import { describe, expect, it } from 'vitest'
import { dtryxNoOpenSessionsNotice } from './crawler'
import { isNoOpenSessionsMessage } from '@/lib/crawl/crawlNotice'

const list = [
  { CinemaCd: '000069', CinemaNm: '에무시네마', HiddenYn: 'Y' },
  { CinemaCd: '000065', CinemaNm: '더숲아트시네마', HiddenYn: 'N' },
]

describe('dtryxNoOpenSessionsNotice', () => {
  it('예매 목록에서 비활성(HiddenYn=Y)이면 "열린 회차 없음"으로 안내한다 — 극장이 사라졌다고 하지 않는다', () => {
    const notice = dtryxNoOpenSessionsNotice(list, '에무시네마', '000069')
    expect(isNoOpenSessionsMessage(notice)).toBe(true)
    expect(notice).toContain('회차가 열려 있지 않아요')
    expect(notice).not.toContain('숨김')
    expect(notice).not.toContain('예매처가 바뀌었')
  })
  it('공개 극장은 통과한다', () => {
    expect(dtryxNoOpenSessionsNotice(list, '더숲아트시네마', '000065')).toBeUndefined()
  })
  it('목록에 없는 코드는 판단하지 않는다(기존 대체 경로 유지)', () => {
    expect(dtryxNoOpenSessionsNotice(list, '판타스틱 큐브', '000056')).toBeUndefined()
  })
})
