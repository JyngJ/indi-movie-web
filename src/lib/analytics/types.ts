export type AnalyticsEventName =
  | 'search opened'
  | 'search performed'
  | 'search no results'
  | 'search result selected'
  | 'map viewed'
  | 'map filter changed'
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
  | 'dead click'

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
