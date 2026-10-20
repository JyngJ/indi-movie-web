import { after } from 'next/server'
import { formatVisitRef } from '@/lib/analytics/visitRef'
import { emailTrackingTarget } from '@/lib/emailNotifications/tracking'
import { siteOrigin } from '@/lib/emailNotifications/server'
import { resolveEmailTracking } from '@/lib/emailNotifications/trackingServer'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow, noarchive' }
const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const origin = siteOrigin()
  const result = emailTrackingTarget(token, origin)
  if (!result) return new Response(null, { status: 404, headers })
  after(async () => { await resolveEmailTracking(token, origin) })
  if (result.kind === 'click') {
    const campaign = new URL(result.location!).searchParams.get('utm_campaign')!
    const response = new Response(null, { status: 302, headers: { ...headers, Location: result.location! } })
    const secure = origin.startsWith('https:') ? '; Secure' : ''
    response.headers.append('Set-Cookie', `email_campaign=${formatVisitRef(campaign, Date.now())}; Path=/; Max-Age=1800; SameSite=Lax${secure}`)
    response.headers.append('Set-Cookie', `email_entry=1; Path=/; Max-Age=60; SameSite=Lax${secure}`)
    return response
  }
  return new Response(pixel, { headers: { ...headers, 'Content-Type': 'image/gif' } })
}
// 링크 미리보기의 HEAD는 열람·클릭으로 기록하지 않는다.
export async function HEAD() { return new Response(null, { headers }) }
