export type TheaterKind = 'indie' | 'cgv' | 'mega' | 'lotte'

export interface MockTheater {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  kind: TheaterKind
}

export const MOCK_THEATERS: MockTheater[] = [
  {
    id: 'indiespace',
    name: '인디스페이스',
    address: '서울 마포구 양화로 176 롯데시네마 홍대입구 8층',
    lat: 37.5564,
    lng: 126.9237,
    kind: 'indie',
  },
  {
    id: 'artnine',
    name: '아트나인',
    address: '서울 동작구 동작대로 89 골든시네마타워 12층',
    lat: 37.4868,
    lng: 126.9818,
    kind: 'indie',
  },
  {
    id: 'emu',
    name: '에무시네마',
    address: '서울 종로구 경희궁1가길 7',
    lat: 37.5706,
    lng: 126.9694,
    kind: 'indie',
  },
  {
    id: 'laika',
    name: '라이카시네마',
    address: '서울 서대문구 연희로8길 18 스페이스독 B1층',
    lat: 37.5672,
    lng: 126.9259,
    kind: 'indie',
  },
  {
    id: 'seoulartcinema',
    name: '서울아트시네마',
    address: '서울 중구 정동길 3 경향아트힐 2층',
    lat: 37.5664,
    lng: 126.9680,
    kind: 'indie',
  },
  {
    id: 'artmomo',
    name: '아트하우스 모모',
    address: '서울 서대문구 이화여대길 52 이화여대 ECC B402',
    lat: 37.5620,
    lng: 126.9463,
    kind: 'indie',
  },
  {
    id: 'ktgsangmang',
    name: 'KT&G 상상마당 시네마',
    address: '서울 마포구 어울마당로 65 상상마당 홍대 지하 4층',
    lat: 37.5527,
    lng: 126.9244,
    kind: 'indie',
  },
  {
    id: 'thesoop',
    name: '더숲 아트시네마',
    address: '서울 노원구 노해로 480 조광빌딩 지하1층',
    lat: 37.6562,
    lng: 127.0636,
    kind: 'indie',
  },
  {
    id: 'seoulfilmcenter',
    name: '서울영화센터',
    address: '서울 중구 마른내로 38',
    lat: 37.5657,
    lng: 126.9936,
    kind: 'indie',
  },
]
