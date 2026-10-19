import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { EMAIL_CONSENT_VERSION, normalizeEmail, type EmailSubscription } from './domain'
import { renderVerificationEmail } from './templates'
import { gmailConfigured, sendGmail } from './gmail'
import { tokenHash, verificationToken } from './tokens'
export function emailEnabled() { return process.env.NEXT_PUBLIC_EMAIL_NOTIFICATIONS_ENABLED === 'true' && gmailConfigured() && (process.env.EMAIL_NOTIFICATION_TOKEN_SECRET?.length ?? 0) >= 32 }
export function siteOrigin() {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com')
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('HTTPS site URL required')
  return url.origin
}
export async function getSubscription(userId: string): Promise<EmailSubscription | null> {
  const { data, error } = await createSupabaseAdminClient().from('email_notification_subscriptions')
    .select('user_id,email,status,prompt_dismissed,revision,subscribed_at,sent_count,frequency_feedback').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data
}
export async function requestVerification(userId: string, raw: unknown) {
  const email = normalizeEmail(raw)
  if (!email) throw new Error('invalid_email')
  const token = verificationToken()
  const { data, error } = await createSupabaseAdminClient().rpc('request_email_notification_verification', {
    p_user: userId, p_email: email, p_hash: tokenHash(token), p_consent: EMAIL_CONSENT_VERSION,
  })
  if (error) throw error
  if (!data) throw new Error('cooldown')
  const url = `${siteOrigin()}/email/manage?action=verify&token=${encodeURIComponent(token)}`
  await sendGmail({ to: email, subject: '영화볼지도 소식 받을 이메일을 인증해 주세요', messageId: `verify-${tokenHash(token)}`,
    text: `새 소식이 있을 때 월·금 오전 9시에 보내 드려요. 아래 링크에서 이메일 인증을 마쳐 주세요. 링크는 1시간 동안 사용할 수 있어요.\n${url}\n요청하지 않았다면 이 메일을 무시해 주세요.`,
    html: renderVerificationEmail(siteOrigin(), url),
  })
}
