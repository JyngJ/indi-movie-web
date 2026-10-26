/** 라즈베리파이 cron용 — 소식 메일 워크플로를 실행한다. docs/RUNBOOK-email-notifications.md 참고 */
import { buildDispatchRequest, describeDispatchFailure } from '../src/lib/emailNotifications/dispatch'

async function alert(message: string) {
  const webhook = process.env.DISCORD_REPORT_WEBHOOK_URL
  if (!webhook) return
  await fetch(webhook, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: `⚠️ 소식 메일 실행을 걸지 못했어요 — ${message}`, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => undefined)
}

async function main() {
  const token = process.env.GITHUB_EMAIL_DISPATCH_TOKEN
  if (!token) {
    console.error('[email dispatch] GITHUB_EMAIL_DISPATCH_TOKEN이 없어요')
    await alert('라즈베리파이 .env.local에 GITHUB_EMAIL_DISPATCH_TOKEN이 없어요')
    process.exitCode = 1
    return
  }
  const { url, init } = buildDispatchRequest(token)
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) })
  if (response.status === 204) {
    console.log('[email dispatch] 실행을 걸었어요')
    return
  }
  const reason = describeDispatchFailure(response.status)
  console.error('[email dispatch]', reason)
  await alert(reason)
  process.exitCode = 1
}

main().catch(async () => {
  console.error('[email dispatch] GitHub에 연결하지 못했어요')
  await alert('GitHub에 연결하지 못했어요')
  process.exitCode = 1
})
