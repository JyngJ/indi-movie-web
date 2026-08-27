/**
 * SERP 스니펫용 안전 절단.
 *
 * `synopsis.slice(0, n)` 하드 컷은 "…만들어 낸 전"처럼 단어 중간에서 끊긴 문장을
 * meta description에 그대로 내보냈다. 문장 경계를 우선 찾고, 없으면 어절 경계에서
 * 자른 뒤 말줄임표를 붙여 스니펫이 항상 완결된 형태로 끝나게 한다.
 */
export function truncateSnippet(
  text: string | null | undefined,
  maxLength: number,
): string | null {
  if (!text) return null
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  if (normalized.length <= maxLength) return normalized

  const head = normalized.slice(0, maxLength)

  // 문장이 maxLength 안에서 온전히 끝나면 그 문장까지만 쓴다 (말줄임 불필요).
  // 너무 앞에서 끝난 문장(1/3 미만)은 버리고 어절 절단으로 넘어간다.
  const sentenceEnd = Math.max(
    head.lastIndexOf('.'),
    head.lastIndexOf('!'),
    head.lastIndexOf('?'),
  )
  if (sentenceEnd >= maxLength / 3) {
    return head.slice(0, sentenceEnd + 1)
  }

  // 어절 경계 절단 + 말줄임 ('…' 한 글자 자리 확보)
  const wordHead = normalized.slice(0, maxLength - 1)
  const lastSpace = wordHead.lastIndexOf(' ')
  const cut = lastSpace >= maxLength / 2 ? wordHead.slice(0, lastSpace) : wordHead
  return `${cut.trimEnd()}…`
}
