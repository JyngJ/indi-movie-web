/**
 * 지속적으로 실패하는 crawl_sources 수정
 *
 * 실행 (dry-run):  npx tsx --env-file=.env.local scripts/fix-failing-sources.ts
 * 실제 적용:       npx tsx --env-file=.env.local scripts/fix-failing-sources.ts --apply
 *
 * 수정 내용:
 *  1. Disable — dtryx 소스가 이미 존재하는 극장의 구형 HTML 파서 중복 소스 비활성화
 *  2. Disable — 폐관/도메인 사망 극장
 *  3. Update  — moonhwain 기반 극장 URL 교체 (parser=selfHosted)
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const apply = process.argv.includes('--apply')

// ── 1. 비활성화 (이미 dtryx 소스 존재 or 폐관) ───────────────────────────────
// parser != 'dtryxReservationApi' 인 소스만 대상으로 disable
const DISABLE: Array<{ theater_name: string; reason: string }> = [
  // dtryx CinemaCd=000097 (모퉁이극장) 이미 있음 — 구형 HTML 소스 비활성화
  {
    theater_name: 'BNK부산은행 아트시네마 모퉁이극장',
    reason: '모퉁이극장 Dtryx 소스(CinemaCd=000097)로 대체됨',
  },
  // dtryx CinemaCd=000107 이미 있음
  {
    theater_name: '금성시네마',
    reason: '금성시네마 Dtryx 소스(CinemaCd=000107)로 대체됨',
  },
  // dtryx CinemaCd=000100 이미 있음
  {
    theater_name: '애관극장',
    reason: '애관극장 Dtryx 소스(CinemaCd=000100)로 대체됨',
  },
  // 시네마엠엠 dtryx CinemaCd=000146 이미 있음 (같은 극장)
  {
    theater_name: '시네마라운지MM',
    reason: '시네마엠엠(목포) Dtryx 소스(CinemaCd=000146)로 대체됨. 구 도메인 사망.',
  },
  // 2010년 폐관
  {
    theater_name: '중앙시네마',
    reason: '2010년 폐관 확인. 소스 비활성화.',
  },
  // Dtryx CinemaCd=000117 이 현재 API 목록에 없음 — 탈퇴 또는 운영 중단
  {
    theater_name: '자유로자동차극장',
    reason: 'Dtryx CinemaCd=000117 이 현재 API 목록에서 제거됨. 비활성화.',
  },
]

// ── 2. URL + parser 업데이트 (moonhwain) ─────────────────────────────────────
const UPDATE: Array<{
  theater_name: string
  listing_url: string
  parser: string
  notes: string
}> = [
  {
    theater_name: '픽쳐하우스',
    listing_url: 'https://picturehouse.moonhwain.kr:447/',
    parser: 'selfHosted',
    notes: 'moonhwain 예매 시스템 (picturehouse.moonhwain.kr:447)',
  },
  {
    theater_name: '전주 시네마타운',
    listing_url: 'https://jcinema.moonhwain.net:451/',
    parser: 'selfHosted',
    notes: 'moonhwain 예매 시스템 (jcinema.moonhwain.net:451)',
  },
  {
    theater_name: '조이앤시네마 전주',
    listing_url: 'https://joyn.moonhwain.net:451/',
    parser: 'selfHosted',
    notes: 'moonhwain 예매 시스템 (joyn.moonhwain.net:451)',
  },
]

async function main() {
  console.log(`모드: ${apply ? '실제 적용 (--apply)' : 'dry-run'}\n`)
  let ok = 0, fail = 0

  // ── Disable ─────────────────────────────────────────────────────────────────
  console.log('▶ 비활성화 (HTML 파서 중복 / 폐관 / Dtryx 탈퇴)')
  for (const item of DISABLE) {
    process.stdout.write(`  [disable] ${item.theater_name} ... `)

    if (!apply) {
      console.log(`[dry-run] "${item.reason}"`)
      ok++
      continue
    }

    const { error } = await sb
      .from('crawl_sources')
      .update({ enabled: false, notes: item.reason })
      .eq('theater_name', item.theater_name)
      .neq('parser', 'dtryxReservationApi')

    if (error) { console.log(`실패: ${error.message}`); fail++ }
    else { console.log('✓'); ok++ }
  }

  // ── Update ───────────────────────────────────────────────────────────────────
  console.log('\n▶ URL / 파서 업데이트 (moonhwain)')
  for (const item of UPDATE) {
    process.stdout.write(`  [update] ${item.theater_name} → ${item.listing_url} ... `)

    if (!apply) {
      console.log(`[dry-run] parser=${item.parser}`)
      ok++
      continue
    }

    const { error } = await sb
      .from('crawl_sources')
      .update({
        listing_url: item.listing_url,
        parser: item.parser,
        homepage_url: item.listing_url,
        notes: item.notes,
        enabled: true,
      })
      .eq('theater_name', item.theater_name)

    if (error) { console.log(`실패: ${error.message}`); fail++ }
    else { console.log('✓'); ok++ }
  }

  console.log(`\n완료 — 성공: ${ok} / 실패: ${fail}`)
  if (!apply) {
    console.log('\n실제 적용: npx tsx --env-file=.env.local scripts/fix-failing-sources.ts --apply')
  }
}

main().catch(console.error)
