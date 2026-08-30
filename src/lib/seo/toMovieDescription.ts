import { truncateSnippet } from './truncateSnippet'

/**
 * 영화 상세 meta description 생성.
 *
 * 예전 문구는 시놉시스가 있을 때만 편별로 달라졌다. 상영 중인 영화는
 * "전국 독립·예술영화관 N곳 상영 중 · 극장별 상영시간표와 예매 링크를 한눈에."로
 * 제목조차 없었고, 상영이 없으면 제목만 갈아끼운 통짜 템플릿이었다. 시놉시스가
 * 없는 194편(전체의 11%)은 결국 문장이 서로 완전히 같아져, 네이버 서치어드바이저가
 * "<meta name="description"> 태그에 동일 설명문 발견"으로 다수 URL을 잡았다.
 *
 * 그래서 시놉시스에 의존하지 않는 식별 문구를 먼저 만든다. 감독·연도·국가는
 * 채움률 100%, 장르 94%, 러닝타임 86%라 이 조합만으로 편마다 문장이 갈린다.
 * 시놉시스는 있으면 뒤에 덧붙이는 보너스지 유일성의 근거가 아니다.
 */

/** SERP에서 잘리지 않으면서 설명이 빈약해 보이지 않는 상한 */
const MAX_LENGTH = 155
/** 설명에 이름을 나열할 극장 수 — 넘으면 "등"으로 줄인다 */
const MAX_THEATER_NAMES = 3
/** 합작은 국가가 여럿 붙는다("사우디아라비아,이라크,이집트,영국") — 앞 둘만 */
const MAX_NATIONS = 2

export interface MovieDescriptionInput {
  title: string
  year?: number | null
  director?: string[] | null
  nation?: string | null
  genre?: string[] | null
  runtimeMinutes?: number | null
  synopsis?: string | null
  /**
   * 지금 이 영화를 상영 중인 극장 이름 (중복 제거된 상태).
   *
   * `[]`는 "조회했고 상영이 없다", `undefined`는 "조회하지 않았다"로 서로 다르다.
   * `/films/movie/[id]`는 시간표를 조회하지 않으므로 값을 넘기지 않는다 —
   * 빈 배열로 넘기면 상영 중인 영화에 "상영 일정이 없다"고 거짓말을 하게 된다.
   */
  theaterNames?: string[] | null
}

function cleanList(values: string[] | null | undefined, limit: number): string[] {
  return (values ?? [])
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0)
    .slice(0, limit)
}

/**
 * "빌리 와일더 감독의 1950년 미국 느와르·드라마 영화, 110분" 같은 한 덩어리.
 * 비어 있는 필드는 조용히 빠지고, 남은 조각만으로 자연스럽게 이어진다.
 */
function buildIdentity(input: MovieDescriptionInput): string {
  const directors = cleanList(input.director, 2)
  const genres = cleanList(input.genre, 2)
  const nations = cleanList(input.nation ? input.nation.split(',') : [], MAX_NATIONS)

  // "1950년 미국 느와르·드라마 영화" — 연도·국가·장르를 하나의 명사구로 묶는다
  const qualifiers = [
    input.year ? `${input.year}년` : null,
    nations.length > 0 ? nations.join('·') : null,
    genres.length > 0 ? genres.join('·') : null,
  ].filter((v): v is string => v !== null)

  const work = qualifiers.length > 0 ? `${qualifiers.join(' ')} 영화` : '영화'
  const subject = directors.length > 0 ? `${directors.join('·')} 감독의 ${work}` : work
  const runtime = input.runtimeMinutes ? `, ${input.runtimeMinutes}분` : ''

  return `${input.title} — ${subject}${runtime}.`
}

/** 상영 여부에 따라 달라지는 뒷문장. 극장 이름이 들어가 편마다 또 한 번 갈린다. */
function buildScreening(theaterNames: string[] | null): string {
  if (theaterNames === null) {
    // 상영 여부를 모르는 호출부 — 있다고도 없다고도 하지 않는다
    // writing-audit-ignore — SEO 메타는 문어체를 허용한다
    return '전국 독립·예술영화관의 상영 극장과 회차 시간, 예매 링크를 영화볼지도에서 확인하세요.'
  }

  if (theaterNames.length === 0) {
    // writing-audit-ignore — SEO 메타는 문어체를 허용한다
    return '현재 잡힌 상영 일정은 없습니다. 영화볼지도는 전국 독립·예술영화관 시간표를 매일 갱신합니다.'
  }

  const named = theaterNames.slice(0, MAX_THEATER_NAMES).join(', ')
  const suffix = theaterNames.length > MAX_THEATER_NAMES ? ' 등' : ''
  // writing-audit-ignore — SEO 메타는 문어체를 허용한다
  return `전국 독립·예술영화관 ${theaterNames.length}곳에서 상영 중입니다: ${named}${suffix}. 극장별 회차 시간과 예매 링크를 확인하세요.`
}

export function toMovieDescription(input: MovieDescriptionInput): string {
  const theaterNames = input.theaterNames == null
    ? null
    : cleanList(input.theaterNames, Number.MAX_SAFE_INTEGER)
  const base = `${buildIdentity(input)} ${buildScreening(theaterNames)}`

  // 시놉시스는 남는 자리에만 덧붙인다. 자리가 빠듯하면 통째로 생략해
  // "…" 한 조각만 붙는 지저분한 꼬리를 만들지 않는다.
  const remaining = MAX_LENGTH - base.length - 1
  if (remaining >= 30) {
    const lead = truncateSnippet(input.synopsis, remaining)
    if (lead) return `${base} ${lead}`
  }

  return base
}
