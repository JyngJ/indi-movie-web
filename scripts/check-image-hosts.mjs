// DB 이미지 호스트 ↔ next.config.ts remotePatterns 대조 — 누락 호스트 감지
// 사용: npm run check:image-hosts  (.env.local의 SUPABASE_SERVICE_ROLE_KEY 필요)
// 새 포스터/배너/사진 호스트가 DB에 들어왔는데 remotePatterns에 없으면 그 이미지는
// next/image에서 "hostname not configured"로 깨짐 — 배포 전 이 스크립트로 확인.
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(path.join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
)
const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!BASE || !KEY) { console.error('.env.local에 SUPABASE URL/KEY 없음'); process.exit(1) }

// next.config.ts에서 허용 패턴 추출
const config = readFileSync(path.join(ROOT, 'next.config.ts'), 'utf8')
const patterns = [...config.matchAll(/hostname:\s*'([^']+)'/g)].map(m => m[1])
const allowed = (host) => patterns.some(p =>
  p.startsWith('*.') ? host.endsWith(p.slice(1)) || host === p.slice(2) : host === p)

const hosts = new Map()
const add = (u) => {
  if (!u || typeof u !== 'string' || !/^https?:/.test(u)) return
  try { const h = new URL(u).host; hosts.set(h, (hosts.get(h) || 0) + 1) } catch { /* malformed */ }
}
async function scan(table, cols) {
  for (let off = 0; ; off += 1000) {
    const r = await fetch(`${BASE}/rest/v1/${table}?select=${cols.join(',')}&offset=${off}&limit=1000`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
    if (!r.ok) { console.error(`${table}: HTTP ${r.status}`); return }
    const rows = await r.json()
    for (const row of rows) for (const c of cols) add(row[c])
    if (rows.length < 1000) break
  }
}

await scan('movies', ['poster_url'])
await scan('directors', ['photo_url'])
await scan('instagram_recommendations', ['card_image_url'])
await scan('festivals', ['banner_url'])

const missing = [...hosts.entries()].filter(([h]) => !allowed(h)).sort((a, b) => b[1] - a[1])
if (!missing.length) {
  console.log(`✓ DB 이미지 호스트 ${hosts.size}종 전부 remotePatterns에 있음`)
} else {
  console.log(`✗ remotePatterns 누락 호스트 ${missing.length}종:`)
  for (const [h, c] of missing) console.log(`  ${c}\t${h}`)
  process.exitCode = 1
}
