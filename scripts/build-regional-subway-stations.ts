/**
 * 부산/대구/광주/대전 지하철 역 데이터 생성
 * VWorld API로 주소 → 좌표 변환 후 stations 테이블 삽입
 * Usage: npx tsx --env-file=.env.local scripts/build-regional-subway-stations.ts
 *        --apply  실제 저장 (기본 dry-run)
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
const VWORLD_KEY = process.env.V_WORLD_KEY!
const APPLY = process.argv.includes('--apply')

// ─── 역 목록 ─────────────────────────────────────────────────
const STATIONS: Array<{ name: string; line: string; city: string; address: string }> = [
  // ── 부산 1호선
  { name: '신평',   line: '부산1호선', city: '부산광역시', address: '부산광역시 사하구 하신번영로 지하 지하철1호선신평역' },
  { name: '당리',   line: '부산1호선', city: '부산광역시', address: '부산광역시 사하구 낙동대로550번길 지하 당리역' },
  { name: '하단',   line: '부산1호선', city: '부산광역시', address: '부산광역시 사하구 낙동대로 지하 하단역' },
  { name: '괴정',   line: '부산1호선', city: '부산광역시', address: '부산광역시 사하구 낙동대로 지하 괴정역' },
  { name: '대티',   line: '부산1호선', city: '부산광역시', address: '부산광역시 사하구 원양로 지하 대티역' },
  { name: '서대신', line: '부산1호선', city: '부산광역시', address: '부산광역시 서구 구덕로 지하 서대신역' },
  { name: '동대신', line: '부산1호선', city: '부산광역시', address: '부산광역시 서구 대신공원로 지하 동대신역' },
  { name: '토성',   line: '부산1호선', city: '부산광역시', address: '부산광역시 동구 초량중로 지하 토성역' },
  { name: '자갈치', line: '부산1호선', city: '부산광역시', address: '부산광역시 중구 자갈치로 지하 자갈치역' },
  { name: '남포',   line: '부산1호선', city: '부산광역시', address: '부산광역시 중구 광복로 지하 남포역' },
  { name: '중앙',   line: '부산1호선', city: '부산광역시', address: '부산광역시 중구 중앙대로 지하 중앙역' },
  { name: '부산역', line: '부산1호선', city: '부산광역시', address: '부산광역시 동구 중앙대로 지하 부산역' },
  { name: '초량',   line: '부산1호선', city: '부산광역시', address: '부산광역시 동구 중앙대로 지하 초량역' },
  { name: '부산진', line: '부산1호선', city: '부산광역시', address: '부산광역시 동구 중앙대로 지하 부산진역' },
  { name: '좌천',   line: '부산1호선', city: '부산광역시', address: '부산광역시 동구 중앙대로 지하 좌천역' },
  { name: '범일',   line: '부산1호선', city: '부산광역시', address: '부산광역시 동구 범일로 지하 범일역' },
  { name: '범내골', line: '부산1호선', city: '부산광역시', address: '부산광역시 부산진구 범천로 지하 범내골역' },
  { name: '서면',   line: '부산1호선', city: '부산광역시', address: '부산광역시 부산진구 중앙대로 지하 서면역' },
  { name: '부전',   line: '부산1호선', city: '부산광역시', address: '부산광역시 부산진구 중앙대로 지하 부전역' },
  { name: '양정',   line: '부산1호선', city: '부산광역시', address: '부산광역시 부산진구 중앙대로 지하 양정역' },
  { name: '시청',   line: '부산1호선', city: '부산광역시', address: '부산광역시 연제구 중앙대로 지하 시청역' },
  { name: '연산',   line: '부산1호선', city: '부산광역시', address: '부산광역시 연제구 중앙대로 지하 연산역' },
  { name: '교대',   line: '부산1호선', city: '부산광역시', address: '부산광역시 연제구 월드컵대로 지하 교대역' },
  { name: '동래',   line: '부산1호선', city: '부산광역시', address: '부산광역시 동래구 중앙대로 지하 동래역' },
  { name: '명륜',   line: '부산1호선', city: '부산광역시', address: '부산광역시 동래구 충렬대로 지하 명륜역' },
  { name: '온천장', line: '부산1호선', city: '부산광역시', address: '부산광역시 동래구 온천장로 지하 온천장역' },
  { name: '부산대', line: '부산1호선', city: '부산광역시', address: '부산광역시 금정구 부산대학로 지하 부산대역' },
  { name: '장전',   line: '부산1호선', city: '부산광역시', address: '부산광역시 금정구 중앙대로 지하 장전역' },
  { name: '구서',   line: '부산1호선', city: '부산광역시', address: '부산광역시 금정구 중앙대로 지하 구서역' },
  { name: '두실',   line: '부산1호선', city: '부산광역시', address: '부산광역시 금정구 중앙대로 지하 두실역' },
  { name: '남산',   line: '부산1호선', city: '부산광역시', address: '부산광역시 금정구 중앙대로 남산역' },
  { name: '범어사', line: '부산1호선', city: '부산광역시', address: '부산광역시 금정구 범어사로 범어사역' },
  { name: '노포',   line: '부산1호선', city: '부산광역시', address: '부산광역시 금정구 노포동 노포역' },
  // ── 부산 2호선 (주요 역)
  { name: '장산',   line: '부산2호선', city: '부산광역시', address: '부산광역시 해운대구 장산로 장산역' },
  { name: '해운대', line: '부산2호선', city: '부산광역시', address: '부산광역시 해운대구 해운대해변로 지하 해운대역' },
  { name: '센텀시티', line: '부산2호선', city: '부산광역시', address: '부산광역시 해운대구 센텀서로 지하 센텀시티역' },
  { name: '수영',   line: '부산2호선', city: '부산광역시', address: '부산광역시 수영구 수영로 지하 수영역' },
  { name: '광안',   line: '부산2호선', city: '부산광역시', address: '부산광역시 수영구 수영로 지하 광안역' },
  { name: '금련산', line: '부산2호선', city: '부산광역시', address: '부산광역시 수영구 황령대로 지하 금련산역' },
  { name: '남천',   line: '부산2호선', city: '부산광역시', address: '부산광역시 수영구 수영로 지하 남천역' },
  { name: '경성대·부경대', line: '부산2호선', city: '부산광역시', address: '부산광역시 남구 수영로 지하 경성대부경대역' },
  { name: '대연',   line: '부산2호선', city: '부산광역시', address: '부산광역시 남구 유엔평화로 지하 대연역' },
  { name: '못골',   line: '부산2호선', city: '부산광역시', address: '부산광역시 남구 수영로 지하 못골역' },
  { name: '문현',   line: '부산2호선', city: '부산광역시', address: '부산광역시 남구 문현금융로 지하 문현역' },
  { name: '전포',   line: '부산2호선', city: '부산광역시', address: '부산광역시 부산진구 전포대로 지하 전포역' },
  { name: '부암',   line: '부산2호선', city: '부산광역시', address: '부산광역시 부산진구 동평로 지하 부암역' },
  { name: '가야',   line: '부산2호선', city: '부산광역시', address: '부산광역시 부산진구 가야대로 지하 가야역' },
  { name: '주례',   line: '부산2호선', city: '부산광역시', address: '부산광역시 사상구 사상로 지하 주례역' },
  { name: '사상',   line: '부산2호선', city: '부산광역시', address: '부산광역시 사상구 사상로 지하 사상역' },
  { name: '모덕',   line: '부산2호선', city: '부산광역시', address: '부산광역시 사상구 백양대로 지하 모덕역' },
  { name: '덕포',   line: '부산2호선', city: '부산광역시', address: '부산광역시 사상구 덕포로 지하 덕포역' },
  { name: '감전',   line: '부산2호선', city: '부산광역시', address: '부산광역시 사상구 새벽시장로 지하 감전역' },
  { name: '냉정',   line: '부산2호선', city: '부산광역시', address: '부산광역시 사상구 사상로 지하 냉정역' },
  { name: '호포',   line: '부산2호선', city: '부산광역시', address: '경상남도 양산시 물금읍 범어로 호포역' },
  { name: '증산',   line: '부산2호선', city: '부산광역시', address: '경상남도 양산시 물금읍 범어로 증산역' },
  { name: '양산',   line: '부산2호선', city: '부산광역시', address: '경상남도 양산시 물금읍 범어로 양산역' },
  // ── 대구 1호선 (주요)
  { name: '설화명곡', line: '대구1호선', city: '대구광역시', address: '대구광역시 달서구 달구벌대로 지하 설화명곡역' },
  { name: '용산',    line: '대구1호선', city: '대구광역시', address: '대구광역시 달서구 달구벌대로 지하 용산역' },
  { name: '계명대', line: '대구1호선', city: '대구광역시', address: '대구광역시 달서구 달구벌대로 지하 계명대역' },
  { name: '대곡',   line: '대구1호선', city: '대구광역시', address: '대구광역시 달서구 달구벌대로 지하 대곡역' },
  { name: '진천',   line: '대구1호선', city: '대구광역시', address: '대구광역시 달서구 달구벌대로 지하 진천역' },
  { name: '월배',   line: '대구1호선', city: '대구광역시', address: '대구광역시 달서구 달구벌대로 지하 월배역' },
  { name: '상인',   line: '대구1호선', city: '대구광역시', address: '대구광역시 달서구 달구벌대로 지하 상인역' },
  { name: '월성',   line: '대구1호선', city: '대구광역시', address: '대구광역시 달서구 월성로 지하 월성역' },
  { name: '대명',   line: '대구1호선', city: '대구광역시', address: '대구광역시 남구 대명로 지하 대명역' },
  { name: '현충로', line: '대구1호선', city: '대구광역시', address: '대구광역시 남구 현충로 지하 현충로역' },
  { name: '영대병원', line: '대구1호선', city: '대구광역시', address: '대구광역시 중구 달구벌대로 지하 영대병원역' },
  { name: '반월당', line: '대구1호선', city: '대구광역시', address: '대구광역시 중구 달구벌대로 지하 반월당역' },
  { name: '중앙로', line: '대구1호선', city: '대구광역시', address: '대구광역시 중구 중앙대로 지하 중앙로역' },
  { name: '대구역', line: '대구1호선', city: '대구광역시', address: '대구광역시 북구 태평로 지하 대구역' },
  { name: '칠성시장', line: '대구1호선', city: '대구광역시', address: '대구광역시 북구 칠성로 지하 칠성시장역' },
  { name: '동천',   line: '대구1호선', city: '대구광역시', address: '대구광역시 북구 동천로 지하 동천역' },
  { name: '동구청', line: '대구1호선', city: '대구광역시', address: '대구광역시 동구 동구청로 지하 동구청역' },
  { name: '아양교', line: '대구1호선', city: '대구광역시', address: '대구광역시 동구 아양로 지하 아양교역' },
  { name: '동촌',   line: '대구1호선', city: '대구광역시', address: '대구광역시 동구 동촌로 지하 동촌역' },
  { name: '해안',   line: '대구1호선', city: '대구광역시', address: '대구광역시 동구 해안로 해안역' },
  { name: '방촌',   line: '대구1호선', city: '대구광역시', address: '대구광역시 동구 방촌동 방촌역' },
  { name: '각산',   line: '대구1호선', city: '대구광역시', address: '대구광역시 동구 각산동 각산역' },
  { name: '안심',   line: '대구1호선', city: '대구광역시', address: '대구광역시 동구 안심로 안심역' },
  // ── 대구 2호선 (주요)
  { name: '문양',   line: '대구2호선', city: '대구광역시', address: '대구광역시 달성군 다사읍 문양역로 문양역' },
  { name: '다사',   line: '대구2호선', city: '대구광역시', address: '대구광역시 달성군 다사읍 달성로 다사역' },
  { name: '이곡',   line: '대구2호선', city: '대구광역시', address: '대구광역시 달서구 이곡동 이곡역' },
  { name: '용산(대구)', line: '대구2호선', city: '대구광역시', address: '대구광역시 달서구 용산동 지하 용산역' },
  { name: '죽전',   line: '대구2호선', city: '대구광역시', address: '대구광역시 달서구 달구벌대로 지하 죽전역' },
  { name: '감삼',   line: '대구2호선', city: '대구광역시', address: '대구광역시 달서구 달구벌대로 지하 감삼역' },
  { name: '두류',   line: '대구2호선', city: '대구광역시', address: '대구광역시 달서구 두류공원로 지하 두류역' },
  { name: '내당',   line: '대구2호선', city: '대구광역시', address: '대구광역시 서구 내당동 지하 내당역' },
  { name: '반고개', line: '대구2호선', city: '대구광역시', address: '대구광역시 중구 달구벌대로 지하 반고개역' },
  { name: '청라언덕', line: '대구2호선', city: '대구광역시', address: '대구광역시 중구 달구벌대로 지하 청라언덕역' },
  { name: '경대병원', line: '대구2호선', city: '대구광역시', address: '대구광역시 중구 달구벌대로 지하 경대병원역' },
  { name: '대구은행', line: '대구2호선', city: '대구광역시', address: '대구광역시 수성구 동대구로 지하 대구은행역' },
  { name: '범어',   line: '대구2호선', city: '대구광역시', address: '대구광역시 수성구 동대구로 지하 범어역' },
  { name: '수성구청', line: '대구2호선', city: '대구광역시', address: '대구광역시 수성구 동대구로 지하 수성구청역' },
  { name: '만촌',   line: '대구2호선', city: '대구광역시', address: '대구광역시 수성구 동대구로 지하 만촌역' },
  { name: '담티',   line: '대구2호선', city: '대구광역시', address: '대구광역시 수성구 달구벌대로 지하 담티역' },
  { name: '고산',   line: '대구2호선', city: '대구광역시', address: '대구광역시 수성구 고산로 고산역' },
  { name: '신매',   line: '대구2호선', city: '대구광역시', address: '대구광역시 수성구 황금동 신매역' },
  { name: '사월',   line: '대구2호선', city: '대구광역시', address: '대구광역시 수성구 사월동 사월역' },
  { name: '임당',   line: '대구2호선', city: '대구광역시', address: '경상북도 경산시 임당동 임당역' },
  { name: '영남대', line: '대구2호선', city: '대구광역시', address: '경상북도 경산시 대학로 영남대역' },
  // ── 광주 1호선
  { name: '녹동',   line: '광주1호선', city: '광주광역시', address: '광주광역시 광산구 임방울대로 녹동역' },
  { name: '소태',   line: '광주1호선', city: '광주광역시', address: '광주광역시 동구 소태역로 소태역' },
  { name: '운림',   line: '광주1호선', city: '광주광역시', address: '광주광역시 동구 지석로 운림역' },
  { name: '남광주', line: '광주1호선', city: '광주광역시', address: '광주광역시 동구 서남로 남광주역' },
  { name: '문화전당', line: '광주1호선', city: '광주광역시', address: '광주광역시 동구 문화전당로 지하 문화전당역' },
  { name: '금남로4가', line: '광주1호선', city: '광주광역시', address: '광주광역시 동구 중앙로 지하 금남로4가역' },
  { name: '금남로5가', line: '광주1호선', city: '광주광역시', address: '광주광역시 동구 중앙로 지하 금남로5가역' },
  { name: '양동시장', line: '광주1호선', city: '광주광역시', address: '광주광역시 서구 천변좌로 지하 양동시장역' },
  { name: '농성',   line: '광주1호선', city: '광주광역시', address: '광주광역시 서구 상무대로 지하 농성역' },
  { name: '화정',   line: '광주1호선', city: '광주광역시', address: '광주광역시 서구 상무대로 지하 화정역' },
  { name: '쌍촌',   line: '광주1호선', city: '광주광역시', address: '광주광역시 서구 상무대로 지하 쌍촌역' },
  { name: '운천',   line: '광주1호선', city: '광주광역시', address: '광주광역시 서구 상무대로 지하 운천역' },
  { name: '상무',   line: '광주1호선', city: '광주광역시', address: '광주광역시 서구 상무대로 지하 상무역' },
  { name: '김대중컨벤션센터', line: '광주1호선', city: '광주광역시', address: '광주광역시 서구 상무대로 지하 김대중컨벤션센터역' },
  { name: '공항',   line: '광주1호선', city: '광주광역시', address: '광주광역시 서구 상무대로 공항역' },
  { name: '광주송정', line: '광주1호선', city: '광주광역시', address: '광주광역시 광산구 송정로 광주송정역' },
  { name: '도산',   line: '광주1호선', city: '광주광역시', address: '광주광역시 광산구 첨단연신로 도산역' },
  { name: '평동',   line: '광주1호선', city: '광주광역시', address: '광주광역시 광산구 평동산단중앙로 평동역' },
  { name: '박호',   line: '광주1호선', city: '광주광역시', address: '광주광역시 광산구 임방울대로 박호역' },
  // ── 대전 1호선
  { name: '반석',   line: '대전1호선', city: '대전광역시', address: '대전광역시 유성구 노은로 반석역' },
  { name: '지족',   line: '대전1호선', city: '대전광역시', address: '대전광역시 유성구 지족로 지족역' },
  { name: '노은',   line: '대전1호선', city: '대전광역시', address: '대전광역시 유성구 은구비로 노은역' },
  { name: '월평',   line: '대전1호선', city: '대전광역시', address: '대전광역시 서구 둔산대로 월평역' },
  { name: '갈마',   line: '대전1호선', city: '대전광역시', address: '대전광역시 서구 둔산대로 갈마역' },
  { name: '정부청사', line: '대전1호선', city: '대전광역시', address: '대전광역시 서구 둔산대로 정부청사역' },
  { name: '시청',   line: '대전1호선', city: '대전광역시', address: '대전광역시 서구 한밭대로 시청역' },
  { name: '중구청', line: '대전1호선', city: '대전광역시', address: '대전광역시 중구 중앙로 중구청역' },
  { name: '서대전네거리', line: '대전1호선', city: '대전광역시', address: '대전광역시 중구 대종로 서대전네거리역' },
  { name: '오룡',   line: '대전1호선', city: '대전광역시', address: '대전광역시 중구 오룡동 오룡역' },
  { name: '용문',   line: '대전1호선', city: '대전광역시', address: '대전광역시 중구 용문동 용문역' },
  { name: '탄방',   line: '대전1호선', city: '대전광역시', address: '대전광역시 서구 탄방동 탄방역' },
  { name: '대전역', line: '대전1호선', city: '대전광역시', address: '대전광역시 동구 중앙로 대전역' },
  { name: '중앙로', line: '대전1호선', city: '대전광역시', address: '대전광역시 중구 중앙로 중앙로역' },
  { name: '대동',   line: '대전1호선', city: '대전광역시', address: '대전광역시 동구 대동 대동역' },
  { name: '신흥',   line: '대전1호선', city: '대전광역시', address: '대전광역시 동구 신흥동 신흥역' },
  { name: '판암',   line: '대전1호선', city: '대전광역시', address: '대전광역시 동구 판암동 판암역' },
]

// ─── VWorld 좌표 변환 ────────────────────────────────────────
async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL('https://api.vworld.kr/req/address')
  url.searchParams.set('service', 'address')
  url.searchParams.set('request', 'getCoord')
  url.searchParams.set('key', VWORLD_KEY)
  url.searchParams.set('address', address)
  url.searchParams.set('type', 'ROAD')
  url.searchParams.set('format', 'json')

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) })
    const d = await res.json() as { response?: { status?: string; result?: { point?: { x: string; y: string } } } }
    const pt = d.response?.result?.point
    if (d.response?.status === 'OK' && pt?.x && pt?.y) {
      return { lat: parseFloat(pt.y), lng: parseFloat(pt.x) }
    }
  } catch {}

  // fallback: 지번 주소
  url.searchParams.set('type', 'PARCEL')
  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) })
    const d = await res.json() as { response?: { status?: string; result?: { point?: { x: string; y: string } } } }
    const pt = d.response?.result?.point
    if (d.response?.status === 'OK' && pt?.x && pt?.y) {
      return { lat: parseFloat(pt.y), lng: parseFloat(pt.x) }
    }
  } catch {}

  return null
}

// ─── 네이버 로컬 검색 fallback ────────────────────────────────
async function naverGeocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(
    `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=1`,
    {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      },
    }
  ).catch(() => null)
  if (!res?.ok) return null
  const d = await res.json() as { items?: Array<{ mapx: string; mapy: string }> }
  const item = d.items?.[0]
  if (!item?.mapx) return null
  return {
    lat: parseInt(item.mapy) / 1e7,
    lng: parseInt(item.mapx) / 1e7,
  }
}

async function main() {
  console.log(`총 ${STATIONS.length}개 역 처리 (${APPLY ? '실제 저장' : 'dry-run'})`)

  let ok = 0, fail = 0
  const rows: object[] = []

  for (const station of STATIONS) {
    // 이미 있는지 확인
    const { data: existing } = await sb
      .from('stations')
      .select('id')
      .eq('name', station.name)
      .ilike('city', `%${station.city.slice(0, 2)}%`)
      .limit(1)

    if (existing?.length) {
      console.log(`  ⏩ skip (exists): ${station.name}`)
      continue
    }

    // 좌표 획득
    let coords = await geocode(station.address)
    if (!coords) {
      coords = await naverGeocode(`${station.name}역 ${station.city}`)
    }

    if (!coords) {
      console.log(`  ❌ 좌표 실패: ${station.name}`)
      fail++
      continue
    }

    console.log(`  ✅ ${station.name} (${station.line}) → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)
    ok++

    rows.push({
      id: randomUUID(),
      source_id: `${station.line}-${station.name}`,
      name: station.name,
      lines: [station.line],
      lat: coords.lat,
      lng: coords.lng,
      city: station.city,
    })

    await new Promise(r => setTimeout(r, 120))
  }

  if (APPLY && rows.length > 0) {
    const { error } = await sb.from('stations').insert(rows)
    if (error) throw new Error(error.message)
    console.log(`\n저장 완료: ${rows.length}개`)
  } else {
    console.log(`\n완료 — 성공: ${ok}, 실패: ${fail}, dry-run: ${rows.length}개 저장 대상`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
