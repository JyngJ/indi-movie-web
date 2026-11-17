/**
 * 영화 제목 대조용 정규화 — 공백·문장부호·대소문자 차이를 지운다.
 * 크롤 회차 매칭(admin/store)과 개봉 예정 매칭(releases)이 같은 규칙을 쓴다.
 */
export function normalizeMatchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s"'‘’“”()[\]{}:;,.!?·ㆍ・_-]+/g, '')
}

/** normalizeMatchText + 표기 흔들림("까지의"/"까지") 흡수 */
export function normalizeLooseMovieTitle(value: string) {
  return normalizeMatchText(value)
    .replace(/까지의/g, '까지')
    .replace(/부터의/g, '부터')
}
