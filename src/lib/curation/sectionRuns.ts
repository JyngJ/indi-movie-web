/**
 * 큐레이션 행을 "run"(연속으로 묶여 렌더되는 섹션 묶음) 단위로 나눠 렌더하는데,
 * 각 run의 시작 순번(startIndex)을 앞 run들이 실제로 그린 섹션 수로 이어붙인다.
 *
 * 왜 함수로 뺐나 — 예전엔 이 산술을 두 곳에서 손으로 관리했다. renderRun은
 * `startIndex + index`로 계산하고, 커스텀 클릭 핸들러는 getRealtimePositions()가
 * run 조립 규칙을 통째로 복제해 따로 셌다. 복제본이 startIndex와 run2 앞의 랭킹 섹션을
 * 빠뜨려서, 같은 섹션의 dwell 이벤트와 click 이벤트가 서로 다른 position을 보내고 있었다.
 * 아무 에러도 안 나는 종류라 오래 살아남았다.
 *
 * 주의 — 여기서 나오는 순번은 **그날 게이트를 통과한 섹션들 안에서의 상대 순번**이다.
 * 대부분의 섹션에 "3편 미만이면 숨김"이 걸려 있어 같은 섹션이라도 날짜마다 값이 달라진다.
 * 시점 간 비교는 position이 아니라 list_id로 해야 한다.
 */

export interface RunnableSection {
  movies: unknown[]
}

/** 섹션이 실제로 그려지는 모양 */
export type SectionLayout =
  | 'row'      // 가로 스크롤 포스터 행
  | 'card'     // 2편 이하 카드 문법
  | 'grid'     // 전체 상영작 그리드
  | 'banner'   // 영화제 배너
  | 'hero'     // 인스타 히어로 카드
  | 'avatar'   // 감독 아바타 행

export interface SectionAnalytics {
  source: 'films_tab'
  list_id: string
  section_title: string
  /** 어느 묶음에서 나왔는지 — 'top' | 'run1' | 'run1b' | 'run2' | 'fixed_top' */
  run: string
  /** run 체계 안의 순번. 상단 고정 섹션(개인화·기념일·특별전)은 없음 */
  position?: number
  movie_count: number
  /** 행 문법 — 같은 섹션도 그날 편수에 따라 row/card로 갈리므로 어느 모양일 때
   *  잘 눌리는지 가를 수 있어야 한다 */
  layout: SectionLayout
  /** 섹션별 추가 속성(개인화의 reason_type 등)을 얹을 수 있게 열어 둔다 */
  [key: string]: string | number | undefined
}

/**
 * dwell 이벤트와 click 이벤트에 함께 실을 섹션 메타를 만든다.
 * 두 이벤트가 같은 객체를 쓰게 해서 속성이 어긋나지 않게 하는 게 목적이다 —
 * 예전엔 dwell과 click의 position이 실제로 서로 달랐고, 그래서 PostHog에서
 * 두 이벤트를 붙여 "오래 본 섹션이 실제로 클릭도 많은가"를 볼 수 없었다.
 */
export function buildSectionAnalytics(args: {
  listId: string
  sectionTitle: string
  run: string
  position?: number
  movieCount: number
  /** 행 문법. 생략하면 compact 여부로 row/card를 고른다 */
  layout?: SectionLayout
  compact?: boolean
}): SectionAnalytics {
  return {
    source: 'films_tab',
    list_id: args.listId,
    section_title: args.sectionTitle,
    run: args.run,
    ...(args.position != null ? { position: args.position } : {}),
    movie_count: args.movieCount,
    layout: args.layout ?? (args.compact ? 'card' : 'row'),
  }
}

/** 그날 실제로 그려지는 섹션 수 (빈 섹션은 renderRun이 걸러낸다) */
export function shownCount(list: readonly RunnableSection[]): number {
  return list.filter((s) => s.movies.length > 0).length
}

/**
 * 렌더 순서대로 늘어놓은 run 배열들을 받아 각 run의 시작 순번을 돌려준다.
 * 반환 길이는 입력과 같고, 첫 값은 항상 0이다.
 */
export function computeRunStartIndexes(
  runsInRenderOrder: readonly (readonly RunnableSection[])[],
): number[] {
  const starts: number[] = []
  let acc = 0
  for (const run of runsInRenderOrder) {
    starts.push(acc)
    acc += shownCount(run)
  }
  return starts
}
