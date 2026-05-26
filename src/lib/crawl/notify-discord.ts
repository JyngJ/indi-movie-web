import type { CrawlRun } from '@/types/admin'

const WEBHOOK_URL = process.env.DISCORD_REPORT_WEBHOOK_URL
const FIELD_LIMIT = 900

export interface NotifyPayload {
  title: string
  runs: CrawlRun[]
  durationMs: number
}

async function sendEmbed(embed: object) {
  if (!WEBHOOK_URL) return
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`Discord webhook 실패 ${res.status}: ${body.slice(0, 200)}`)
  }
}

function nowKST() {
  return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

function chunkLines(lines: string[], limit = FIELD_LIMIT): string[] {
  const chunks: string[] = []
  let current = ''
  for (const line of lines) {
    const added = current ? `${current}\n${line}` : line
    if (added.length > limit) {
      if (current) chunks.push(current)
      current = line
    } else {
      current = added
    }
  }
  if (current) chunks.push(current)
  return chunks
}

export async function notifyDiscordStart(title: string) {
  await sendEmbed({
    title: `⏳ ${title} 시작`,
    description: '수집을 시작합니다.',
    color: 0x3498DB,
    footer: { text: nowKST() },
  })
}

export async function notifyDiscord(payload: NotifyPayload) {
  const ok = payload.runs.filter((r) => r.status === 'completed')
  const failed = payload.runs.filter((r) => r.status === 'failed')
  const totalNew = ok.reduce((s, r) => s + r.createdCount, 0)
  const totalWarn = ok.reduce((s, r) => s + r.warningCount, 0)
  const secs = (payload.durationMs / 1000).toFixed(1)

  const color = failed.length === payload.runs.length ? 0xE74C3C
    : failed.length > 0 ? 0xF39C12
    : 0x2ECC71

  const summary = [
    `**후보** ${totalNew.toLocaleString()}개`,
    totalWarn > 0 ? `**경고** ${totalWarn}건` : null,
    `**소요** ${secs}s`,
  ].filter(Boolean).join('　·　')

  const okLines = [...ok]
    .sort((a, b) => b.createdCount - a.createdCount)
    .map((r) => {
      const warn = r.warningCount > 0 ? ` ⚠️${r.warningCount}` : ''
      const cnt = r.createdCount.toString().padStart(3)
      return `\`${cnt}개\` ${r.sourceName}${warn}`
    })

  const failedLines = failed.map((r) => {
    const err = r.error ? ` \`${r.error.slice(0, 80)}\`` : ''
    return `• ${r.sourceName}${err}`
  })

  const fields: { name: string; value: string; inline: boolean }[] = []

  const okChunks = chunkLines(okLines)
  okChunks.forEach((chunk, i) => {
    const label = okChunks.length > 1
      ? `✅ 성공 (${ok.length}개) [${i + 1}/${okChunks.length}]`
      : `✅ 성공 (${ok.length}개)`
    fields.push({ name: label, value: chunk || '없음', inline: false })
  })

  if (failedLines.length > 0) {
    const failChunks = chunkLines(failedLines)
    failChunks.forEach((chunk, i) => {
      const label = failChunks.length > 1
        ? `⚠️ 실패 (${failed.length}건) [${i + 1}/${failChunks.length}]`
        : `⚠️ 실패 (${failed.length}건)`
      fields.push({ name: label, value: chunk, inline: false })
    })
  }

  // Discord: max 25 fields per embed — split into multiple messages if needed
  const FIELD_BATCH = 24
  for (let i = 0; i < fields.length; i += FIELD_BATCH) {
    const batch = fields.slice(i, i + FIELD_BATCH)
    const isFirst = i === 0
    await sendEmbed({
      title: isFirst ? payload.title : `${payload.title} (계속)`,
      description: isFirst ? summary : undefined,
      color,
      fields: batch,
      footer: isFirst ? { text: nowKST() } : undefined,
    })
  }
}

export async function notifyDiscordMatch(matched: number, needsReview: number, durationMs: number) {
  const secs = (durationMs / 1000).toFixed(1)
  await sendEmbed({
    title: '🔗 자동매칭 완료',
    description: `**매칭** ${matched.toLocaleString()}개　·　**검토필요** ${needsReview.toLocaleString()}개　·　**소요** ${secs}s`,
    color: matched > 0 ? 0x2ECC71 : 0xF39C12,
    footer: { text: nowKST() },
  })
}

export async function notifyDiscordError(title: string, errorMessage: string) {
  await sendEmbed({
    title: `❌ ${title} 오류`,
    description: `\`\`\`\n${errorMessage.slice(0, 500)}\n\`\`\``,
    color: 0xE74C3C,
    footer: { text: nowKST() },
  })
}
