// ================================
// 수동(OCR) 수집처 고르기 (순수 함수)
// ================================

/**
 * 2026-11-26 인디스페이스: 수동 수집처가 `ocr-인디스페이스`(어드민 업로드, 5월)와 `ocr-indie-space`
 * (디스코드 /schedule, 6월) 두 개로 갈라져 있었다. 둘 다 같은 극장(theaters 1건)을 가리켰고,
 * 매일 리포트에 "수동 업로드 끊김"이 두 줄로 떴다.
 *
 * 원인은 수집처 id를 OCR이 이미지에서 읽은 극장명으로 만들던 것이다 — `ocr-${이름}`.
 * 시간표 이미지에 영문 로고("indie space")가 찍혀 있으면 OCR은 그 이름을 돌려주고,
 * id가 달라지니 같은 극장의 기존 수집처를 못 찾고 새로 만들었다.
 *
 * 이제는 극장을 먼저 찾고, 그 극장에 이미 붙은 수동 수집처가 있으면 이름과 상관없이 그걸 쓴다.
 * 어드민 업로드 · 디스코드 /schedule · 디스코드 봇 세 입구가 이 함수 하나를 거친다.
 */

export interface TheaterRef {
  id: string
  name: string
}

export interface OcrSourceRef {
  id: string
  parser: string
  matchedTheaterId: string | null
  /** 같은 극장에 여럿이면 먼저 만든 쪽을 고른다 */
  createdAt?: string | null
}

export type OcrSourceResolution =
  | { kind: 'existing'; sourceId: string }
  | { kind: 'create'; sourceId: string; theaterName: string; matchedTheaterId: string | null }

/** 이름 비교용 — 공백·기호를 지우고 소문자로 */
export function normalizeTheaterName(name: string) {
  return name.replace(/[^a-z0-9가-힣]/gi, '').toLowerCase()
}

/** 새 수동 수집처 id. 기존 id(`ocr-인디스페이스`)와 같은 규칙을 유지한다 */
export function ocrSourceIdFor(theaterName: string) {
  return `ocr-${theaterName.trim().replace(/[^a-z0-9가-힣]/gi, '-').toLowerCase()}`
}

/**
 * 이름으로 극장 찾기 — 정규화 후 완전 일치가 먼저, 다음은 한쪽이 다른 쪽을 포함하는 경우.
 * 포함 매칭은 후보가 하나일 때만 쓴다(“시네마” 같은 짧은 이름이 아무 극장에나 붙지 않게).
 */
export function matchTheaterByName(name: string, theaters: readonly TheaterRef[]): TheaterRef | null {
  const norm = normalizeTheaterName(name)
  if (!norm) return null
  const exact = theaters.find((t) => normalizeTheaterName(t.name) === norm)
  if (exact) return exact
  const partial = theaters.filter((t) => {
    const tn = normalizeTheaterName(t.name)
    return tn.length > 0 && (tn.includes(norm) || norm.includes(tn))
  })
  return partial.length === 1 ? partial[0] : null
}

/**
 * OCR 결과를 어느 수집처에 담을지 정한다.
 * 1. 극장명(OCR 결과 → 사용자가 준 힌트 순)으로 극장을 찾고, 그 극장의 수동 수집처가 있으면 그걸 쓴다.
 * 2. 극장을 못 찾았으면 이름으로 만든 id의 수집처가 이미 있는지 본다.
 * 3. 둘 다 없으면 새로 만든다.
 */
export function resolveOcrSource(input: {
  ocrTheaterName: string
  theaterHint?: string | null
  theaters: readonly TheaterRef[]
  ocrSources: readonly OcrSourceRef[]
}): OcrSourceResolution {
  const names = [input.ocrTheaterName, input.theaterHint ?? ''].map((n) => n.trim()).filter(Boolean)
  const theater = names.map((n) => matchTheaterByName(n, input.theaters)).find(Boolean) ?? null
  const manual = input.ocrSources.filter((s) => s.parser === 'ocr')

  if (theater) {
    const existing = manual
      .filter((s) => s.matchedTheaterId === theater.id)
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id))[0]
    if (existing) return { kind: 'existing', sourceId: existing.id }
  }

  const fallbackName = theater?.name ?? names[0] ?? input.ocrTheaterName
  const byName = names.map(ocrSourceIdFor).concat(ocrSourceIdFor(fallbackName))
  const sameId = manual.find((s) => byName.includes(s.id))
  if (sameId) return { kind: 'existing', sourceId: sameId.id }

  return {
    kind: 'create',
    // 극장을 찾았으면 극장의 등록 이름으로 id를 만든다 — 다음 업로드도 같은 id로 모인다
    sourceId: ocrSourceIdFor(fallbackName),
    theaterName: fallbackName,
    matchedTheaterId: theater?.id ?? null,
  }
}
