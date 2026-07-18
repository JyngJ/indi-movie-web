/**
 * 정동진독립영화제 이벤트 후속 정리 — 제목/타입/description 재구성
 * (add-jeongdongjin-festival.ts로 이미 넣은 6개 row를 갱신)
 * 사용법: npx tsx scripts/update-jeongdongjin-festival-copy.ts
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

const OLD_TITLE = '제28회 정동진독립영화제'
const NEW_TITLE = '정동진독립영화제'

const UPDATES: Array<{ theaterName: string; eventDate: string; description: string }> = [
  {
    theaterName: '정동초등학교 운동장',
    eventDate: '2026-08-07',
    description: '8월 7일 상영작\n19:00 개막식\n20:00 섹션1(75분): 만복탕, 한 판 더, 어아이, 내게 쓰인 편지\n21:25 섹션2(65분): 강이와 두기, 달달이는 내 룸메, 무례한 새벽, 뼈의 온도\n22:40 섹션7(89분): 공순이',
  },
  {
    theaterName: '정동초등학교 운동장',
    eventDate: '2026-08-08',
    description: '8월 8일 상영작\n20:00 섹션3(68분): 치킨런, 건전지 할머니, 반, 토마토 던지기, 하얀양말\n21:20 섹션4(72분): 위도 37.5도, 연근, 해질무렵, 영성체\n22:40 섹션8(104분): 철들 무렵',
  },
  {
    theaterName: '정동초등학교 운동장',
    eventDate: '2026-08-09',
    description: '8월 9일 상영작\n20:00 섹션5(86분): 조금만 더 죽은 척 해줘, 메밀묵, 경계, 눈길\n21:40 섹션6(76분): 긴급재난문자, To you(;너에게), 덕창, 자매의 등산',
  },
  {
    theaterName: '강릉독립예술극장 신영',
    eventDate: '2026-08-08',
    description: '8월 8일 상영작\n13:00 섹션1(75분): 만복탕, 한 판 더, 어아이, 내게 쓰인 편지\n14:30 섹션2(65분): 강이와 두기, 달달이는 내 룸메, 무례한 새벽, 뼈의 온도',
  },
  {
    theaterName: '강릉독립예술극장 신영',
    eventDate: '2026-08-09',
    description: '8월 9일 상영작\n13:00 섹션3(68분): 치킨런, 건전지 할머니, 반, 토마토 던지기, 하얀양말\n14:30 섹션4(72분): 위도 37.5도, 연근, 해질무렵, 영성체',
  },
  {
    theaterName: '강릉독립예술극장 신영',
    eventDate: '2026-08-10',
    description: '8월 10일 상영작\n13:00 섹션5(86분): 조금만 더 죽은 척 해줘, 메밀묵, 경계, 눈길\n15:00 섹션6(76분): 긴급재난문자, To you(;너에게), 덕창, 자매의 등산',
  },
]

async function run() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: theaters } = await sb
    .from('theaters')
    .select('id,name')
    .in('name', ['정동초등학교 운동장', '강릉독립예술극장 신영'])
  const theaterIdByName = new Map((theaters ?? []).map((t) => [t.name, t.id]))

  let updated = 0
  for (const u of UPDATES) {
    const theaterId = theaterIdByName.get(u.theaterName)
    if (!theaterId) {
      console.log(`❌ ${u.theaterName} — 극장 ID 없음, 스킵`)
      continue
    }

    const { data, error } = await sb
      .from('theater_events')
      .update({
        title: NEW_TITLE,
        // DB event_type은 CHECK 제약으로 festival 값을 못 씀 — 'special' 유지, "영화제" 제목으로
        // 페스티벌 여부를 판별한다(src/lib/gv/adapter.ts의 isFestivalTitle)
        description: u.description,
      })
      .eq('theater_id', theaterId)
      .eq('event_date', u.eventDate)
      .in('title', [OLD_TITLE, NEW_TITLE])
      .select('id')

    if (error) {
      console.log(`❌ ${u.theaterName} ${u.eventDate} — 오류: ${error.message}`)
      continue
    }
    if (!data || data.length === 0) {
      console.log(`⚠️  ${u.theaterName} ${u.eventDate} — 매칭 row 없음`)
      continue
    }
    console.log(`✅ ${u.theaterName} ${u.eventDate}`)
    updated++
  }

  console.log(`\n📊 ${updated}/${UPDATES.length}개 갱신 완료\n`)
}

run().catch((error) => {
  console.error('❌ 스크립트 실행 중 오류:', error)
  process.exit(1)
})
