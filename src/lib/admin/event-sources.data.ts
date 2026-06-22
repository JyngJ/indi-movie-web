import type { AdminEventSource } from '@/types/admin'

export const ADMIN_EVENT_SOURCES: AdminEventSource[] = [

  // ── 한국영상자료원 시네마테크 KOFA ─────────────────────────────────────────
  // GV 필터 URL. 기존 kofaCinematheque 파서와 별도로 event_candidates 전용 파서.
  {
    id: 'evt-kofa-cinematheque',
    theaterId: '',
    theaterName: '시네마테크KOFA',
    homepageUrl: 'https://www.koreafilm.or.kr/cinematheque',
    listingUrl: 'https://www.koreafilm.or.kr/cinematheque/schedule?keySort=GV',
    parser: 'kofaCinemathequeEvents',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'GV 필터링된 상영 일정. cm-icon-screen-1 클래스로 GV 회차 식별.',
  },

  // ── 더숲아트시네마 ─────────────────────────────────────────────────────────
  // imweb board /25 — 숲톡(GV), 씨네모어(talk) 공지
  {
    id: 'evt-deosup-events',
    theaterId: '',
    theaterName: '더숲 아트시네마',
    homepageUrl: 'https://deosup.com',
    listingUrl: 'https://deosup.com/25',
    parser: 'deosupEvents',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: '숲톡=GV, 씨네모어=talk. 목록 페이지에서 제목+날짜 추출. 게스트는 포스트 본문 미구현.',
  },

  // ── 씨네큐브 광화문 ────────────────────────────────────────────────────────
  // /event/EG002 = 씨네토크 목록. 날짜 범위 + 영화제목만 추출 (정확한 시간은 이미지).
  {
    id: 'evt-cinecube-events',
    theaterId: '',
    theaterName: '씨네큐브 광화문',
    homepageUrl: 'https://cinecube.co.kr',
    listingUrl: 'https://cinecube.co.kr/event/EG002',
    parser: 'cinecubeEvents',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: '씨네토크 카테고리(EG002). 날짜 범위 시작일만 저장. 정확한 시간은 이벤트 페이지 이미지에만 있음.',
  },

  // ── 인디스페이스 ──────────────────────────────────────────────────────────
  // Tistory 작품별 상영일정 카테고리. JSON-LD → 포스트 → description 파싱.
  // 인디토크 = GV. "일시:", "참석:" 패턴으로 날짜/게스트 추출.
  {
    id: 'evt-indispace-events',
    theaterId: '',
    theaterName: '인디스페이스',
    homepageUrl: 'https://indiespace.kr',
    listingUrl: 'https://indiespace.kr/category/Now%20Playing/%EC%9E%91%ED%92%88%EB%B3%84%20%EC%83%81%EC%98%81%EC%9D%BC%EC%A0%95',
    parser: 'indispaceEvents',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: '인디토크=GV. JSON-LD description에서 "일시:", "참석:" 파싱. 게스트 이름 자동 추출.',
  },

  // ── 라이카시네마 ───────────────────────────────────────────────────────────
  // 우주토크(GV). /program?category=1M84541271 = GV 카테고리 필터.
  // imweb board, JSON-LD description에 "일시 -", "참석 -" 패턴.
  {
    id: 'evt-laika-cinema-events',
    theaterId: '',
    theaterName: '라이카시네마',
    homepageUrl: 'https://laikacinema.com',
    listingUrl: 'https://laikacinema.com/program?category=1M84541271',
    parser: 'laikaCinemaEvents',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: '우주토크(GV). GV 카테고리(1M84541271). JSON-LD description에서 일시/참석 파싱.',
  },

  // ── 에무시네마 ─────────────────────────────────────────────────────────────
  // emuartspace.com은 JS 리다이렉트로 크롤 불가.
  // 대신 Naver 블로그 RSS: GV/씨네토크 포스트 필터링.
  // 예매는 Dtryx indieart(CinemaCd=000069) + Naver 예매(biz 83782).
  {
    id: 'evt-emu-artspace',
    theaterId: '',
    theaterName: '에무시네마',
    homepageUrl: 'https://emuartspace.com',
    listingUrl: 'https://rss.blog.naver.com/emuartspace.xml',
    parser: 'emuBoard',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'Naver 블로그 RSS. GV/씨네토크 포스트만 파싱. 포스트 본문: 일시/참석/진행 필드.',
  },
]
