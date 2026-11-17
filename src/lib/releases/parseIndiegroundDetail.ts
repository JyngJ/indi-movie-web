/**
 * 인디그라운드 영화 상세(`movieLibraryView.do?seq=…`) HTML에서 매칭에 쓸 사실만 읽는다.
 * 기본 정보는 `<dl><dt>감독</dt><dd>…</dd></dl>` 꼴이다. 시놉시스·연출의도는 읽지 않는다.
 */
export interface IndiegroundDetail {
  directors: string[]
  /** yyyy-mm-dd — 상세에 개봉일이 적혀 있을 때만 */
  releaseDate?: string
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function definition(html: string, label: string): string | undefined {
  const match = html.match(new RegExp(`<dt>\\s*${label}\\s*</dt>\\s*<dd>([\\s\\S]*?)</dd>`))
  if (!match) return undefined
  const text = decodeEntities(match[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
  return text || undefined
}

export function parseIndiegroundDetail(html: string): IndiegroundDetail {
  const directors = (definition(html, '감독') ?? '')
    .split(/\s*[,，·/]\s*/)
    .map((name) => name.trim())
    .filter(Boolean)

  const release = definition(html, '개봉')?.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
  const releaseDate = release
    ? `${release[1]}-${release[2].padStart(2, '0')}-${release[3].padStart(2, '0')}`
    : undefined

  return { directors, releaseDate }
}
