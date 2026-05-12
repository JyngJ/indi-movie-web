/**
 * 서울 예술/독립영화관 Supabase 시드 스크립트
 *
 * 실행:
 *   npx tsx --env-file=.env.local scripts/seed-theaters.ts
 *
 * 좌표 출처: Nominatim(OSM) — 2026-05-11 기준
 */

import { createClient } from '@supabase/supabase-js'

// ── 극장 데이터 (좌표 검증 완료) ─────────────────────────────────
const THEATERS = [
  {
    name: '인디스페이스',
    lat: 37.5572221, lng: 126.9249712,
    address: '서울 마포구 양화로 176',
    city: '서울', website: 'https://www.indiespace.kr', screenCount: 2,
  },
  {
    name: '아트나인',
    lat: 37.4846834, lng: 126.9816811,
    address: '서울 동작구 동작대로 89',
    city: '서울', screenCount: 1,
  },
  {
    name: '에무시네마',
    lat: 37.5720855, lng: 126.9690129,
    address: '서울 종로구 경희궁1가길 7',
    city: '서울', website: 'https://www.emucinema.com', screenCount: 1,
  },
  {
    name: '라이카시네마',
    lat: 37.5651980, lng: 126.9310023,
    address: '서울 서대문구 연희로8길 18',
    city: '서울', website: 'https://www.laikacinema.com', screenCount: 1,
  },
  {
    name: '서울아트시네마',
    lat: 37.5680721, lng: 126.9699993,
    address: '서울 중구 정동길 3',
    city: '서울', website: 'https://www.cinematheque.seoul.kr', screenCount: 1,
  },
  {
    name: '아트하우스 모모',
    lat: 37.5643371, lng: 126.9468925,
    address: '서울 서대문구 이화여대길 52',
    city: '서울', website: 'https://artmomo.ewha.ac.kr', screenCount: 1,
  },
  {
    name: 'KT&G 상상마당 시네마',
    lat: 37.5509886, lng: 126.9210678,
    address: '서울 마포구 어울마당로 65',
    city: '서울', website: 'https://www.sangsangmadang.com', screenCount: 1,
  },
  {
    name: '더숲 아트시네마',
    lat: 37.6533995, lng: 127.0566448,
    address: '서울 노원구 노해로 480',
    city: '서울', website: 'https://thesoop.modoo.at', screenCount: 1,
  },
  {
    name: '서울영화센터',
    lat: 37.5646326, lng: 126.9953241,
    address: '서울 중구 마른내로 38',
    city: '서울', website: 'https://www.seoulfilmcenter.or.kr', screenCount: 2,
  },
  {
    // 낙원빌딩 — 낭만극장·허리우드클래식이 같은 건물, 미세 오프셋으로 구분
    name: '낭만극장',
    lat: 37.5721530,          lng: 126.9876142,
    address: '서울 종로구 삼일대로 428',
    city: '서울', screenCount: 1,
  },
  {
    name: '허리우드클래식',
    lat: 37.5721530, lng: 126.9876142,
    address: '서울 종로구 삼일대로 428',
    city: '서울', screenCount: 1,
  },
  {
    name: '씨네큐브 광화문',
    lat: 37.5696344, lng: 126.9721541,
    address: '서울 종로구 새문안로 68',
    city: '서울', website: 'https://www.cinecube.co.kr', screenCount: 2,
  },
  {
    name: '아리랑시네센터',
    lat: 37.6032391, lng: 127.0133181,
    address: '서울 성북구 아리랑로 82',
    city: '서울', website: 'https://cine.arirang.go.kr:8443/arirang/index.do', screenCount: 2,
  },
]

// ── 메인 ──────────────────────────────────────────────────────────
async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) throw new Error('Supabase 환경 변수가 없습니다.')

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`\n극장 ${THEATERS.length}개 처리 시작...\n`)

  let successCount = 0
  let skipCount = 0
  const failed: string[] = []

  for (const theater of THEATERS) {
    // 이미 같은 이름이 있으면 건너뜀
    const { data: existing } = await supabase
      .from('theaters')
      .select('id')
      .eq('name', theater.name)
      .maybeSingle()

    if (existing) {
      console.log(`  ⏭  ${theater.name} (이미 존재)`)
      skipCount++
      continue
    }

    const { error } = await supabase.from('theaters').insert({
      name:          theater.name,
      lat:           theater.lat,
      lng:           theater.lng,
      address:       theater.address,
      city:          theater.city,
      website:       theater.website ?? null,
      screen_count:  theater.screenCount,
      parking:       false,
      restaurant:    false,
      accessibility: false,
    })

    if (error) {
      console.log(`  ❌ ${theater.name}: ${error.message}`)
      failed.push(theater.name)
    } else {
      console.log(`  ✅ ${theater.name} (${theater.lat.toFixed(6)}, ${theater.lng.toFixed(6)})`)
      successCount++
    }
  }

  console.log('\n──────────────────────────────────────')
  console.log(`✅ 신규 저장: ${successCount}개`)
  if (skipCount > 0) console.log(`⏭  건너뜀:   ${skipCount}개 (이미 존재)`)
  if (failed.length > 0) {
    console.log(`❌ 실패:     ${failed.length}개`)
    failed.forEach((n) => console.log(`   - ${n}`))
  }
  console.log()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
