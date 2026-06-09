export interface RegionItem {
  id: string
  label: string
}

// 표시용 지역 목록
export const REGIONS: RegionItem[] = [
  { id: '서울', label: '서울' },
  { id: '부산', label: '부산' },
  { id: '대구', label: '대구' },
  { id: '인천', label: '인천' },
  { id: '광주', label: '광주' },
  { id: '대전', label: '대전' },
  { id: '울산', label: '울산' },
  { id: '세종', label: '세종' },
  { id: '경기', label: '경기' },
  { id: '강원', label: '강원' },
  { id: '충북', label: '충북' },
  { id: '충남', label: '충남' },
  { id: '전북', label: '전북' },
  { id: '전남', label: '전남' },
  { id: '경북', label: '경북' },
  { id: '경남', label: '경남' },
  { id: '제주', label: '제주' },
]

// 지역별 flyTo 범위 (lat 최소/최대, lng 최소/최대)
export const REGION_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  '서울':  { minLat: 37.41, maxLat: 37.70, minLng: 126.77, maxLng: 127.18 },
  '부산':  { minLat: 35.04, maxLat: 35.40, minLng: 128.74, maxLng: 129.32 },
  '대구':  { minLat: 35.73, maxLat: 36.03, minLng: 128.36, maxLng: 128.80 },
  '인천':  { minLat: 37.26, maxLat: 37.63, minLng: 126.37, maxLng: 126.79 },
  '광주':  { minLat: 35.06, maxLat: 35.27, minLng: 126.77, maxLng: 126.97 },
  '대전':  { minLat: 36.21, maxLat: 36.48, minLng: 127.29, maxLng: 127.50 },
  '울산':  { minLat: 35.44, maxLat: 35.68, minLng: 129.05, maxLng: 129.46 },
  '세종':  { minLat: 36.40, maxLat: 36.65, minLng: 127.15, maxLng: 127.40 },
  '경기':  { minLat: 36.93, maxLat: 38.03, minLng: 126.33, maxLng: 127.85 },
  '강원':  { minLat: 37.01, maxLat: 38.61, minLng: 126.80, maxLng: 129.38 },
  '충북':  { minLat: 36.27, maxLat: 37.19, minLng: 127.41, maxLng: 128.45 },
  '충남':  { minLat: 35.98, maxLat: 37.00, minLng: 125.95, maxLng: 127.34 },
  '전북':  { minLat: 35.40, maxLat: 36.08, minLng: 126.43, maxLng: 127.79 },
  '전남':  { minLat: 33.85, maxLat: 35.38, minLng: 125.97, maxLng: 127.70 },
  '경북':  { minLat: 35.61, maxLat: 37.24, minLng: 127.95, maxLng: 129.60 },
  '경남':  { minLat: 34.61, maxLat: 35.74, minLng: 127.57, maxLng: 129.21 },
  '제주':  { minLat: 33.10, maxLat: 33.60, minLng: 126.08, maxLng: 126.97 },
}

// 주소 문자열 → 지역 ID 변환
export function getRegionFromAddress(address: string): string {
  if (!address) return '기타'
  if (address.startsWith('서울')) return '서울'
  if (address.startsWith('부산')) return '부산'
  if (address.startsWith('대구')) return '대구'
  if (address.startsWith('인천')) return '인천'
  if (address.startsWith('광주')) return '광주'
  if (address.startsWith('대전')) return '대전'
  if (address.startsWith('울산')) return '울산'
  if (address.startsWith('세종')) return '세종'
  if (address.startsWith('경기')) return '경기'
  if (address.startsWith('강원')) return '강원'
  if (address.startsWith('충청북도') || address.startsWith('충북')) return '충북'
  if (address.startsWith('충청남도') || address.startsWith('충남')) return '충남'
  if (address.startsWith('전라북도') || address.startsWith('전북특별자치도') || address.startsWith('전북')) return '전북'
  if (address.startsWith('전라남도') || address.startsWith('전남')) return '전남'
  if (address.startsWith('경상북도') || address.startsWith('경북')) return '경북'
  if (address.startsWith('경상남도') || address.startsWith('경남')) return '경남'
  if (address.startsWith('제주')) return '제주'
  return '기타'
}

// 좌표 → 지역 ID 변환 (광역시/도 bounds 순서로 매칭)
export function getRegionFromCoords(lat: number, lng: number): string | null {
  for (const [regionId, bounds] of Object.entries(REGION_BOUNDS)) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng) {
      return regionId
    }
  }
  return null
}

// city 필드(theater.city) → 지역 ID 변환 (MapView에서 사용)
export function getRegionFromCity(city: string): string {
  const metropolis = ['서울', '부산', '대구', '인천', '광주', '대전', '울산']
  if (metropolis.includes(city)) return city
  const mapping: Record<string, string> = {
    '경기': '경기',
    '파주': '경기',
    '안산': '경기',
    '수원': '경기',
    '강원': '강원',
    '철원': '강원',
    '제천': '강원',
    '충북': '충북',
    '충남': '충남',
    '전북': '전북',
    '전주': '전북',
    '전남': '전남',
    '목포': '전남',
    '경북': '경북',
    '경남': '경남',
    '창원': '경남',
    '밀양': '경남',
    '김해': '경남',
    '제주': '제주',
    '세종': '세종',
  }
  return mapping[city] ?? '기타'
}
