/**
 * 알림 저장소 경계 — 도메인/유스케이스는 이 인터페이스만 안다.
 * 배치(service role)와 브라우저(RLS) 구현이 따로 있다.
 */

import type {
  DeliveryRecord, FavoriteRef, LastWeekFact, NotificationEvent, NotificationPrefs,
  ScreeningFact, StoredNotificationEvent,
} from './types'

/** 배치(크론)용 — 전체 사용자를 훑는다 */
export interface NotificationBatchRepository {
  /** 모든 사용자의 관심 목록 */
  listAllFavorites(): Promise<FavoriteRef[]>
  /** 설정 — 행이 없는 사용자는 기본값으로 채워서 돌려준다 */
  listPrefs(userIds: string[]): Promise<Map<string, NotificationPrefs>>
  /** 지금 상영 중(앞으로 예정 포함)인 영화×극장 사실 */
  listScreeningFacts(fromDate: string, toDate: string): Promise<ScreeningFact[]>
  /** 막바지 판정 재료 */
  listLastWeekFacts(): Promise<LastWeekFact[]>
  /** 이미 만든 dedupeKey — 사용자별 */
  listSeenDedupeKeys(userIds: string[]): Promise<Map<string, Set<string>>>
  /** 이벤트 저장. dedupe 충돌은 무시하고 실제 저장된 것만 돌려준다 */
  insertEvents(events: NotificationEvent[]): Promise<StoredNotificationEvent[]>
  /** 발송 이력 기록 */
  insertDelivery(record: DeliveryRecord): Promise<void>
}

/** 브라우저용 — 소식 탭·알림 설정 */
export interface NotificationClientRepository {
  listEvents(limit: number): Promise<StoredNotificationEvent[]>
  markAllRead(): Promise<void>
  getPrefs(): Promise<NotificationPrefs>
  savePrefs(patch: Partial<Omit<NotificationPrefs, 'userId'>>): Promise<NotificationPrefs>
}
