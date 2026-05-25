import type { CrawlRun } from '@/types/admin'

const WEBHOOK_URL = process.env.DISCORD_REPORT_WEBHOOK_URL

export interface NotifyPayload {
  title: string
  runs: CrawlRun[]
  durationMs: number
  matched?: number
}

export async function notifyDiscord(payload: NotifyPayload) {
  if (!WEBHOOK_URL) return

  const ok = payload.runs.filter((r) => r.status === 'completed')
  const failed = payload.runs.filter((r) => r.status === 'failed')
  const totalNew = ok.reduce((s, r) => s + r.createdCount, 0)
  const totalWarn = ok.reduce((s, r) => s + r.warningCount, 0)

  const lines: string[] = [`**${payload.title}** (${(payload.durationMs / 1000).toFixed(1)}s)`]

  for (const run of ok) {
    const badge = run.createdCount > 0 ? '✅' : '⬜'
    const warn = run.warningCount > 0 ? ` ⚠${run.warningCount}` : ''
    lines.push(`${badge} ${run.sourceName}: ${run.createdCount}개${warn}`)
  }

  for (const run of failed) {
    lines.push(`❌ ${run.sourceName}: ${run.error ?? '알 수 없는 오류'}`)
  }

  lines.push('')
  lines.push(`총 **${totalNew}개** 후보 수집${totalWarn ? ` · 경고 ${totalWarn}건` : ''}`)
  if (payload.matched !== undefined) lines.push(`자동매칭 **${payload.matched}개** 완료`)
  if (failed.length) lines.push(`수집 불가 ${failed.length}건`)

  await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: lines.join('\n') }),
  })
}
