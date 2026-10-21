import { after } from 'next/server'
import { syncEmailSubscriberCount } from '@/lib/emailNotifications/subscriberCount'
import { randomUUID } from 'node:crypto'
import { createSupabaseAuthServerClient } from '@/lib/supabase/auth-server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { emailEnabled, getSubscription, requestVerification, siteOrigin } from '@/lib/emailNotifications/server'
export const dynamic = 'force-dynamic'
function json(value: unknown, status = 200) { return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } }) }
async function currentUser() {
  const { data, error } = await (await createSupabaseAuthServerClient()).auth.getUser()
  return error ? null : data.user
}
export async function GET() {
  if (!emailEnabled()) return json({ enabled: false, subscription: null })
  const user = await currentUser()
  if (!user) return json({ error: '로그인 후 다시 시도해 주세요' }, 401)
  try { return json({ enabled: true, subscription: await getSubscription(user.id) }) }
  catch { return json({ error: '설정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' }, 503) }
}
export async function POST(request: Request) {
  if (!emailEnabled()) return json({ error: '이메일 소식을 준비하고 있어요' }, 503)
  if (request.headers.get('origin') !== siteOrigin()) return json({ error: '다시 시도해 주세요' }, 403)
  const user = await currentUser()
  if (!user) return json({ error: '로그인 후 다시 시도해 주세요' }, 401)
  try {
    const body = await request.json()
    const db = createSupabaseAdminClient()
    if (body.action === 'register' && body.consent === true) {
      await requestVerification(user.id, body.email)
    } else if (body.action === 'dismiss') {
      // 이미 등록된 주소나 구독을 덮어쓰지 않는다.
      const existing = await getSubscription(user.id)
      const result = existing
        ? await db.from('email_notification_subscriptions').update({ prompt_dismissed: true }).eq('user_id', user.id)
        : await db.from('email_notification_subscriptions').upsert({ user_id: user.id, prompt_dismissed: true }, { onConflict: 'user_id', ignoreDuplicates: true })
      if (result.error) throw result.error
    } else if (body.action === 'unsubscribe') {
      const { error } = await db.from('email_notification_subscriptions').update({ status: 'unsubscribed', revision: randomUUID(), prompt_dismissed: true, verification_hash: null, verification_expires_at: null, revoked_at: new Date().toISOString() }).eq('user_id', user.id)
      if (error) throw error
    } else return json({ error: '입력 내용을 다시 확인해 주세요' }, 400)
    after(async () => { await syncEmailSubscriberCount() })
    return json({ enabled: true, subscription: await getSubscription(user.id) })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    return json({ error: code === 'cooldown' ? '5분 뒤 다시 요청해 주세요' : code === 'invalid_email' ? '이메일 주소를 다시 확인해 주세요' : '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.' }, code === 'cooldown' ? 429 : 400)
  }
}
