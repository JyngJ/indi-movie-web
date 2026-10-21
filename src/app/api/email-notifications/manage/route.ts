import { after } from 'next/server'
import { syncEmailSubscriberCount } from '@/lib/emailNotifications/subscriberCount'
import { randomUUID } from 'node:crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { readManagementToken, tokenHash } from '@/lib/emailNotifications/tokens'
import { siteOrigin } from '@/lib/emailNotifications/server'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  // GET은 상태를 바꾸지 않는다. 메일 보안 스캐너가 링크를 열어도 인증·해지가 실행되지 않는다.
  const url = new URL(request.url)
  const isOneClick = request.headers.get('content-type')?.includes('application/x-www-form-urlencoded')
  const body = isOneClick ? Object.fromEntries(await request.formData()) : await request.json().catch(() => ({}))
  const token = isOneClick ? url.searchParams.get('token') : body.token
  const action = isOneClick ? 'unsubscribe' : body.action
  if (!isOneClick && request.headers.get('origin') !== siteOrigin()) return Response.json({ error: '다시 시도해 주세요' }, { status: 403 })
  if (isOneClick && body['List-Unsubscribe'] !== 'One-Click') return new Response(null, { status: 400 })
  if (!['verify', 'unsubscribe', 'frequency'].includes(action)) return new Response(null, { status: 400 })
  if (typeof token !== 'string' || token.length > 2000) return Response.json({ error: '링크를 다시 확인해 주세요' }, { status: 400 })
  try {
    const db = createSupabaseAdminClient()
    if (action === 'verify') {
      const { data, error } = await db.rpc('verify_email_notification', { p_hash: tokenHash(token) })
      if (error) throw error
      if (!data) return Response.json({ error: '링크가 만료됐어요. 알림 설정에서 다시 요청해 주세요.' }, { status: 400 })
    } else {
      const payload = readManagementToken(token)
      if (!payload || payload.purpose !== (action === 'unsubscribe' ? 'unsubscribe' : 'frequency')) throw new Error('Invalid token')
      if (action !== 'unsubscribe' && !['more', 'same', 'less'].includes(body.choice)) throw new Error('Invalid choice')
      const patch = action === 'unsubscribe'
        ? { status: 'unsubscribed', revision: randomUUID(), prompt_dismissed: true, verification_hash: null, verification_expires_at: null, revoked_at: new Date().toISOString() }
        : { frequency_feedback: body.choice, frequency_feedback_at: new Date().toISOString() }
      const { data, error } = await db.from('email_notification_subscriptions').update(patch)
        .eq('user_id', payload.userId).eq('revision', payload.revision).eq('status', 'active').select('user_id')
      if (error) throw error
      if (!data?.length) throw new Error('Expired token')
    }
    after(async () => { await syncEmailSubscriberCount() })
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return Response.json({ error: '링크를 사용하지 못했어요. 알림 설정에서 다시 시도해 주세요.' }, { status: 400 }) }
}
