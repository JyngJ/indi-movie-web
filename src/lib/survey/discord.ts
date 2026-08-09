import { surveyBadPointLabel, surveyGoodPointLabel, type SurveyVerdict } from './types'

function surveyWebhookUrl() {
  return process.env.DISCORD_REPORT_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL
}

/** 재방문자 설문 응답을 디스코드로 알림 (운영자 확인용). 실패는 무시. */
export async function notifySurveyToDiscord(
  verdict: SurveyVerdict,
  goodPoints: string[],
  badPoints: string[],
  etcText?: string | null,
  movieMissingText?: string | null,
) {
  const url = surveyWebhookUrl()
  if (!url) return

  const fields: { name: string; value: string; inline: boolean }[] = []
  if (verdict === 'good') {
    const labels = goodPoints
      .map((g) => (g === 'etc' && etcText?.trim() ? `기타: ${etcText.trim()}` : surveyGoodPointLabel(g)))
      .join('\n')
    fields.push({ name: '👍 좋은 점', value: labels || '-', inline: false })
  } else {
    const labels = badPoints
      .map((b) => {
        if (b === 'etc' && etcText?.trim()) return `기타: ${etcText.trim()}`
        if (b === 'movie_missing' && movieMissingText?.trim()) return `찾는 영화 없음: ${movieMissingText.trim()}`
        return surveyBadPointLabel(b)
      })
      .join('\n')
    fields.push({ name: '👎 아쉬운 점', value: labels || '-', inline: false })
  }

  await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: verdict === 'good' ? '📝 재방문자 설문 — 좋아요' : '📝 재방문자 설문 — 아쉬워요',
          color: verdict === 'good' ? 0x2ECC71 : 0xF39C12,
          fields,
          footer: { text: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) },
        },
      ],
    }),
  }).catch(() => {})
}
