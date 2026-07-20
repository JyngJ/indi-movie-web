import { surveyGoodPointLabel } from './types'

function surveyWebhookUrl() {
  return process.env.DISCORD_REPORT_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL
}

/** 재방문자 설문 응답을 디스코드로 알림 (운영자 확인용). 실패는 무시. */
export async function notifySurveyToDiscord(
  goodPoints: string[],
  etcText?: string | null,
  improvement?: string | null,
) {
  const url = surveyWebhookUrl()
  if (!url) return

  const labels = goodPoints
    .map((g) => (g === 'etc' && etcText?.trim() ? `기타: ${etcText.trim()}` : surveyGoodPointLabel(g)))
    .join('\n')

  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: '👍 좋은 점', value: labels || '-', inline: false },
  ]
  if (improvement?.trim()) {
    fields.push({ name: '🔧 개선할 점', value: improvement.trim().slice(0, 900), inline: false })
  }

  await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: '📝 재방문자 설문',
          color: 0x5b8def,
          fields,
          footer: { text: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) },
        },
      ],
    }),
  }).catch(() => {})
}
