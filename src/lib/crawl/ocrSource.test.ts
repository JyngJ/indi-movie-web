import { describe, expect, it } from 'vitest'
import { matchTheaterByName, ocrSourceIdFor, resolveOcrSource, type OcrSourceRef, type TheaterRef } from './ocrSource'

const INDIESPACE = '8a7e985b-4630-4b38-9d3f-27448071a309'
const theaters: TheaterRef[] = [
  { id: INDIESPACE, name: '인디스페이스' },
  { id: 'dongri', name: '동리시네마' },
  { id: 'ohoh', name: '오오극장' },
  { id: 'cinema-a', name: '시네마 A' },
  { id: 'cinema-b', name: '시네마 B' },
]

// 2026-11-26 운영 DB 그대로 — 같은 극장을 가리키는 수동 수집처 두 개
const prodSources: OcrSourceRef[] = [
  { id: 'ocr-인디스페이스', parser: 'ocr', matchedTheaterId: INDIESPACE, createdAt: '2026-05-25T15:37:26Z' },
  { id: 'ocr-indie-space', parser: 'ocr', matchedTheaterId: INDIESPACE, createdAt: '2026-06-13T06:39:44Z' },
]

describe('ocrSourceIdFor', () => {
  it('기존 id 규칙을 유지한다', () => {
    expect(ocrSourceIdFor('인디스페이스')).toBe('ocr-인디스페이스')
    expect(ocrSourceIdFor('indie space')).toBe('ocr-indie-space')
  })
})

describe('matchTheaterByName', () => {
  it('공백·대소문자·기호를 무시하고 완전 일치를 먼저 본다', () => {
    expect(matchTheaterByName(' 인디 스페이스 ', theaters)?.id).toBe(INDIESPACE)
    expect(matchTheaterByName('오오극장', theaters)?.id).toBe('ohoh')
  })

  it('포함 매칭은 후보가 하나일 때만 쓴다', () => {
    expect(matchTheaterByName('동리시네마 상영시간표', theaters)?.id).toBe('dongri')
    expect(matchTheaterByName('시네마', theaters)).toBeNull()
  })

  it('영문 표기만으로는 한글 극장명을 추측하지 않는다', () => {
    expect(matchTheaterByName('indie space', theaters)).toBeNull()
  })
})

describe('resolveOcrSource', () => {
  it('OCR이 영문 로고를 읽어도 힌트로 극장을 찾아 기존 수집처에 담는다 — 인디스페이스 재발 방지', () => {
    const r = resolveOcrSource({ ocrTheaterName: 'indie space', theaterHint: '인디스페이스', theaters, ocrSources: [prodSources[0]] })
    expect(r).toEqual({ kind: 'existing', sourceId: 'ocr-인디스페이스' })
  })

  it('같은 극장에 수동 수집처가 여럿이면 먼저 만든 쪽으로 모은다', () => {
    const r = resolveOcrSource({ ocrTheaterName: '인디스페이스', theaters, ocrSources: [...prodSources].reverse() })
    expect(r).toEqual({ kind: 'existing', sourceId: 'ocr-인디스페이스' })
  })

  it('극장을 못 찾아도 이름이 같은 수집처가 있으면 그걸 쓴다', () => {
    const r = resolveOcrSource({ ocrTheaterName: 'indie space', theaters, ocrSources: prodSources })
    expect(r).toEqual({ kind: 'existing', sourceId: 'ocr-indie-space' })
  })

  it('극장은 찾았는데 수집처가 없으면 극장 등록 이름으로 만든다', () => {
    const r = resolveOcrSource({ ocrTheaterName: '동리 시네마', theaters, ocrSources: prodSources })
    expect(r).toEqual({ kind: 'create', sourceId: 'ocr-동리시네마', theaterName: '동리시네마', matchedTheaterId: 'dongri' })
  })

  it('자동 수집처는 수동 업로드 대상이 아니다', () => {
    const auto: OcrSourceRef = { id: 'auto-1', parser: 'tableText', matchedTheaterId: 'ohoh' }
    const r = resolveOcrSource({ ocrTheaterName: '오오극장', theaters, ocrSources: [auto] })
    expect(r).toMatchObject({ kind: 'create', sourceId: 'ocr-오오극장', matchedTheaterId: 'ohoh' })
  })

  it('아무 극장에도 안 맞으면 OCR 이름으로 만들고 극장 연결은 비워 둔다', () => {
    const r = resolveOcrSource({ ocrTheaterName: '새 극장', theaters, ocrSources: [] })
    expect(r).toEqual({ kind: 'create', sourceId: 'ocr-새-극장', theaterName: '새 극장', matchedTheaterId: null })
  })
})
