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
export function scheduleSlot(now: Date): string | null {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value
  if (!['Mon', 'Fri'].includes(get('weekday') ?? '') || Number(get('hour')) < 9 || Number(get('hour')) >= 12) return null
  return `${get('year')}-${get('month')}-${get('day')}`
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
