export interface EmailBatchReport { sent: number; failed: number; unknown: number }
/** 이번 실행에서 새로 보낸 사람이 있을 때만 보고한다. 재실행의 sent=0은 알리지 않는다. */
export async function reportEmailDelivery(result: EmailBatchReport, now = new Date()): Promise<void> {
  if (!result.sent) return
  const webhook = process.env.DISCORD_REPORT_WEBHOOK_URL
  if (!webhook) throw new Error('Email report webhook missing')
  const date = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(now)
  const title = result.failed || result.unknown ? '메일 일부 발송 완료' : '메일 발송 완료'
  const details = [`${title} · ${result.sent}명에게 보냈어요`, `이번 실행 · ${date}`]
  if (result.failed) details.push(`발송 실패 ${result.failed}명`)
  if (result.unknown) details.push(`결과 확인 필요 ${result.unknown}명`)
  const response = await fetch(webhook, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: details.join('\n'), allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('Email report failed')
}
