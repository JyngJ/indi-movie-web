import { createHmac, timingSafeEqual } from 'node:crypto'
import { emailAnalyticsConfigured } from './analytics'

type TrackingPayload = { v: 1; id: string; kind: 'open' | 'click'; path?: string; campaign?: string; expires: number }
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
function key() { return process.env.EMAIL_NOTIFICATION_TOKEN_SECRET ?? '' }
/** 리다이렉트는 상영 탐색 경로만 허용한다. 관리·인증·외부 주소는 넣지 않는다. */
export function emailDestination(path: string): boolean {
  try {
    const url = new URL(path, 'https://email.invalid')
    return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')
      && url.origin === 'https://email.invalid' && !url.hash
      && /^\/(?:movie\/[^/]+|films(?:\/(?:theater|director)\/[^/]+)?)?$/.test(url.pathname)
      && [...url.searchParams].every(([k, v]) => k === 'tab' && v === 'theaters')
  } catch { return false }
}
export function signTrackingToken(payload: TrackingPayload): string {
  if (key().length < 32 || !uuid.test(payload.id) || (payload.kind === 'click' && (!payload.path || !emailDestination(payload.path)))) throw new Error('Invalid tracking payload')
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${createHmac('sha256', key()).update(`email-tracking:${encoded}`).digest('base64url')}`
}
export function readTrackingToken(token: string): TrackingPayload | null {
  if (key().length < 32 || token.length > 3000) return null
  const [encoded, signature, extra] = token.split('.')
  if (!encoded || !signature || extra) return null
  const expected = createHmac('sha256', key()).update(`email-tracking:${encoded}`).digest()
  const actual = Buffer.from(signature, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  try {
    const p = JSON.parse(Buffer.from(encoded, 'base64url').toString())
    return p.v === 1 && typeof p.id === 'string' && uuid.test(p.id)
      && (p.campaign === undefined || (typeof p.campaign === 'string' && /^(?:digest|\d{4}-\d{2}-\d{2})$/.test(p.campaign)))
      && Number.isFinite(p.expires) && p.expires > Date.now()
      && (p.kind === 'open' || (p.kind === 'click' && typeof p.path === 'string' && emailDestination(p.path))) ? p : null
  } catch { return null }
}
export function emailCampaignUrl(origin: string, path: string, campaign: string): string {
  if (!emailDestination(path)) throw new Error('Invalid email destination')
  const url = new URL(path, origin)
  url.searchParams.set('utm_source', 'movie_email')
  url.searchParams.set('utm_medium', 'email')
  url.searchParams.set('utm_campaign', campaign)
  return url.href
}
export function decorateDigest<T extends { html: string; text: string }>(content: T, origin: string, id: string, campaign = 'digest', now = Date.now()): T {
  if (!emailAnalyticsConfigured()) return content
  const expires = now + 365 * 86400000
  const link = (raw: string) => {
    try {
      const url = new URL(raw.replaceAll('&amp;', '&'))
      const path = url.pathname + url.search
      if (url.origin !== new URL(origin).origin || !emailDestination(path)) return raw
      return `${origin}/api/email-notifications/track?token=${signTrackingToken({ v: 1, kind: 'click', id, path, campaign, expires })}`
    } catch { return raw }
  }
  const pixel = `${origin}/api/email-notifications/track?token=${signTrackingToken({ v: 1, kind: 'open', id, campaign, expires })}`
  return { ...content,
    html: content.html.replace(/href="([^"]+)"/g, (_, href: string) => `href="${link(href)}"`)
      .replace('</body>', `<img src="${pixel}" width="1" height="1" alt="이메일 열람 확인용 이미지" aria-hidden="true" style="display:block;border:0"></body>`),
    text: content.text.replace(/https?:\/\/[^\s]+/g, link),
  }
}

/** 응답 전에 확인할 것은 서명과 목적지뿐이다. 통계는 응답 뒤에 기록한다. */
export function emailTrackingTarget(token: string, origin: string) {
  const payload = readTrackingToken(token)
  return payload ? { kind: payload.kind, ...(payload.kind === 'click'
    ? { location: emailCampaignUrl(origin, payload.path!, payload.campaign ?? 'digest') } : {}) } : null
}
