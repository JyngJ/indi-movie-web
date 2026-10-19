/** Gmail 전송 어댑터. 전송 요청 뒤 응답이 불확실하면 자동 재전송하지 않는다. */
export interface EmailMessage { to: string; subject: string; text: string; html: string; messageId: string; unsubscribeUrl?: string }
export class MailSendError extends Error {
  constructor(public readonly uncertain: boolean) { super(uncertain ? 'mail_result_unknown' : 'mail_rejected') }
}
export function gmailConfigured() {
  return ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'].every(key => Boolean(process.env[key]))
}
function mime(message: EmailMessage) {
  const from = 'indi.movie.map@gmail.com'
  if (/[\r\n]/.test(message.to + message.messageId)) throw new Error('Invalid mail header')
  const boundary = `movie-${message.messageId.replace(/[^a-z0-9]/gi, '')}`
  const encoded = (value: string) => Buffer.from(value).toString('base64').match(/.{1,76}/g)?.join('\r\n') ?? ''
  return [
    `From: =?UTF-8?B?${Buffer.from('영화볼지도').toString('base64')}?= <${from}>`, `To: ${message.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(message.subject).toString('base64')}?=`,
    `Message-ID: <${message.messageId}@movie-notifications.local>`, `Date: ${new Date().toUTCString()}`, 'MIME-Version: 1.0',
    ...(message.unsubscribeUrl ? [`List-Unsubscribe: <${message.unsubscribeUrl}>`, 'List-Unsubscribe-Post: List-Unsubscribe=One-Click'] : []),
    `Content-Type: multipart/alternative; boundary="${boundary}"`, '',
    `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', encoded(message.text),
    `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', encoded(message.html), `--${boundary}--`, '',
  ].join('\r\n')
}
export async function sendGmail(message: EmailMessage): Promise<string> {
  if (!gmailConfigured()) throw new MailSendError(false)
  let tokenResponse: Response
  try { tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', body: new URLSearchParams({ client_id: process.env.GMAIL_CLIENT_ID!, client_secret: process.env.GMAIL_CLIENT_SECRET!, refresh_token: process.env.GMAIL_REFRESH_TOKEN!, grant_type: 'refresh_token' }),
    signal: AbortSignal.timeout(15000),
  }) } catch { throw new MailSendError(false) }
  if (!tokenResponse.ok) throw new MailSendError(false)
  const token = await tokenResponse.json().catch(() => { throw new MailSendError(false) })
  if (!token.access_token) throw new MailSendError(false)
  let response: Response
  try {
    response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: Buffer.from(mime(message)).toString('base64url') }), signal: AbortSignal.timeout(20000),
    })
  } catch { throw new MailSendError(true) }
  if (!response.ok) throw new MailSendError(response.status >= 500)
  try {
    const result = await response.json()
    if (!result.id) throw new Error('Missing message id')
    return result.id
  } catch { throw new MailSendError(true) }
}
