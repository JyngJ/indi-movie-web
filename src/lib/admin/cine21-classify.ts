/**
 * Cine21 배급사 기반 독립영화 여부 자동 분류
 */

const MAJOR_DISTRIBUTORS = [
  '유니버설',
  '워너브라더스',
  '뉴라인시네마',   // 워너 계열
  '월트디즈니',
  '소니픽처스',
  '소니영화사',
  '파라마운트',
  'CJENM',
  '씨제이이엔엠',
  '롯데엔터',
  '쇼박스',

  '미디어라인',
  '플러스엠',
  '에이스메이커',
]

function isMajorDistributor(name: string): boolean {
  const normalized = name.replace(/\s/g, '')
  return MAJOR_DISTRIBUTORS.some((d) => normalized.includes(d.replace(/\s/g, '')))
}

async function fetchCine21Html(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'ko-KR,ko;q=0.9' },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`cine21 fetch ${res.status}`)
  return res.text()
}

interface Cine21Suggestion {
  category: string
  id: string
  title: string
  txt2: string // year
}

interface Cine21AutocompleteResponse {
  suggestions: Cine21Suggestion[]
}

/** Cine21 autocomplete API → 제목 매칭 movie_id 반환 */
export async function searchCine21Id(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://cine21.com/search/autocomplete?query=${encodeURIComponent(title)}`,
      {
        headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'ko-KR,ko;q=0.9' },
        signal: AbortSignal.timeout(8000),
      },
    )
    if (!res.ok) return null
    const data = (await res.json()) as Cine21AutocompleteResponse
    const movies = data.suggestions.filter((s) => s.category === 'movie')
    if (!movies.length) return null

    // 정확히 같거나, 제목이 우리 타이틀로 시작하는 항목 우선
    const normalized = title.replace(/\s/g, '').toLowerCase()
    const exact = movies.find(
      (m) => m.title.replace(/\s/g, '').toLowerCase() === normalized,
    )
    if (exact) return exact.id

    const startsWith = movies.find((m) =>
      m.title.replace(/\s/g, '').toLowerCase().startsWith(normalized),
    )
    return startsWith?.id ?? movies[0].id
  } catch {
    return null
  }
}

/** Cine21 movie_id로 배급사 추출 → 독립영화 여부 반환 */
export async function classifyIndieByCine21(
  cine21Id: string,
): Promise<{ isIndie: boolean; distributor: string | null }> {
  const html = await fetchCine21Html(`https://cine21.com/movie/info/?movie_id=${cine21Id}`)

  // 배급사 파싱: <dt>배급</dt> ... <dd>...<a ...>회사명</a>...</dd>
  const distBlock = html.match(/배급<\/dt>\s*[\s\S]{0,300}?<dd[^>]*>([\s\S]{0,300}?)<\/dd>/)?.[1]
  const distributor = distBlock
    ? distBlock.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : null

  if (!distributor) {
    // 배급사 정보 없음 → 소규모/독립 가능성 높음
    return { isIndie: true, distributor: null }
  }

  const isIndie = !isMajorDistributor(distributor)
  return { isIndie, distributor }
}

/**
 * 영화 제목으로 Cine21 검색 후 독립영화 여부 반환
 * @returns { isIndie, cine21Id, distributor } or null (검색 실패)
 */
export async function autoClassifyIndie(title: string): Promise<{
  isIndie: boolean
  cine21Id: string
  distributor: string | null
} | null> {
  const cine21Id = await searchCine21Id(title)
  if (!cine21Id) return null

  try {
    const { isIndie, distributor } = await classifyIndieByCine21(cine21Id)
    return { isIndie, cine21Id, distributor }
  } catch {
    return null
  }
}
