import type { CrawlRun } from '@/types/admin'

const WEBHOOK_URL = process.env.DISCORD_REPORT_WEBHOOK_URL

export interface NotifyPayload {
  title: string
  runs: CrawlRun[]
  durationMs: number
  matched?: number
}

export async function notifyDiscordStart(title: string) {
  if (!WEBHOOK_URL) return
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: `⏳ ${title} 시작`,
        description: `수집을 시작합니다.`,
        color: 0x3498DB,
        footer: { text: now },
      }],
    }),
  })
}

export async function notifyDiscord(payload: NotifyPayload) {
  if (!WEBHOOK_URL) return

  const ok = payload.runs.filter((r) => r.status === 'completed')
  const failed = payload.runs.filter((r) => r.status === 'failed')
  const totalNew = ok.reduce((s, r) => s + r.createdCount, 0)
  const totalWarn = ok.reduce((s, r) => s + r.warningCount, 0)
  const secs = (payload.durationMs / 1000).toFixed(1)

  const color = failed.length === payload.runs.length ? 0xE74C3C  // 전부 실패 → 빨강
    : failed.length > 0 ? 0xF39C12                                // 일부 실패 → 주황
    : 0x2ECC71                                                     // 전부 성공 → 초록

  // 수집량 많은 순 정렬, 상위 10개만
  const topOk = [...ok]
    .filter((r) => r.createdCount > 0)
    .sort((a, b) => b.createdCount - a.createdCount)
    .slice(0, 10)

  const theaterLines = topOk
    .map((r) => {
      const warn = r.warningCount > 0 ? ` ⚠️${r.warningCount}` : ''
      return `\`${r.createdCount.toString().padStart(3)}개\` ${r.sourceName}${warn}`
    })
    .join('\n')

  const zeroOk = ok.filter((r) => r.createdCount === 0)
  const zeroLine = zeroOk.length > 0
    ? `\n\`  0개\` ${zeroOk.map((r) => r.sourceName).join(', ')}`
    : ''

  const failedLine = failed.length > 0
    ? failed.map((r) => {
        const err = r.error ? `\n  \`${r.error.slice(0, 120)}\`` : ''
        return `• ${r.sourceName}${err}`
      }).join('\n')
    : null

  const fields = [
    {
      name: `🎬 수집 결과 (${ok.filter((r) => r.createdCount > 0).length}개 소스)`,
      value: (theaterLines + zeroLine) || '없음',
      inline: false,
    },
  ]

  if (failedLine) {
    fields.push({
      name: `⚠️ 수집 불가 (${failed.length}건)`,
      value: failedLine,
      inline: false,
    })
  }

  const summary = [
    `**후보** ${totalNew.toLocaleString()}개`,
    payload.matched !== undefined ? `**매칭** ${payload.matched.toLocaleString()}개` : null,
    totalWarn > 0 ? `**경고** ${totalWarn}건` : null,
    `**소요** ${secs}s`,
  ].filter(Boolean).join('　·　')

  const embed = {
    title: payload.title,
    description: summary,
    color,
    fields,
    footer: { text: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) },
  }

  await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  })
}
