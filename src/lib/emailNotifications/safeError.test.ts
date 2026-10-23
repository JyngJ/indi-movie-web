import { describe, expect, it } from 'vitest'
import { MailSendError } from './gmail'
import { safeErrorSummary } from './safeError'

describe('safeErrorSummary', () => {
  it('DB 에러는 코드와 메시지를 남기고 details는 버린다', () => {
    const pg = { code: '42P01', message: 'relation "public.email_notification_deliveries" does not exist', details: 'Key (email)=(a@b.com)', hint: null }
    expect(safeErrorSummary(pg)).toEqual({ kind: 'db', code: '42P01', message: 'relation "public.email_notification_deliveries" does not exist' })
  })

  it('PostgREST 고유 코드도 DB 에러로 본다', () => {
    expect(safeErrorSummary({ code: 'PGRST205', message: 'Could not find the table' }).kind).toBe('db')
  })

  it('메일 실패는 종류만 남긴다', () => {
    expect(safeErrorSummary(new MailSendError(true))).toEqual({ kind: 'mail', message: 'mail_result_unknown' })
  })

  it('메시지 속 주소와 토큰처럼 보이는 문자열은 가린다', () => {
    const out = safeErrorSummary(new Error('send to someone@example.com failed with eyJhbGciOiJIUzI1NiJ9abcdefghijklmnopqrstu'))
    expect(out.message).not.toContain('someone@example.com')
    expect(out.message).not.toContain('eyJhbGci')
    expect(out).toMatchObject({ kind: 'error', code: 'Error' })
  })

  it('객체가 아니면 알 수 없음으로', () => {
    expect(safeErrorSummary('boom')).toEqual({ kind: 'unknown' })
  })
})
