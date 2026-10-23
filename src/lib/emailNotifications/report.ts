export interface EmailBatchReport {
  /** 수신 중인 구독자 수 */
  considered?: number
  /** 그중 보낼 새 소식이 있던 사람 수 */
  ready?: number
  sent: number
  failed: number
  unknown: number
}

/* 크롤 리포트(notify-discord)와 같은 색 */
const COLOR = { ok: 0x2ECC71, partial: 0xF39C12, failed: 0xE74C3C } as const

interface DiscordEmbed {
  title: string
  description: string
  color: number
  fields: { name: string; value: string; inline: boolean }[]
  footer: { text: string }
}

/** "10월 23일 (금) 10:56" — UI Writing의 날짜·시간 표기 */
function kstStamp(now: Date): string {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('month')}월 ${get('day')}일 (${get('weekday')}) ${get('hour')}:${get('minute')}`
}

/**
 * 발송 결과를 Discord 카드 한 장으로 만든다. 알릴 게 없으면(재실행이라 새로 보낸 사람도,
 * 실패도 없음) null.
 *
 * 2026-10-23 첫 발송 때 평문 두 줄("2명에게 보냈어요")만 와서, 구독자 4명 중 왜 2명인지
 * 알 수 없었다. 수신 중 → 소식 있음 → 보냄을 나란히 두고 건너뛴 이유를 적는다.
 * 예전엔 1명이라도 보냈을 때만 보고해서, 전원 실패·결과 불명이면 아무 알림도 없었다.
 */
export function buildEmailReportEmbed(result: EmailBatchReport, now = new Date()): DiscordEmbed | null {
  const { sent, failed, unknown } = result
  if (!sent && !failed && !unknown) return null

  const trouble = failed + unknown
  const title = !sent ? '⚠️ 소식 메일을 보내지 못했어요'
    : trouble ? '📬 소식 메일을 일부만 보냈어요'
    : '📬 소식 메일을 보냈어요'
  const color = !sent ? COLOR.failed : trouble ? COLOR.partial : COLOR.ok

  const lines: string[] = []
  if (sent) lines.push(`**${sent}명**에게 보냈어요`)
  const skipped = result.considered != null && result.ready != null ? result.considered - result.ready : 0
  if (skipped > 0) lines.push(`새 소식이 없는 ${skipped}명은 건너뛰었어요`)
  if (unknown) lines.push(`결과를 알 수 없는 ${unknown}명은 다시 보내지 않아요 — Gmail 보낸편지함에서 확인해 주세요`)
  if (failed) lines.push(`보내지 못한 ${failed}명은 다음 실행에서 다시 시도해요`)

  const fields: DiscordEmbed['fields'] = []
  if (result.considered != null) fields.push({ name: '수신 중', value: `${result.considered}명`, inline: true })
  if (result.ready != null) fields.push({ name: '소식 있음', value: `${result.ready}명`, inline: true })
  fields.push({ name: '보냄', value: `${sent}명`, inline: true })
  if (failed) fields.push({ name: '실패', value: `${failed}명`, inline: true })
  if (unknown) fields.push({ name: '확인 필요', value: `${unknown}명`, inline: true })

  return { title, description: lines.join('\n'), color, fields, footer: { text: kstStamp(now) } }
}

export async function reportEmailDelivery(result: EmailBatchReport, now = new Date()): Promise<void> {
  const embed = buildEmailReportEmbed(result, now)
  if (!embed) return
  const webhook = process.env.DISCORD_REPORT_WEBHOOK_URL
  if (!webhook) throw new Error('Email report webhook missing')
  const response = await fetch(webhook, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('Email report failed')
}
