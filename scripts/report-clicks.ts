/**
 * 눌렀는데 반응이 없었던 클릭 리포트 — PostHog 화면을 열지 않고 터미널에서 읽는다.
 * 실행: npm run report:clicks -- [--days 7] [--limit 15]
 *
 *   repeat tap   같은 요소를 2초 안에 다시 누름(주소 변화 없음) — 반응이 안 보여 다시 누른 흔적
 *   $rageclick   PostHog 기본 연타(1초 안 3번 이상, 같은 자리)
 *   no-op click  눌렀는데 0.7초 동안 화면·주소·스크롤이 전혀 안 바뀜(data-rc 요소만)
 *   dead click   disabled·aria-disabled 요소나 스크림을 누름
 *
 * 운영 도메인만, 내부·테스트 사용자($internal_or_test_user)는 뺀다.
 * 코드 쪽 짝: scripts/audit/audit-feedback.mjs(진행 표시 없는 이동을 배포 전에 막는다).
 */
import * as fs from 'fs'
import * as path from 'path'

const PROD_HOST = 'www.xn--hq1bv8o5phw2d7wt.com'

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^=#]+)=(.*)$/)
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim()
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function hogql(query: string): Promise<unknown[][]> {
  const projectId = process.env.POSTHOG_PROJECT_ID
  const key = process.env.POSTHOG_PERSONAL_API_KEY
  if (!projectId || !key) throw new Error('POSTHOG_PROJECT_ID · POSTHOG_PERSONAL_API_KEY가 .env.local에 없다')
  const res = await fetch(`https://us.posthog.com/api/projects/${projectId}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  })
  if (!res.ok) throw new Error(`PostHog ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = await res.json() as { results: unknown[][] }
  return json.results
}

function pad(s: string, width: number): string {
  const w = [...s].reduce((n, ch) => n + (/[ᄀ-ᇿ　-〿가-힯＀-￯]/.test(ch) ? 2 : 1), 0)
  return s + ' '.repeat(Math.max(0, width - w))
}
const cut = (s: string, max: number) => ([...s].length > max ? `${[...s].slice(0, max - 1).join('')}…` : s)

function table(title: string, head: string[], widths: number[], rows: unknown[][]) {
  console.log(`\n■ ${title}`)
  if (rows.length === 0) { console.log('  (없음)'); return }
  console.log('  ' + head.map((h, i) => pad(h, widths[i])).join('  '))
  for (const r of rows) console.log('  ' + r.map((v, i) => pad(cut(String(v ?? '—'), widths[i]), widths[i])).join('  '))
}

async function main() {
  loadEnv()
  const days = Number(arg('days') ?? 7)
  const limit = Number(arg('limit') ?? 15)
  const where = `properties.$host = '${PROD_HOST}' and timestamp >= now() - interval ${days} day
    and (person.properties.$internal_or_test_user is null or person.properties.$internal_or_test_user != true)`

  console.log(`눌렀는데 반응이 없었던 클릭 — 최근 ${days}일 · ${PROD_HOST} · 내부 사용자 제외`)

  table('연타 (repeat tap) — 반응이 안 보여 다시 누름', ['요소', '페이지', '건', '사람', '평균 탭'], [36, 28, 4, 4, 6],
    await hogql(`select properties.target, properties.path, count(), uniq(distinct_id), round(avg(toFloat(properties.count)), 1)
      from events where event = 'repeat tap' and ${where}
      group by properties.target, properties.path order by uniq(distinct_id) desc, count() desc limit ${limit}`))

  table('분노 클릭 ($rageclick)', ['요소 글자', '페이지', '건', '사람'], [36, 28, 4, 4],
    await hogql(`select properties.$el_text, properties.$pathname, count(), uniq(distinct_id)
      from events where event = '$rageclick' and ${where}
      group by properties.$el_text, properties.$pathname order by uniq(distinct_id) desc, count() desc limit ${limit}`))

  table('무반응 (no-op click)', ['요소(data-rc)', '페이지', '건', '사람'], [36, 28, 4, 4],
    await hogql(`select properties.rc, properties.path, count(), uniq(distinct_id)
      from events where event = 'no-op click' and ${where}
      group by properties.rc, properties.path order by uniq(distinct_id) desc, count() desc limit ${limit}`))

  table('막힌 요소 클릭 (dead click)', ['요소(data-rc)', '이유', '건', '사람'], [36, 14, 4, 4],
    await hogql(`select properties.rc, properties.reason, count(), uniq(distinct_id)
      from events where event = 'dead click' and ${where}
      group by properties.rc, properties.reason order by uniq(distinct_id) desc, count() desc limit ${limit}`))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
