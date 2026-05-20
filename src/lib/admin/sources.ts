import type { AdminTheaterSource } from '@/types/admin'

// Dtryx cgid shared by both BrandCd=scinema (scinema.org) and BrandCd=etc
const DTRYX_CGID = 'FE8EF4D2-F22D-4802-A39A-D58F23A29C1E'

// BrandCd=scinema — Korean Film Council (KOFIC) small cinema portal
// Theaters with their own {sub}.scinema.org subdomain use it as origin.
// Theaters without their own subdomain fall back to www.scinema.org.
// theaterName must fuzzy-match the CinemaNmNat in the Dtryx API CinemaList.

// BrandCd=etc — independent theaters that use www.dtryx.com for ticketing.
// theaterName must fuzzy-match the CinemaNmNat in the Dtryx API CinemaList.

export const ADMIN_THEATER_SOURCES: AdminTheaterSource[] = [

  // ── 강원 (scinema.org — own subdomain) ──────────────────────────

  {
    id: 'src-gohan-scinema',
    theaterId: '',
    theaterName: '고한시네마',
    homepageUrl: 'https://gohan.scinema.org',
    listingUrl: `https://gohan.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000011`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },
  {
    id: 'src-hongcheon-scinema',
    theaterId: '',
    theaterName: '홍천시네마',
    homepageUrl: 'https://hongcheon.scinema.org',
    listingUrl: `https://hongcheon.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000004`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },
  {
    id: 'src-yangyang-scinema',
    theaterId: '',
    theaterName: '양양작은영화관',
    homepageUrl: 'https://yangyang.scinema.org',
    listingUrl: `https://yangyang.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000013`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },
  {
    id: 'src-yanggu-scinema',
    theaterId: '',
    theaterName: '양구정중앙시네마',
    homepageUrl: 'https://yanggu.scinema.org',
    listingUrl: `https://yanggu.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000034`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'theaters-to-add.ts에서 "정중앙시네마"로 등록',
  },
  {
    id: 'src-jeongseon-scinema',
    theaterId: '',
    theaterName: '아리아리정선시네마',
    homepageUrl: 'https://jeongseon.scinema.org',
    listingUrl: `https://jeongseon.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000030`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'theaters-to-add.ts에서 "정선시네마"로 등록',
  },
  {
    id: 'src-samcheok-scinema',
    theaterId: '',
    theaterName: '삼척영화관',
    homepageUrl: 'https://samcheok.scinema.org',
    listingUrl: `https://samcheok.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000026`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'theaters-to-add.ts에서 "가람영화관"으로 등록. API상 명칭은 삼척영화관.',
  },
  {
    id: 'src-pyeongchang-scinema',
    theaterId: '',
    theaterName: 'HAPPY700평창시네마',
    homepageUrl: 'https://happy700.scinema.org',
    listingUrl: `https://happy700.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000023`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'theaters-to-add.ts에서 "평창시네마"로 등록',
  },

  // ── 강원 (scinema.org — www.scinema.org 공유) ───────────────────

  {
    id: 'src-yeongwol-scinema',
    theaterId: '',
    theaterName: '영월시네마',
    homepageUrl: 'https://www.scinema.org',
    listingUrl: `https://www.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000020`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },
  {
    id: 'src-cheolwon-scinema',
    theaterId: '',
    theaterName: '철원작은영화관',
    homepageUrl: 'https://www.scinema.org',
    listingUrl: `https://www.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000027`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'theaters-to-add.ts에서 "뚜루"로 등록. API상 명칭은 철원작은영화관.',
  },
  {
    id: 'src-hwacheon-scinema',
    theaterId: '',
    theaterName: '화천군작은영화관',
    homepageUrl: 'https://www.scinema.org',
    listingUrl: `https://www.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000018`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'theaters-to-add.ts에서 "산천어시네마"로 등록. API상 명칭은 화천군작은영화관.',
  },

  // ── 충남 (scinema.org — own subdomain) ──────────────────────────

  {
    id: 'src-cheongyang-scinema',
    theaterId: '',
    theaterName: '청양시네마',
    homepageUrl: 'https://cheongyang.scinema.org',
    listingUrl: `https://cheongyang.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000033`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },

  // ── 충남 (scinema.org — www) ─────────────────────────────────────

  {
    id: 'src-geumsan-scinema',
    theaterId: '',
    theaterName: '금산시네마',
    homepageUrl: 'https://www.scinema.org',
    listingUrl: `https://www.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000106`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },

  // ── 전북 (scinema.org — www) ─────────────────────────────────────

  {
    id: 'src-buan-scinema',
    theaterId: '',
    theaterName: '부안마실영화관',
    homepageUrl: 'https://www.scinema.org',
    listingUrl: `https://www.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000017`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'theaters-to-add.ts에서 "마실영화관"으로 등록',
  },
  {
    id: 'src-wanju-scinema',
    theaterId: '',
    theaterName: '완주휴시네마',
    homepageUrl: 'https://www.scinema.org',
    listingUrl: `https://www.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000143`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'theaters-to-add.ts에서 "휴시네마"로 등록',
  },
  {
    id: 'src-nh-scinema',
    theaterId: '',
    theaterName: 'NH시네마',
    homepageUrl: 'https://www.scinema.org',
    listingUrl: `https://www.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000087`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },

  // ── 전남 (scinema.org — own subdomain) ──────────────────────────

  {
    id: 'src-yeonggwang-scinema',
    theaterId: '',
    theaterName: '영광작은영화관',
    homepageUrl: 'https://yeonggwang.scinema.org',
    listingUrl: `https://yeonggwang.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000074`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },

  // ── 전남 (scinema.org — www) ─────────────────────────────────────

  {
    id: 'src-gokseong-scinema',
    theaterId: '',
    theaterName: '곡성작은영화관',
    homepageUrl: 'https://www.scinema.org',
    listingUrl: `https://www.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000154`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },
  {
    id: 'src-hwasun-scinema',
    theaterId: '',
    theaterName: '화순시네마',
    homepageUrl: 'https://www.scinema.org',
    listingUrl: `https://www.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000035`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },
  {
    id: 'src-jindo-scinema',
    theaterId: '',
    theaterName: '진도아리랑시네마',
    homepageUrl: 'https://www.scinema.org',
    listingUrl: `https://www.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000042`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'theaters-to-add.ts에서 "아리랑시네마"로 등록',
  },

  // ── 경북 (scinema.org — www) ─────────────────────────────────────

  {
    id: 'src-yeongyang-scinema',
    theaterId: '',
    theaterName: '영양작은영화관',
    homepageUrl: 'https://www.scinema.org',
    listingUrl: `https://www.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000012`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },
  {
    id: 'src-goryeong-scinema',
    theaterId: '',
    theaterName: '고령대가야시네마',
    homepageUrl: 'https://www.scinema.org',
    listingUrl: `https://www.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000024`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'theaters-to-add.ts에서 "대가야시네마"로 등록',
  },

  // ── 경남 (scinema.org — www) ─────────────────────────────────────

  {
    id: 'src-hapcheon-scinema',
    theaterId: '',
    theaterName: '합천시네마',
    homepageUrl: 'https://www.scinema.org',
    listingUrl: `https://www.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000028`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },

  // ── 제주 (scinema.org — own subdomain) ──────────────────────────

  {
    id: 'src-hallim-scinema',
    theaterId: '',
    theaterName: '한림작은영화관',
    homepageUrl: 'https://hallim.scinema.org',
    listingUrl: `https://hallim.scinema.org/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=scinema&CinemaCd=000045`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },

  // ── 인천 (BrandCd=etc, www.dtryx.com) ───────────────────────────

  {
    id: 'src-aekwan-etc',
    theaterId: '',
    theaterName: '애관극장',
    homepageUrl: 'https://www.dtryx.com',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=etc&CinemaCd=000100`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },

  // ── 대전 (BrandCd=etc, www.dtryx.com) ───────────────────────────

  {
    id: 'src-cineindiU-etc',
    theaterId: '',
    theaterName: '씨네인디U',
    homepageUrl: 'https://www.dtryx.com',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=etc&CinemaCd=000098`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'theaters-to-add.ts에서 "씨네 인디유"로 등록',
  },

  // ── 충남 (BrandCd=etc, www.dtryx.com) ───────────────────────────

  {
    id: 'src-geumsung-etc',
    theaterId: '',
    theaterName: '금성시네마',
    homepageUrl: 'https://www.dtryx.com',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=etc&CinemaCd=000107`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },

  // ── 전남 (BrandCd=etc, www.dtryx.com) ───────────────────────────

  {
    id: 'src-cinemamm-etc',
    theaterId: '',
    theaterName: '시네마엠엠',
    homepageUrl: 'https://cinemamm.petitecine.com',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=etc&CinemaCd=000146`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'theaters-to-add.ts에서 "시네마라운지MM"으로 등록. API상 명칭은 시네마엠엠.',
  },

  // ── 경남 (BrandCd=etc, www.dtryx.com) ───────────────────────────

  {
    id: 'src-miryang-etc',
    theaterId: '',
    theaterName: '밀양시네마',
    homepageUrl: 'https://www.dtryx.com',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=etc&CinemaCd=000092`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },

  // ── 부산 (BrandCd=etc, www.dtryx.com) ───────────────────────────

  {
    id: 'src-corner-etc',
    theaterId: '',
    theaterName: '모퉁이극장',
    homepageUrl: 'https://www.dtryx.com',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=etc&CinemaCd=000097`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'theaters-to-add.ts에서 "BNK부산은행 아트시네마 모퉁이극장"으로 등록',
  },

  // ── 경남 (BrandCd=indieart, www.dtryx.com) ──────────────────────

  {
    id: 'src-rhizome-indieart',
    theaterId: '',
    theaterName: '씨네아트 리좀',
    homepageUrl: 'https://espacerhizome.com',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=indieart&CinemaCd=000053`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
    notes: 'theaters-to-add.ts에서 "씨네아트리좀"으로 등록',
  },

  // ── 경북 (BrandCd=indieart, www.dtryx.com) ──────────────────────

  {
    id: 'src-indieplusph-indieart',
    theaterId: '',
    theaterName: '인디플러스 포항',
    homepageUrl: 'https://culturalspace.phcf.or.kr/joongangArtHall/indiplus.do',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=indieart&CinemaCd=000057`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },

  // ── 대구 (BrandCd=indieart, www.dtryx.com) ──────────────────────

  {
    id: 'src-55cine-indieart',
    theaterId: '',
    theaterName: '오오극장',
    homepageUrl: 'http://55cine.com',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=indieart&CinemaCd=000059`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },

  // ── 전북 (BrandCd=indieart, www.dtryx.com) ──────────────────────

  {
    id: 'src-jiff-indieart',
    theaterId: '',
    theaterName: '전주디지털독립영화관',
    homepageUrl: 'http://www.jeonjucinecomplex.kr',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=indieart&CinemaCd=000061`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },

  // ── 광주 (BrandCd=indieart, www.dtryx.com) ──────────────────────

  {
    id: 'src-gwangjucinema-indieart',
    theaterId: '',
    theaterName: '광주극장',
    homepageUrl: 'https://cinemagwangju.modoo.at',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=indieart&CinemaCd=000066`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },

  // ── 충남 (BrandCd=indieart, www.dtryx.com) ──────────────────────

  {
    id: 'src-indieplusca-indieart',
    theaterId: '',
    theaterName: '인디플러스 천안',
    homepageUrl: 'https://xn--2z1bz7ch1njvc5tdy9k60p.kr',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=indieart&CinemaCd=000068`,
    parser: 'dtryxReservationApi',
    enabled: true,
    cadence: 'daily',
    health: 'healthy',
  },

  // ── Dtryx HiddenYn=Y — 수집 불가 (enabled: false) ───────────────
  // CinemaCd는 API에 존재하지만 HiddenYn=Y 처리돼 dtryxReservationApi crawler가 건너뜀.

  {
    id: 'src-joongang-andong-disabled',
    theaterId: '',
    theaterName: '안동중앙시네마',
    homepageUrl: 'https://www.dtryx.com',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=etc&CinemaCd=000051`,
    parser: 'dtryxReservationApi',
    enabled: false,
    cadence: 'daily',
    health: 'degraded',
    notes: 'Dtryx CinemaCd=000051 HiddenYn=Y — API 목록에서 제외됨, 크롤 불가. theaters-to-add.ts에서 "중앙시네마"로 등록.',
  },
  {
    id: 'src-daejeonart-disabled',
    theaterId: '',
    theaterName: '대전아트시네마',
    homepageUrl: 'https://www.dtryx.com',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=etc&CinemaCd=000056`,
    parser: 'dtryxReservationApi',
    enabled: false,
    cadence: 'daily',
    health: 'degraded',
    notes: 'Dtryx CinemaCd=000056 HiddenYn=Y — API 목록에서 제외됨, 크롤 불가.',
  },
  {
    id: 'src-sangsangmadang-disabled',
    theaterId: '',
    theaterName: 'KT&G 상상마당',
    homepageUrl: 'https://www.dtryx.com',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=indieart&CinemaCd=000089`,
    parser: 'dtryxReservationApi',
    enabled: false,
    cadence: 'daily',
    health: 'degraded',
    notes: 'Dtryx CinemaCd=000089 HiddenYn=Y — API 목록에서 제외됨, 크롤 불가. sangsangmadang.com 별도 시스템도 미지원.',
  },
  {
    id: 'src-juancine-disabled',
    theaterId: '',
    theaterName: '영화공간주안',
    homepageUrl: 'https://www.dtryx.com',
    listingUrl: `https://www.dtryx.com/cinema/main.do?cgid=${DTRYX_CGID}&BrandCd=etc&CinemaCd=000094`,
    parser: 'dtryxReservationApi',
    enabled: false,
    cadence: 'daily',
    health: 'degraded',
    notes: 'Dtryx CinemaCd=000094 HiddenYn=Y — API 목록에서 제외됨, 크롤 불가.',
  },

  // ── 비 Dtryx 시스템 — 파서 미지원 (enabled: false) ──────────────
  // 별도 예매 시스템 사용. 호환 파서 구현 전까지 비활성.

  {
    id: 'src-gangneung-sinnyeong-disabled',
    theaterId: '',
    theaterName: '강릉독립예술극장 신영',
    homepageUrl: 'http://www.gncine.kr',
    listingUrl: 'http://www.gncine.kr',
    parser: 'tableText',
    enabled: false,
    cadence: 'daily',
    health: 'degraded',
    notes: 'gncine.kr 자체 시스템. 호환 파서 없음.',
  },
  {
    id: 'src-sangsangmadang-chuncheon-disabled',
    theaterId: '',
    theaterName: 'KT&G 상상마당시네마 춘천',
    homepageUrl: 'https://www.sangsangmadang.com',
    listingUrl: 'https://www.sangsangmadang.com/movie/list',
    parser: 'tableText',
    enabled: false,
    cadence: 'daily',
    health: 'degraded',
    notes: 'sangsangmadang.com 자체 시스템. 호환 파서 없음.',
  },
  {
    id: 'src-picturehouse-disabled',
    theaterId: '',
    theaterName: '픽쳐하우스',
    homepageUrl: 'https://picturehouse.moonhwain.kr:447',
    listingUrl: 'https://picturehouse.moonhwain.kr:447',
    parser: 'tableText',
    enabled: false,
    cadence: 'daily',
    health: 'degraded',
    notes: 'moonhwain.net 계열 자체 시스템. 호환 파서 없음.',
  },
  {
    id: 'src-gift-gwangju-disabled',
    theaterId: '',
    theaterName: '광주독립영화관',
    homepageUrl: 'http://gift4u.or.kr',
    listingUrl: 'http://gift4u.or.kr',
    parser: 'tableText',
    enabled: false,
    cadence: 'daily',
    health: 'degraded',
    notes: 'gift4u.or.kr 자체 시스템. 호환 파서 없음.',
  },
  {
    id: 'src-jcinema-jeonju-disabled',
    theaterId: '',
    theaterName: '전주 시네마타운',
    homepageUrl: 'https://jcinema.moonhwain.net:451',
    listingUrl: 'https://jcinema.moonhwain.net:451',
    parser: 'tableText',
    enabled: false,
    cadence: 'daily',
    health: 'degraded',
    notes: 'moonhwain.net 계열 자체 시스템. 호환 파서 없음.',
  },
  {
    id: 'src-joyn-jeonju-disabled',
    theaterId: '',
    theaterName: '조이앤시네마 전주',
    homepageUrl: 'https://joyn.moonhwain.net:451',
    listingUrl: 'https://joyn.moonhwain.net:451',
    parser: 'tableText',
    enabled: false,
    cadence: 'daily',
    health: 'degraded',
    notes: 'moonhwain.net 계열 자체 시스템. 호환 파서 없음.',
  },
  {
    id: 'src-dureraum-busan-disabled',
    theaterId: '',
    theaterName: '영화의전당',
    homepageUrl: 'https://www.dureraum.org',
    listingUrl: 'https://www.dureraum.org',
    parser: 'tableText',
    enabled: false,
    cadence: 'daily',
    health: 'degraded',
    notes: 'dureraum.org 자체 시스템. 호환 파서 없음.',
  },

]

export const SAMPLE_CRAWL_HTML = `
<section class="schedule">
  <article class="showtime" data-screen="1관">
    <time datetime="2026-05-04T13:20:00+09:00">2026.05.04 13:20</time>
    <strong>우리에게 내일은 없다</strong>
    <span>2K</span><span>95석</span><a href="https://booking.example/1">예매</a>
  </article>
  <article class="showtime" data-screen="2관">
    <time datetime="2026-05-04T16:10:00+09:00">2026.05.04 16:10</time>
    <strong>초록밤</strong>
    <span>GV</span><span>잔여 42/80</span><a href="https://booking.example/2">예매</a>
  </article>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": "수라",
    "startDate": "2026-05-05T19:30:00+09:00",
    "location": { "name": "인디스페이스 1관" },
    "offers": { "url": "https://booking.example/3", "price": "12000" }
  }
  </script>
</section>
`

export const SAMPLE_CRAWL_CSV = `movieTitle,showDate,showTime,screenName,formatType,seatAvailable,seatTotal,price,bookingUrl
지난 여름,2026-05-05,11:30,1관,standard,64,96,11000,https://booking.example/4
해야 할 일,2026-05-05,14:20,2관,2k,23,80,12000,https://booking.example/5`
