export type TheaterKind = 'indie' | 'cgv' | 'mega' | 'lotte'

export interface MockTheater {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  kind: TheaterKind
  website?: string   // 영화관 공식 웹사이트
}

// ⚠️ MOCK 데이터 주의사항
// 아래 좌표값은 도로명주소 기반으로 임의로 입력한 값이며 정확하지 않습니다.
// 릴리즈 전 반드시 Google Maps / 네이버지도 / 카카오맵 API로 실제 좌표를 검증·교체해야 합니다.
// 같은 건물에 입주한 극장의 경우 지도상 겹침 방지를 위해 약 0.0002~0.0003도 오프셋을 적용했습니다.

export const MOCK_THEATERS: MockTheater[] = [
  // ── 서울 ──────────────────────────────────────────────────────
  { id: 'indiespace',     name: '인디스페이스',        address: '서울 마포구 양화로 176 롯데시네마 홍대입구 8층',        lat: 37.5564,            lng: 126.9237,            kind: 'indie', website: 'https://www.indiespace.kr' },
  { id: 'artnine',        name: '아트나인',             address: '서울 동작구 동작대로 89 골든시네마타워 12층',            lat: 37.4868,            lng: 126.9818,            kind: 'indie' },
  { id: 'emu',            name: '에무시네마',            address: '서울 종로구 경희궁1가길 7',                              lat: 37.5706,            lng: 126.9694,            kind: 'indie', website: 'https://www.emucinema.com' },
  { id: 'laika',          name: '라이카시네마',          address: '서울 서대문구 연희로8길 18 스페이스독 B1층',             lat: 37.5672,            lng: 126.9259,            kind: 'indie', website: 'https://www.laikacinema.com' },
  { id: 'seoulartcinema', name: '서울아트시네마',        address: '서울 중구 정동길 3 경향아트힐 2층',                      lat: 37.5664,            lng: 126.9680,            kind: 'indie', website: 'https://www.cinematheque.seoul.kr' },
  { id: 'artmomo',        name: '아트하우스 모모',       address: '서울 서대문구 이화여대길 52 이화여대 ECC B402',          lat: 37.5620,            lng: 126.9463,            kind: 'indie', website: 'https://artmomo.ewha.ac.kr' },
  { id: 'ktgsangmang',    name: 'KT&G 상상마당 시네마', address: '서울 마포구 어울마당로 65 상상마당 홍대 지하 4층',       lat: 37.5527,            lng: 126.9244,            kind: 'indie', website: 'https://www.sangsangmadang.com' },
  { id: 'thesoop',        name: '더숲 아트시네마',       address: '서울 노원구 노해로 480 조광빌딩 지하1층',               lat: 37.6562,            lng: 127.0636,            kind: 'indie', website: 'https://thesoop.modoo.at' },
  { id: 'seoulfilmcenter',name: '서울영화센터',          address: '서울 중구 마른내로 38',                                  lat: 37.5657,            lng: 126.9936,            kind: 'indie', website: 'https://www.seoulfilmcenter.or.kr' },
  // 낙원빌딩 4층 — 동일 건물, 오프셋 적용
  { id: 'nangman',        name: '낭만극장',              address: '서울 종로구 삼일대로 428 낙원빌딩 4층',                  lat: 37.5712,            lng: 126.9881,            kind: 'indie' },
  { id: 'hollywood',      name: '허리우드클래식',        address: '서울 종로구 삼일대로 428 낙원빌딩 4층',                  lat: 37.5712 + 0.0003,   lng: 126.9881 + 0.0002,   kind: 'indie' },
  { id: 'cinecube',       name: '씨네큐브 광화문',       address: '서울 종로구 새문안로 68 흥국생명빌딩 지하 2층',          lat: 37.5712 - 0.0003,   lng: 126.9706,            kind: 'indie', website: 'https://www.cinecube.co.kr' },
  { id: 'arirang',        name: '아리랑시네센터',        address: '서울 성북구 아리랑로 82',                                lat: 37.5944,            lng: 127.0163,            kind: 'indie', website: 'https://www.arirang.or.kr' },

  // ── 경기 ──────────────────────────────────────────────────────
  { id: 'gyeonggi-indie', name: '경기인디시네마',        address: '경기 수원시 영통구 도청로 10 롯데몰 광교 4층',          lat: 37.2854,            lng: 127.0516,            kind: 'indie' },
  { id: 'jaro-drive',     name: '자유로자동차극장',      address: '경기 파주시 탄현면 필승로 432',                          lat: 37.7752,            lng: 126.7281,            kind: 'indie', website: 'https://www.jarodrive.com' },
  { id: 'heyri',          name: '헤이리시네마',          address: '경기 파주시 탄현면 헤이리마을길 93-119 지상 3층',       lat: 37.7892,            lng: 126.6961,            kind: 'indie' },
  { id: 'myeonghwa',      name: '명화극장',              address: '경기 안산시 단원구 중앙대로 921 동서코아 빌딩 지하2층', lat: 37.3219,            lng: 126.8331,            kind: 'indie' },
  { id: 'suwon-media',    name: '수원시미디어센터',      address: '경기 수원시 팔달구 창룡대로 64',                         lat: 37.2839,            lng: 127.0244,            kind: 'indie', website: 'https://www.suwonmedia.kr' },
]
