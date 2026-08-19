/**
 * 관심 알림 배치 — RPi crontab에서 crawl:showtimes 직후 실행.
 *   npm run notify:favorites
 *
 * 하는 일: 관심 목록 × 상영 사실을 대조해 소식(notification_events)을 만들고,
 * 사용자별로 묶어 발송 이력을 남긴다.
 *
 * 발송은 아직 껐다 — sender를 넘기지 않으므로 모든 묶음이 skipped('sending_disabled')로
 * 기록된다. 소식 탭에는 정상적으로 쌓이므로, 며칠 돌려보며 오탐률을 확인한 뒤
 * 카카오 sender를 끼워 발송을 켠다.
 *
 * 실행 전 docs/SUPABASE_NOTIFICATIONS.sql 적용 필요.
 */

import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim()
  }
}

import { createSupabaseNotificationBatchRepository } from '../src/lib/notifications/supabaseNotificationBatchRepository'
import { runNotificationDispatch } from '../src/lib/notifications/dispatch'

/** KST 기준 "yyyy-mm-dd" / "HH:MM" — 서버 타임존과 무관하게 한국 시각으로 판정한다 */
function kstNow(): { today: string; hhmm: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return {
    today: `${get('year')}-${get('month')}-${get('day')}`,
    hhmm: `${get('hour')}:${get('minute')}`,
  }
}

async function main() {
  const { today, hhmm } = kstNow()
  const dryRun = process.argv.includes('--dry-run')

  console.log(`[notify] KST ${today} ${hhmm}${dryRun ? ' (dry-run)' : ''}`)

  const repo = createSupabaseNotificationBatchRepository()

  if (dryRun) {
    // 저장 없이 몇 건이 만들어질지만 본다 — 판정 튜닝용
    const noWrite = {
      ...repo,
      insertEvents: async (events: Parameters<typeof repo.insertEvents>[0]) => {
        for (const e of events.slice(0, 20)) {
          console.log(`  ${e.kind} ${e.payload.movieTitle} @ ${e.payload.theaterName} (${e.subjectType} 하트)`)
        }
        if (events.length > 20) console.log(`  … 외 ${events.length - 20}건`)
        return []
      },
      insertDelivery: async () => {},
    }
    const result = await runNotificationDispatch(noWrite, { today, nowHhmm: hhmm })
    console.log('[notify] dry-run 결과', result)
    return
  }

  const result = await runNotificationDispatch(repo, { today, nowHhmm: hhmm })
  console.log('[notify] 결과', JSON.stringify(result))
}

main().catch((e) => {
  console.error('[notify] 실패:', e)
  process.exit(1)
})
