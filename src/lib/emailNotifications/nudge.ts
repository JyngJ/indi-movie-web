import type { DigestItem } from './digest'
import { renderNudgeEmail } from './templates'

/**
 * 관심 영화·감독·극장이 하나도 없는 구독자에게 보내는 안내. 관심이 없으면 소식이 생기지 않아
 * 구독해도 메일이 한 통도 오지 않았다. 동의 범위가 "관심 상영 소식"이라 추천 메일을 계속
 * 보내지 않고, 계정당 최대 3통 — 구독 3일 뒤, 그 뒤 14일·28일 간격 — 에서 멈춘다.
 */
export const NUDGE_GAP_DAYS = [3, 14, 28] as const
export const EMAIL_NUDGE_SUBJECT = '관심 영화를 골라 두면 상영 소식을 보내 드려요'

const kstDate = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(iso))
function addDays(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() + days)
  return day.toISOString().slice(0, 10)
}

/**
 * 직전 안내와 구독 시각 중 늦은 쪽에서 간격을 잰다 — 다시 구독한 사람에게 바로 보내지 않는다.
 * 날짜 단위로 비교한다. 발송이 월·금 낮 아무 때나 돌아서 시각까지 따지면 한 회차씩 밀린다.
 */
export function nudgeDue(input: { slot: string; subscribedAt: string; favoriteCount: number; previousNudges: string[] }): boolean {
  const { slot, subscribedAt, favoriteCount, previousNudges } = input
  if (favoriteCount > 0 || previousNudges.length >= NUDGE_GAP_DAYS.length) return false
  const base = [subscribedAt, ...previousNudges].map(kstDate).sort().at(-1)!
  return slot >= addDays(base, NUDGE_GAP_DAYS[previousNudges.length])
}

export function renderNudge(input: { recommendations: DigestItem[]; origin: string; unsubscribeUrl: string }) {
  const { recommendations, origin, unsubscribeUrl } = input
  const text = [EMAIL_NUDGE_SUBJECT,
    '관심 영화·감독·극장이 없어서 보낼 소식이 없었어요. 상영작에서 관심 등록을 해 두면 새 상영과 막바지 상영을 모아 월·금 오전 9시에 보내 드려요.',
    ...(recommendations.length ? ['이번 주 이런 상영도 있어요', ...recommendations.map(i => `${i.title}\n${i.description}\n예매하러 가기: ${origin}${i.path}`)] : []),
    `관심 영화 고르러 가기: ${origin}/films`,
    `상영 소식 수신에 동의한 주소로 보냈어요. 관심 영화가 없는 동안 이 안내는 최대 ${NUDGE_GAP_DAYS.length}번만 보내요.`, `이메일 소식 그만 받기: ${unsubscribeUrl}`].join('\n\n')
  return { subject: EMAIL_NUDGE_SUBJECT, text, html: renderNudgeEmail({ origin, recommendations, unsubscribeUrl, limit: NUDGE_GAP_DAYS.length }) }
}
