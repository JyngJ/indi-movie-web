import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
export function tokenHash(raw: string) { return createHash('sha256').update(raw).digest('hex') }
export function verificationToken() { return randomBytes(32).toString('base64url') }
type Payload = { userId: string; revision: string; purpose: 'unsubscribe' | 'frequency'; expires: number }
function secret() {
  const value = process.env.EMAIL_NOTIFICATION_TOKEN_SECRET
  if (!value || value.length < 32) throw new Error('Email token secret is missing')
  return value
}
export function signManagementToken(payload: Payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${createHmac('sha256', secret()).update(encoded).digest('base64url')}`
}
export function readManagementToken(token: string): Payload | null {
  if (token.length > 2000) return null
  const [encoded, signature, extra] = token.split('.')
  if (!encoded || !signature || extra) return null
  const expected = createHmac('sha256', secret()).update(encoded).digest()
  const actual = Buffer.from(signature, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  try {
    const p = JSON.parse(Buffer.from(encoded, 'base64url').toString())
    return typeof p.userId === 'string' && typeof p.revision === 'string' && ['unsubscribe', 'frequency'].includes(p.purpose) && Number.isFinite(p.expires) && p.expires > Date.now() ? p : null
  } catch { return null }
}
