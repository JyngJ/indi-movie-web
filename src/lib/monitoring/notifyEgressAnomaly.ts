import type { EgressAnomalyResult } from './checkEgressAnomaly'

const WEBHOOK_URL = process.env.DISCORD_REPORT_WEBHOOK_URL

function nowKST() {
  return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export async function notifyEgressAnomaly(result: EgressAnomalyResult) {
  if (!WEBHOOK_URL || result.anomalies.length === 0) return

  const lines = result.anomalies.map((a) => `${a.method} ${a.path} — ${a.cnt.toLocaleString()}건`)

  const embed = {
    title: '🚨 Supabase 요청 스파이크 감지',
    description: `최근 ${result.windowHours}시간 동안 비정상적으로 많은 REST 요청이 발생했습니다.`,
    color: 0xE74C3C,
    fields: [
      { name: '스파이크 경로', value: lines.join('\n').slice(0, 1000) || '(없음)' },
    ],
    footer: { text: nowKST() },
  }

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  })
  if (!res.ok) {
    console.error(`Discord webhook 실패 ${res.status}: ${await res.text().catch(() => '')}`)
  }
}