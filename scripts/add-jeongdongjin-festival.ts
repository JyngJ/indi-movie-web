/**
 * 제28회 정동진독립영화제(jiff.kr) — 극장 2곳 + GV/이벤트 등록
 * 사용법: npx tsx scripts/add-jeongdongjin-festival.ts
 *
 * - 정동초등학교 운동장: 8/7(금)~8/9(일)
 * - 강릉독립예술극장 신영: 8/8(토)~8/10(월)
 *
 * 축제 종료 후 scripts/remove-jeongdongjin-festival.ts로 정리한다.
 */
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const [, key, value] = match
      if (!process.env[key.trim()]) process.env[key.trim()] = value.trim()
    }
  })
}

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) return null
  try {
    const res = await fetch(
      `https://naveropenapi.apigw.naver.com/map-geocoding/v2/geocode?query=${encodeURIComponent(address)}`,
      {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID,
          'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET,
        },
        signal: AbortSignal.timeout(5000),
      },
    )
    if (!res.ok) return null
    const data = (await res.json()) as { addresses: Array<{ x: string; y: string }> }
    if (!data.addresses?.length) return null
    const { x, y } = data.addresses[0]
    return { lat: parseFloat(y), lng: parseFloat(x) }
  } catch {
    return null
  }
}

const THEATERS: Array<{ name: string; city: string; address: string; lat?: number; lng?: number; website?: string }> = [
  {
    // JIFF 사무국 주소와 일치, 좌표는 src/data/theaters-to-add.ts에 이미 스테이징돼 있던 값 재사용
    name: '강릉독립예술극장 신영',
    city: '강원',
    address: '강원 강릉시 경강로 2100 신영빌딩 2, 4층',
    lat: 37.7614,
    lng: 128.8955,
    website: 'http://www.gncine.kr',
  },
  {
    // 학교알리미(schoolinfo.go.kr) 공시 주소, 좌표는 구글맵 실측 핀 위치 — 정동진 야외 상영장으로 쓰이는 운동장
    name: '정동초등학교 운동장',
    city: '강원',
    address: '강원도 강릉시 강동면 헌화로 1055',
    lat: 37.6876152,
    lng: 129.033492,
  },
]

interface FestivalEvent {
  theaterName: string
  eventDate: string
  eventTime: string
  endTime: string
  description: string
}

const FESTIVAL_TITLE = '제28회 정동진독립영화제'
const FESTIVAL_URL = 'http://jiff.kr/timetable/'

const EVENTS: FestivalEvent[] = [
  {
    theaterName: '정동초등학교 운동장',
    eventDate: '2026-08-07',
    eventTime: '19:00',
    endTime: '23:29',
    description: '19:00 개막식 · 20:00 섹션1(만복탕/한 판 더/어아이/내게 쓰인 편지) · 21:25 섹션2(강이와 두기/달달이는 내 룸메/무례한 새벽/뼈의 온도) · 22:40 섹션7(공순이)',
  },
  {
    theaterName: '정동초등학교 운동장',
    eventDate: '2026-08-08',
    eventTime: '20:00',
    endTime: '00:24',
    description: '20:00 섹션3(치킨런/건전지 할머니/반/토마토 던지기/하얀양말) · 21:20 섹션4(위도 37.5도/연근/해질무렵/영성체) · 22:40 섹션8(철들 무렵)',
  },
  {
    theaterName: '정동초등학교 운동장',
    eventDate: '2026-08-09',
    eventTime: '20:00',
    endTime: '22:56',
    description: '20:00 섹션5(조금만 더 죽은 척 해줘/메밀묵/경계/눈길) · 21:40 섹션6(긴급재난문자/To you(;너에게)/덕창/자매의 등산)',
  },
  {
    theaterName: '강릉독립예술극장 신영',
    eventDate: '2026-08-08',
    eventTime: '13:00',
    endTime: '15:35',
    description: '13:00 섹션1(만복탕/한 판 더/어아이/내게 쓰인 편지) · 14:30 섹션2(강이와 두기/달달이는 내 룸메/무례한 새벽/뼈의 온도)',
  },
  {
    theaterName: '강릉독립예술극장 신영',
    eventDate: '2026-08-09',
    eventTime: '13:00',
    endTime: '15:42',
    description: '13:00 섹션3(치킨런/건전지 할머니/반/토마토 던지기/하얀양말) · 14:30 섹션4(위도 37.5도/연근/해질무렵/영성체)',
  },
  {
    theaterName: '강릉독립예술극장 신영',
    eventDate: '2026-08-10',
    eventTime: '13:00',
    endTime: '16:16',
    description: '13:00 섹션5(조금만 더 죽은 척 해줘/메밀묵/경계/눈길) · 15:00 섹션6(긴급재난문자/To you(;너에게)/덕창/자매의 등산)',
  },
]

async function run() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  console.log(`\n📍 극장 ${THEATERS.length}개 추가...\n`)
  const theaterIds = new Map<string, string>()

  for (const t of THEATERS) {
    const { data: existing } = await sb.from('theaters').select('id').eq('name', t.name).eq('city', t.city).maybeSingle()
    if (existing) {
      console.log(`⏭️  ${t.name} — 이미 존재`)
      theaterIds.set(t.name, existing.id)
      continue
    }

    let { lat, lng } = t
    if (lat === undefined || lng === undefined) {
      const coords = await geocodeAddress(t.address)
      if (!coords) {
        console.log(`❌ ${t.name} — 지오코딩 실패, 스킵`)
        continue
      }
      lat = coords.lat
      lng = coords.lng
      console.log(`  🌐 지오코딩: ${t.address} → (${lat}, ${lng})`)
    }

    const { data, error } = await sb
      .from('theaters')
      .insert({
        name: t.name,
        lat,
        lng,
        address: t.address,
        city: t.city,
        website: t.website || null,
        instagram_url: '',
        screen_count: 0,
        seat_count: null,
      })
      .select('id')
      .single()

    if (error || !data) {
      console.log(`❌ ${t.name} — 오류: ${error?.message}`)
      continue
    }
    console.log(`✅ ${t.name} (${lat}, ${lng})`)
    theaterIds.set(t.name, data.id)
  }

  console.log(`\n🎬 이벤트 ${EVENTS.length}개 추가...\n`)
  let eventSuccess = 0

  for (const ev of EVENTS) {
    const theaterId = theaterIds.get(ev.theaterName)
    if (!theaterId) {
      console.log(`❌ ${ev.theaterName} ${ev.eventDate} — 극장 ID 없음, 스킵`)
      continue
    }

    const { data: existing } = await sb
      .from('theater_events')
      .select('id')
      .eq('theater_id', theaterId)
      .eq('event_date', ev.eventDate)
      .eq('title', FESTIVAL_TITLE)
      .maybeSingle()

    if (existing) {
      console.log(`⏭️  ${ev.theaterName} ${ev.eventDate} — 이미 존재`)
      continue
    }

    const { error } = await sb.from('theater_events').insert({
      theater_id: theaterId,
      movie_id: null,
      event_type: 'special',
      title: FESTIVAL_TITLE,
      event_date: ev.eventDate,
      event_time: ev.eventTime,
      end_time: ev.endTime,
      guests: [],
      description: ev.description,
      booking_url: FESTIVAL_URL,
      source_url: FESTIVAL_URL,
      is_active: true,
    })

    if (error) {
      console.log(`❌ ${ev.theaterName} ${ev.eventDate} — 오류: ${error.message}`)
      continue
    }
    console.log(`✅ ${ev.theaterName} ${ev.eventDate} ${ev.eventTime}`)
    eventSuccess++
  }

  console.log(`\n📊 이벤트 ${eventSuccess}/${EVENTS.length}개 등록 완료\n`)
}

run().catch((error) => {
  console.error('❌ 스크립트 실행 중 오류:', error)
  process.exit(1)
})
