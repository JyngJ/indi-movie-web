export type GvStatus = '예매 가능' | '매진 임박' | '매진'
export type GvEventType = 'GV' | '토크' | '상영회' | '이벤트'

export interface GvEvent {
  id: string
  theaterName: string
  movie: string
  guest?: string
  time: string
  status: GvStatus
  type: GvEventType
  hue: number
  label: string
  movieNote?: string
  gvNote?: string
  subtitle?: string
  posterUrl?: string
  bookingUrl?: string
  seatTotal?: number
  seatAvailable?: number
}

// Mock data — will be replaced by real theater_events query
export const GV_EVENTS: GvEvent[] = [
  {
    id: 'gv-mock-1',
    theaterName: '인디스페이스',
    movie: '고독의 오후',
    guest: '알베르 세라 감독',
    time: '6/22 18:30',
    status: '예매 가능',
    type: 'GV',
    hue: 210,
    label: '고',
    movieNote: '스페인 독립영화의 거장 알베르 세라 신작',
    gvNote: '상영 후 감독 Q&A 진행 예정입니다.',
    bookingUrl: 'https://indiespace.kr/category/Now%20Playing/%EC%9E%91%ED%92%88%EB%B3%84%20%EC%83%81%EC%98%81%EC%9D%BC%EC%A0%95',
  },
  {
    id: 'gv-mock-2',
    theaterName: '에무시네마',
    movie: '빛의 목소리',
    guest: '박소영 감독 · 이지원 배우',
    time: '6/21 20:00',
    status: '매진 임박',
    type: 'GV',
    hue: 30,
    label: '빛',
    movieNote: '2024 전주국제영화제 관객상',
    gvNote: '감독 및 주연배우 참석, 사인회 예정',
    bookingUrl: 'https://www.dtryx.com/cinema/main.do?cgid=FE8EF4D2-F22D-4802-A39A-D58F23A29C1E&BrandCd=indieart&CinemaCd=000069',
    seatTotal: 30,
    seatAvailable: 3,
  },
  {
    id: 'gv-mock-4',
    theaterName: '에무시네마',
    movie: '여름의 끝에서',
    guest: '에무시네마 × 필름소사이어티',
    time: '6/25 19:30',
    status: '예매 가능',
    type: '토크',
    hue: 270,
    label: '여',
    movieNote: '2023 로카르노 영화제 초청작',
    gvNote: '상영 후 큐레이터 토크 진행',
    bookingUrl: 'https://www.dtryx.com/cinema/main.do?cgid=FE8EF4D2-F22D-4802-A39A-D58F23A29C1E&BrandCd=indieart&CinemaCd=000069',
  },
  {
    id: 'gv-emu-5',
    theaterName: '에무시네마',
    movie: '별빛영화제',
    subtitle: '콜 미 바이 유어 네임',
    posterUrl: 'https://file.koreafilm.or.kr/thm/02/99/19/08/tn_DPF031639.jpg',
    time: '6/27 19:30',
    status: '예매 가능',
    type: '상영회',
    hue: 220,
    label: '별',
    movieNote: '에무시네마 옥상 야외상영 — 매주 목~일 / Call Me by Your Name (2017)',
    gvNote: '극장 옥상에서 별빛 아래 영화를 봅니다. 빈백 제공, 음료 판매. 우천 시 실내 상영.',
    bookingUrl: 'https://www.dtryx.com/cinema/main.do?cgid=FE8EF4D2-F22D-4802-A39A-D58F23A29C1E&BrandCd=indieart&CinemaCd=000069',
  },
  {
    id: 'gv-emu-6',
    theaterName: '에무시네마',
    movie: '로봇 드림',
    time: '6/22 15:00',
    status: '예매 가능',
    type: '상영회',
    hue: 180,
    label: '로',
    posterUrl: 'https://file.koreafilm.or.kr/thm/02/99/18/56/tn_DPF030038.jpg',
    movieNote: '2023 아카데미 장편애니메이션 후보',
    gvNote: '뱃지 패키지 특별 상영. 에무시네마 뱃지 증정.',
    bookingUrl: 'https://www.dtryx.com/cinema/main.do?cgid=FE8EF4D2-F22D-4802-A39A-D58F23A29C1E&BrandCd=indieart&CinemaCd=000069',
  },
  {
    id: 'gv-emu-7',
    theaterName: '에무시네마',
    movie: '팔므도르 특별전',
    time: '6/28 14:00',
    status: '예매 가능',
    type: '이벤트',
    hue: 350,
    label: '팔',
    movieNote: '황금종려상 수상작 3편 연속 상영',
    gvNote: '〈피아니스트〉 〈흰 리본〉 〈파리 텍사스〉 — 3편 연속, 중간 휴식 포함.',
    bookingUrl: 'https://www.dtryx.com/cinema/main.do?cgid=FE8EF4D2-F22D-4802-A39A-D58F23A29C1E&BrandCd=indieart&CinemaCd=000069',
  },
  {
    id: 'gv-mock-3',
    theaterName: '시네마테크KOFA',
    movie: '무명의 시간',
    guest: '오주환 감독',
    time: '6/23 19:00',
    status: '예매 가능',
    type: 'GV',
    hue: 155,
    label: '무',
    movieNote: '베를린 포럼 부문 공식 선정작',
    gvNote: '관객과의 대화 — 감독 참석',
    bookingUrl: 'https://www.koreafilm.or.kr/cinematheque/schedule',
  },
]
