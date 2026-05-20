// 예술영화관 크롤링 소스 설정
export const crawlSourcesToAdd = [
  // ── 인천광역시 ──────────────────────────────────────────────────────
  {
    theaterName: '제물포극장',
    matchedTheaterId: '', // 어드민에서 극장 추가 후 ID 입력
    homepageUrl: 'https://jemulpo.cinema.or.kr',
    listingUrl: 'https://jemulpo.cinema.or.kr/schedule',
    parser: 'tableText',
    cadence: 'daily',
    notes: '인천 미추홀구 주안역 근처. 독립영화 중심 상영.',
  },
  {
    theaterName: '주안영상미디어센터',
    matchedTheaterId: '',
    homepageUrl: 'http://www.incheon-media.or.kr',
    listingUrl: 'http://www.incheon-media.or.kr/program',
    parser: 'tableText',
    cadence: 'weekly',
    notes: '미추홀구. 032-872-2622로 전화 문의 후 시간표 확인.',
  },
  {
    theaterName: '인천미림극장',
    matchedTheaterId: '',
    homepageUrl: 'https://incheon-mirim.scinema.org',
    listingUrl: 'https://incheon-mirim.scinema.org/schedule',
    parser: 'tableText',
    cadence: 'daily',
    notes: '동인천역 4번 출구 근처. 유일한 멀티플렉스 극장.',
  },

  // ── 경기도 ──────────────────────────────────────────────────────
  {
    theaterName: '헤이리시네마',
    matchedTheaterId: '',
    homepageUrl: 'https://www.heyricinema.kr',
    listingUrl: 'https://www.heyricinema.kr/schedule',
    parser: 'tableText',
    cadence: 'weekly',
    notes: '파주 헤이리 예술마을. 문화 공간과 함께 운영.',
  },
  {
    theaterName: '명필름 아트센터',
    matchedTheaterId: '',
    homepageUrl: 'https://www.myungfilm.com',
    listingUrl: 'https://www.myungfilm.com/schedule',
    parser: 'tableText',
    cadence: 'manual',
    notes: '파주시 회동길. 2026년 2월 1일 운영 종료 예정 (아카이빙용)',
  },
  {
    theaterName: '부천시민미디어센터',
    matchedTheaterId: '',
    homepageUrl: 'https://www.bucheon.go.kr/culture',
    listingUrl: 'https://www.bucheon.go.kr/culture/cinema',
    parser: 'tableText',
    cadence: 'weekly',
    notes: '복사골문화센터 6층. 공공 영상미디어센터.',
  },
  {
    theaterName: '수원시미디어센터',
    matchedTheaterId: '', // 이미 mock에 있으니 기존 ID로 연결
    homepageUrl: 'https://www.suwonmedia.kr',
    listingUrl: 'https://www.suwonmedia.kr/program',
    parser: 'tableText',
    cadence: 'weekly',
    notes: '수원화성 내 원도심. 한옥 형태의 건물.',
  },
  {
    theaterName: '성남미디어센터',
    matchedTheaterId: '',
    homepageUrl: 'https://www.sngov.or.kr/culture',
    listingUrl: 'https://www.sngov.or.kr/culture/cinema',
    parser: 'tableText',
    cadence: 'weekly',
    notes: '분당구 성남대로. 공공 영상미디어센터.',
  },
  {
    theaterName: '고양영상미디어센터',
    matchedTheaterId: '',
    homepageUrl: 'https://www.goyang.go.kr/culture',
    listingUrl: 'https://www.goyang.go.kr/culture/cinema',
    parser: 'tableText',
    cadence: 'weekly',
    notes: '덕양구 어울림로. 고양시 공공 영상 문화 공간.',
  },

  // ── 강원특별자치도 ──────────────────────────────────────────────────────
  {
    theaterName: '강릉독립예술극장 신영',
    matchedTheaterId: '',
    homepageUrl: 'http://www.gncine.kr',
    listingUrl: 'http://www.gncine.kr/schedule',
    parser: 'tableText',
    cadence: 'weekly',
    notes: '강릉시 경강로. 1991년 개관 후 2012년 독립예술극장으로 재개관.',
  },
  {
    theaterName: 'KT&G 상상마당시네마 춘천',
    matchedTheaterId: '',
    homepageUrl: 'https://www.sangsangmadang.com',
    listingUrl: 'https://www.sangsangmadang.com/movie/list',
    parser: 'timelineCard',
    cadence: 'daily',
    notes: '춘천시 스포츠타운길. KT&G 후원 문화 공간.',
  },
  {
    theaterName: '가람영화관',
    matchedTheaterId: '',
    homepageUrl: 'https://samcheok.scinema.org',
    listingUrl: 'https://samcheok.scinema.org/schedule',
    parser: 'tableText',
    cadence: 'weekly',
    notes: '삼척시 엑스포로. 지역 예술 영화관.',
  },
  {
    theaterName: '원주영상미디어센터 모두',
    matchedTheaterId: '',
    homepageUrl: 'https://www.wjmedia.kr',
    listingUrl: 'https://www.wjmedia.kr/program',
    parser: 'tableText',
    cadence: 'weekly',
    notes: '원주시 원일로. 공공 영상미디어센터.',
  },

  // ── 크롤링 우선순위 (수동 시작 권장)
  // 1. 제물포극장, 인천미림극장 (인천)
  // 2. 헤이리시네마, 부천시민미디어센터 (경기)
  // 3. 강릉독립예술극장, KT&G 상상마당 춘천 (강원)
]

export type CrawlSourceInput = typeof crawlSourcesToAdd[0]
