/**
 * VWorld Geocoding API로 전체 극장 좌표 업데이트
 * Usage: npx tsx --env-file=.env.local scripts/update-theater-coords-vworld.ts
 *        --apply  실제 저장 (기본 dry-run)
 *        --theater "극장명"  특정 극장만
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const VWORLD_KEY = process.env.V_WORLD_KEY!
const APPLY = process.argv.includes('--apply')
const TARGET = (() => { const i = process.argv.indexOf('--theater'); return i >= 0 ? process.argv[i + 1] : null })()

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  // 도로명 먼저, 실패 시 지번
  for (const type of ['ROAD', 'PARCEL'] as const) {
    const url = new URL('https://api.vworld.kr/req/address')
    url.searchParams.set('service', 'address')
    url.searchParams.set('request', 'getCoord')
    url.searchParams.set('key', VWORLD_KEY)
    url.searchParams.set('address', address)
    url.searchParams.set('type', type)
    url.searchParams.set('format', 'json')

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
      const data = await res.json() as {
        response?: { status?: string; result?: { point?: { x: string; y: string } } }
      }
      const pt = data.response?.result?.point
      if (data.response?.status === 'OK' && pt?.x && pt?.y) {
        return { lat: parseFloat(pt.y), lng: parseFloat(pt.x) }
      }
    } catch { /* timeout or parse error */ }
  }
  return null
}

function coordDiff(a: number, b: number) {
  return Math.abs(a - b)
}

async function main() {
  if (!VWORLD_KEY) { console.error('V_WORLD_KEY 환경변수 없음'); process.exit(1) }
  if (!APPLY) console.log('🔍 dry-run (--apply 추가 시 실제 저장)\n')

  const query = sb.from('theaters').select('id, name, address, lat, lng').not('address', 'is', null)
  if (TARGET) query.ilike('name', `%${TARGET}%`)
  const { data: theaters, error } = await query.order('name')
  if (error) throw error

  console.log(`극장 ${theaters?.length}개 처리 중...\n`)

  let updated = 0, skipped = 0, failed = 0

  for (const t of theaters ?? []) {
    if (!t.address?.trim()) { skipped++; continue }

    const coords = await geocode(t.address)
    if (!coords) {
      console.log(`  ❌ ${t.name} — 좌표 없음 (주소: ${t.address})`)
      failed++
      continue
    }

    const latDiff = coordDiff(coords.lat, t.lat ?? 0)
    const lngDiff = coordDiff(coords.lng, t.lng ?? 0)
    const changed = latDiff > 0.0001 || lngDiff > 0.0001

    if (!changed && !TARGET) {
      skipped++
      continue
    }

    const arrow = changed ? '→' : '='
    console.log(`  ${changed ? '📍' : '✅'} ${t.name}`)
    console.log(`     현재: ${t.lat?.toFixed(6)}, ${t.lng?.toFixed(6)}`)
    console.log(`     VWorld: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)} ${!changed ? '(동일)' : ''}`)

    if (APPLY && changed) {
      const { error: upErr } = await sb.from('theaters').update({ lat: coords.lat, lng: coords.lng }).eq('id', t.id)
      if (upErr) { console.log(`     ⚠️ 저장 실패: ${upErr.message}`); failed++ }
      else { console.log(`     ✅ 저장됨`); updated++ }
    } else if (changed) {
      updated++ // dry-run count
    }

    // API rate limit 방지
    await new Promise(r => setTimeout(r, 150))
  }

  console.log(`\n완료 — ${APPLY ? '반영' : '대상'}: ${updated} / 변경없음: ${skipped} / 실패: ${failed}`)
}

main().catch(e => { console.error(e); process.exit(1) })
