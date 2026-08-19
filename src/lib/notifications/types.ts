/**
 * 알림(P3) 도메인 타입 — 프레임워크·DB 무관.
 * 판정은 rules.ts(순수 함수)가 하고, 저장·발송은 repository/dispatch가 맡는다.
 */

export type NotificationKind = 'new_screening' | 'last_week' | 'weekly_digest'
export type NotificationSubjectType = 'movie' | 'director' | 'theater'

/** 관심 항목 — favorites 테이블 한 행 */
export interface FavoriteRef {
  userId: string
  type: NotificationSubjectType
  id: string
}

/** 판정 입력이 되는 상영 1건 — 크롤된 showtimes를 영화×극장×날짜로 눌러 담은 것 */
export interface ScreeningFact {
  movieId: string
  movieTitle: string
  /** 감독 이름 배열 — 관심 감독 매칭에 쓴다 */
  directors: string[]
  posterUrl?: string
  theaterId: string
  theaterName: string
  /** 극장이 속한 지역 id (REGIONS) — 지역 필터 판정용 */
  regionId: string
  /** 이 영화×극장의 상영일 목록 (ISO yyyy-mm-dd, 오름차순) */
  dates: string[]
}

/** 막바지 판정 결과 — 큐레이션 쪽 LastWeekFilm을 알림용으로 좁힌 것 */
export interface LastWeekFact {
  movieId: string
  daysLeft: number
  confidence: 'confirmed' | 'likely'
}

export interface NotificationPrefs {
  userId: string
  newScreening: boolean
  lastWeek: boolean
  weeklyDigest: boolean
  /** KST 기준 "21:00" — 이 시각부터 quietEnd까지는 발송하지 않는다 */
  quietStart: string
  quietEnd: string
  channel: 'kakao' | 'none'
  /** 알림 받을 지역(REGIONS의 id). 빈 배열이면 관심 극장 지역으로 자동 추론 → 그것도 없으면 전국 */
  regionIds: string[]
}

export const DEFAULT_PREFS: Omit<NotificationPrefs, 'userId'> = {
  newScreening: true,
  lastWeek: true,
  weeklyDigest: false,
  quietStart: '21:00',
  quietEnd: '09:00',
  channel: 'kakao',
  regionIds: [],
}

/** 소식 카드 렌더에 필요한 스냅샷 — 원본 영화/극장이 지워져도 소식은 남아야 한다 */
export interface NotificationPayload {
  movieTitle: string
  directors: string[]
  posterUrl?: string
  theaterName: string
  /** 이번 소식이 가리키는 상영일 (가장 이른 날) */
  firstDate?: string
  /** 막바지일 때만 — 남은 일수 */
  daysLeft?: number
  /** 'confirmed'면 확정, 'likely'면 추정 — 카피를 다르게 쓴다 */
  confidence?: 'confirmed' | 'likely'
  /** 이 소식이 묶은 건수 — 1보다 크면 "12곳에서" / "새 작품 3편"으로 쓴다 */
  groupedCount?: number
  /** 무엇을 기준으로 묶었나 — 영화 하트/감독 하트는 'movie', 극장 하트는 'theater' */
  groupedBy?: 'movie' | 'theater'
}

export interface NotificationEvent {
  userId: string
  kind: NotificationKind
  subjectType: NotificationSubjectType
  subjectId: string
  movieId?: string
  theaterId?: string
  payload: NotificationPayload
  /** 대표 키 — 이벤트 행에 저장된다 */
  dedupeKey: string
  /** 이 이벤트가 덮는 모든 키 — 원장(notification_seen_keys)에 함께 기록해 재알림을 막는다 */
  coveredKeys: string[]
}

/** 저장된 이벤트 — 소식 탭이 읽는 형태. coveredKeys는 생성 시점 관심사라 행에는 안 남는다(원장으로 감) */
export interface StoredNotificationEvent extends Omit<NotificationEvent, 'coveredKeys'> {
  id: string
  createdAt: string
  readAt: string | null
}

export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped'
export type DeliverySkipReason =
  | 'sending_disabled'   // P3-b 단계 — 파이프라인만 돌리고 실제 발송은 껐다
  | 'quiet_hours'
  | 'no_kakao_token'
  | 'scope_missing'
  | 'prefs_off'

export interface DeliveryRecord {
  userId: string
  eventIds: string[]
  channel: 'kakao'
  status: DeliveryStatus
  skipReason?: DeliverySkipReason
  attempts: number
  error?: string
}
