import { describe, expect, it } from 'vitest'
import { SIFF_EVENT_SECTION, parseSiffTimetable, siffSectionName, splitSiffVenue } from './siffSchedule'

// siff.kr 상영시간표(2026-11-20 수집) 구조를 줄인 것
const ko = (text: string, en = 'EN') => `<span class="ff-lang ff-lang--ko">${text}</span><span class="ff-lang ff-lang--en" lang="en">${en}</span>`
const film = (slug: string, title: string) => `<a class="ff-timetable__film" href="https://siff.kr/films/${slug}/">${ko(title)}</a>`
const badge = (title: string) => `<li class="ff-timetable__badge ff-timetable__badge--event" title="${title}"><span aria-hidden="true">X</span></li>`
const card = (time: string, name: string, films: string, badges = '') =>
  `<li class="ff-timetable__card"><p class="ff-timetable__time">${time}</p><div class="ff-timetable__body"><h3 class="ff-timetable__name">${ko(name)}</h3><p class="ff-timetable__films">${films}</p><ul class="ff-timetable__badges">${badges}<li class="ff-timetable__badge ff-timetable__badge--age" title="12세 이상"><span aria-hidden="true">12</span></li></ul></div></li>`
const clock = (t: string) => `<span class="ff-timetable__clock"><time>${t}</time></span>`
const EMPTY = '<li class="ff-timetable__card ff-timetable__card--empty is-c5 is-c4" aria-hidden="true"></li>'

const PAGE = `
<section class="ff-timetable__day" id="ff-day-1126" data-date="20261126" role="tabpanel" hidden="">
  <section class="ff-timetable__venue"><h2 class="ff-archive__heading ff-timetable__venue-name">${ko('CGV<span class="ff-ko">압구정</span>(<span class="ff-ko">본관</span>) 3<span class="ff-ko">관</span>')}</h2><ul class="ff-timetable__grid">
    ${card(`${clock('12:30')} – ${clock('14:07')}`, '<span class="ff-ko">본선</span> <span class="ff-ko">단편경쟁</span> 3', `${film('%ec%bd%9c%eb%9d%bc', '콜라와 오차')} / ${film('dinner', '디너')}`)}
    ${EMPTY}
    ${card(`${clock('14:40')} – ${clock('16:16')}`, '본선 장편경쟁 3', film('baler', '베일러'), badge('감독 or 게스트와의 만남'))}
  </ul></section>
  <section class="ff-timetable__venue"><h2 class="ff-archive__heading ff-timetable__venue-name">${ko('CGV청담씨네시티 3관(컴포트석)')}</h2><ul class="ff-timetable__grid">
    ${card(`${clock('20:00')} – ${clock('21:30')}`, '마스터클래스', ko('변영주X윤가은: 다음 씬의 불확실성'), badge('마스터클래스'))}
  </ul></section>
</section>
<section class="ff-timetable__day" id="ff-day-1128" data-date="20261128" role="tabpanel" hidden="">
  <section class="ff-timetable__venue"><h2 class="ff-archive__heading ff-timetable__venue-name">${ko('CGV압구정(신관) ART2관')}</h2><ul class="ff-timetable__grid">
    <li class="ff-timetable__card"><p class="ff-timetable__time"><span class="ff-timetable__clock"><span class="ff-timetable__next">${ko('익일', 'Next day')}</span> <time>00:00</time></span> – ${clock('05:18')}</p><div class="ff-timetable__body"><h3 class="ff-timetable__name">${ko('심야상영: 밤새GO!')}</h3><p class="ff-timetable__films">${film('a', '파도 위에서 춤추는 여자')} / ${film('b', '귀(耳)로의 여행')}</p><ul class="ff-timetable__badges">${badge('시네토크')}</ul></div></li>
  </ul></section>
</section>`

describe('splitSiffVenue', () => {
  it('신관·본관을 한 극장으로 묶고 동 이름은 관 이름에 남긴다', () => {
    expect(splitSiffVenue('CGV압구정(신관) ART2관')).toEqual({ venue: 'CGV 압구정', screen: '신관 ART2관' })
    expect(splitSiffVenue('CGV압구정(본관) 3관')).toEqual({ venue: 'CGV 압구정', screen: '본관 3관' })
    expect(splitSiffVenue('CGV청담씨네시티 프리미엄관')).toEqual({ venue: 'CGV 청담씨네시티', screen: '프리미엄관' })
  })

  it('규칙에 없는 곳은 표기를 그대로 극장 이름으로 쓴다', () => {
    expect(splitSiffVenue('인디스페이스')).toEqual({ venue: '인디스페이스', screen: null })
  })
})

describe('siffSectionName', () => {
  it('섹션 안 묶음 번호를 뗀다', () => {
    expect(siffSectionName('본선 단편경쟁 3')).toBe('본선 단편경쟁')
    expect(siffSectionName('새로운선택')).toBe('새로운선택')
  })
})

describe('parseSiffTimetable', () => {
  const rows = parseSiffTimetable(PAGE)

  it('빈 칸을 건너뛰고 모든 날짜의 회차를 읽는다', () => {
    expect(rows).toHaveLength(4)
  })

  it('묶음상영은 제목을 +로 잇고 첫 편 페이지를 링크로 둔다', () => {
    expect(rows[0]).toEqual({
      screeningDate: '2026-11-26',
      startTime: '12:30',
      runtimeMin: 97,
      venueLabel: 'CGV 압구정',
      screenLabel: '본관 3관',
      title: '콜라와 오차 + 디너',
      section: '본선 단편경쟁',
      hasGv: false,
      programUrl: 'https://siff.kr/films/%ec%bd%9c%eb%9d%bc/',
    })
  })

  it('GV 배지를 읽는다', () => {
    expect(rows[1]).toMatchObject({ title: '베일러', section: '본선 장편경쟁', hasGv: true })
  })

  it('작품 없는 칸은 행사로 두고 행사 제목을 붙인다', () => {
    expect(rows[2]).toMatchObject({
      title: '마스터클래스 — 변영주X윤가은: 다음 씬의 불확실성',
      section: SIFF_EVENT_SECTION,
      hasGv: false,
      programUrl: null,
      venueLabel: 'CGV 청담씨네시티',
      screenLabel: '3관(컴포트석)',
    })
  })

  it('익일 회차는 다음 날짜로 넣고 시네토크도 손님 회차로 친다', () => {
    expect(rows[3]).toMatchObject({
      screeningDate: '2026-11-29',
      startTime: '00:00',
      runtimeMin: 318,
      title: '파도 위에서 춤추는 여자 + 귀(耳)로의 여행',
      section: '심야상영: 밤새GO!',
      hasGv: true,
    })
  })
})
