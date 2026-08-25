export type AnalyticsEventName =
  | 'search opened'
  | 'search performed'
  | 'search no results'
  | 'search result selected'
  | 'map viewed'
  | 'map filter changed'
  /** 위치 동의 사용자에게 접속 지역을 필터로 최초 1회 자동 지정 — region 속성 */
  | 'region auto assigned'
  | 'map pin clicked'
  | 'theater sheet opened'
  | 'theater sheet expanded'
  | 'theater sheet closed'
  | 'theater date changed'
  | 'theater movie selected'
  | 'theater movie searched on map'
  | 'theater sheet filter opened'
  | 'showtime unavailable clicked'
  | 'showtime selected'
  | 'booking clicked'
  /** 외부 예매 사이트에 다녀와 앱으로 돌아온 순간 — 이탈/재탐색을 재는 짝 이벤트.
   *  away_seconds가 아주 짧으면 링크가 안 열렸다는 뜻(중복 클릭의 원인). */
  | 'booking returned'
  | 'directions clicked'
  | 'website clicked'
  | 'instagram clicked'
  | 'share clicked'
  /** 공유 결과 — result: shared|cancelled|copied|error, method: native|clipboard|clipboard_fallback.
   *  'share clicked'는 버튼을 눌렀다는 뜻일 뿐이라 실제 공유율을 재려면 이 이벤트를 봐야 한다. */
  | 'share completed'
  | 'movie detail viewed'
  | 'movie detail tab changed'
  | 'movie theaters map opened'
  | 'movie theater selected'
  | 'curation movie selected'
  | 'curation section dwell'
  /** 섹션 안에서 영화가 아닌 대상을 누른 경우 — 특별전의 극장, 스포트라이트의 감독 */
  | 'curation theater selected'
  | 'curation director selected'
  /** 전체 상영작 CTA 밴드 → 그리드로 내려감. 그리드 자체의 클릭은 'curation movie selected' */
  | 'curation grid entered'
  | 'personalized section viewed'
  | 'personalized movie clicked'
  | 'director theaters map opened'
  | 'session intent classified'
  | 'onboarding viewed'
  | 'onboarding skipped'
  | 'onboarding completed'
  | 'add request opened'
  | 'add request submitted'
  | 'landing variant assigned'
  | 'survey shown'
  | 'survey verdict'
  | 'survey good selected'
  | 'survey submitted'
  | 'survey dismissed'
  /** 계정 — 콜백이 신규/기존을 구분해 auth_login 파라미터로 알려준다 */
  | 'signed up'
  | 'logged in'
  /** 관심 등록/해제 — fav_type: movie|director|theater, fav_label: 사람이 읽는 이름 */
  | 'favorite added'
  | 'favorite removed'
  | 'dead click'
  /** 활성 상태인데 눌러도 화면이 전혀 안 변한 클릭 — disabled만 보던 'dead click'의 사각지대.
   *  온보딩/캐러셀처럼 "핸들러는 있는데 조용히 아무 일도 안 하는" 무반응을 잡는다. */
  | 'no-op click'

export type AnalyticsSource =
  | 'direct'
  | 'map'
  | 'search'
  | 'filter'
  | 'movie_detail'
  | 'direct_link'
  | 'theater_sheet'
  | 'desktop_panel'

export type SessionIntent = 'type_a' | 'type_b' | 'type_c' | 'mixed'

/** 탭 단위 표면. source(클릭 지점)와 달리 세션 여정을 추적하는 데 쓴다. */
export type AnalyticsSurface = 'map' | 'films' | 'more' | 'other'

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined | string[]
>
