/** 이메일 알림 정책. 프레임워크·저장소·발송 업체와 독립적이다. */
export const EMAIL_SCHEDULE_LABEL = '월·금 오전 9시'
export const EMAIL_CONSENT_VERSION = '2026-10-19'
export type FrequencyFeedback = 'more' | 'same' | 'less'
export const FREQUENCY_FEEDBACK_OPTIONS: { value: FrequencyFeedback; label: string }[] = [
  { value: 'more', label: '더 자주' },
  { value: 'same', label: '지금 정도' },
  { value: 'less', label: '더 가끔' },
]
export interface EmailSubscription {
  user_id: string
  email: string | null
  status: 'declined' | 'pending' | 'active' | 'unsubscribed' | 'suppressed'
  prompt_dismissed: boolean
  revision: string
  subscribed_at: string | null
  sent_count: number
  frequency_feedback: FrequencyFeedback | null
}
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  return email.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(email) ? email : null
}
/**
 * 발송 창(한국 시간, 끝 시각 미포함). 목표는 09시지만 GitHub 예약이 몇 시간씩 늦어서
 * 창을 저녁까지 연다 — 2026-10-23 09:00 예약이 16:25에야 돌았고, 10-26 예약 셋은
 * 12시 전에 하나도 오지 않아 오전 창(9~12시)이면 그날 발송을 통째로 놓쳤다.
 * 22시 이후엔 밤 알림이 되므로 다음 발송일을 기다린다.
 */
export const EMAIL_SEND_WINDOW_KST = { startHour: 9, endHour: 22 } as const

export function scheduleSlot(now: Date): string | null {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value
  if (!['Mon', 'Fri'].includes(get('weekday') ?? '') || Number(get('hour')) < EMAIL_SEND_WINDOW_KST.startHour || Number(get('hour')) >= EMAIL_SEND_WINDOW_KST.endHour) return null
  return `${get('year')}-${get('month')}-${get('day')}`
}
/** 다음 발송일. 오늘이 월·금이고 발송 창이 아직 안 닫혔으면 오늘, 아니면 다음 월·금. */
export function nextScheduleSlot(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  const day = new Date(Date.UTC(get('year'), get('month') - 1, get('day')))
  if (get('hour') >= EMAIL_SEND_WINDOW_KST.endHour) day.setUTCDate(day.getUTCDate() + 1)
  while (![1, 5].includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate() + 1)
  return day.toISOString().slice(0, 10)
}
/** TODO: 이용자가 충분히 모이면 일괄 빈도 설문을 기획한다.
 * 3번째 발송 자동 설문은 보류한다. 의견 화면·저장 기능은 재사용을 위해 유지한다.
 * 이전 조건: successfulCount === 2. 발송 횟수로 다시 자동 활성화하지 않는다.
 */
export function shouldAskFrequency(_successfulCount: number): boolean { return false }
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export const EMAIL_DIGEST_TITLE = '관심 영화·감독·극장의 상영 소식'
export interface EmailFilm {
  title: string
  description: string
  path: string
  posterUrl?: string
  directors?: string[]
}
export interface EmailDigestItem extends EmailFilm {
  eventIds: string[]
  groupType?: 'movie' | 'director' | 'theater'
  groupName?: string
  groupPath?: string
  films?: EmailFilm[]
}

/** 실제로 메일에 실린 관심 소식만 제목에 쓴다. 유형별 대표 소식 하나씩 최대 3개. */
export function buildEmailDigestSubject(items: EmailDigestItem[]): string {
  const clauses: string[] = []
  const movie = items.find(item => !item.groupType || item.groupType === 'movie')
  const director = items.find(item => item.groupType === 'director' && item.groupName)
  const theater = items.find(item => item.groupType === 'theater' && item.groupName)
  if (movie) clauses.push(`${movie.title} 상영해요`)
  if (director) clauses.push(`${director.groupName}의 영화가 상영해요`)
  if (theater) clauses.push(`${theater.groupName}에서 ${theater.films?.[0]?.title ?? theater.title} 상영해요`)
  return clauses.length ? `🎬 ${clauses.join(', ')}` : EMAIL_DIGEST_TITLE
}
