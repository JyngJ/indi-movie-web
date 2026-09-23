import { describe, expect, it } from 'vitest'
import { EVENT_SECTION, parseBiffRuntime, parseBiffScheduleDay, parseBiffSectionMap, splitBiffVenue } from './biffSchedule'

// biff.kr 날짜별 시간표(2026-09-19 수집) 구조를 줄인 것
const MENU = `
<li><a href='/kor/html/program/prog_list.asp?c_idx=428' target='_self'><span>개·폐막작</span></a></li>
<li><a href='/kor/html/program/prog_list.asp?c_idx=442' target='_self'><span>경쟁</span></a></li>
<li class='menu2_3'><a href='/kor/html/program/prog_list.asp?c_idx=442' target='_self'>경쟁</a></li>
<li><a href='/kor/html/program/prog_list.asp?c_idx=441' target='_self'><span>특별상영</span></a></li>`

const LEGEND = `<div class="grade_info"><span class="ico_grade ico_gv">GV</span>게스트와의 만남</div>`

const ROWS = `
<div class="tbl_schedule_wrap">${LEGEND}<div class="tbl_schedule tbl_schedule_date">
<div class="sch_li"><div class="sch_li_tit">CGV센텀시티 6관</div>
  <div class="sch_it sch_it1  blank_wrap"><span class="sch_it_blank"></span></div>
  <div class="sch_it sch_it2"><span class="code en" data-scode="005">005</span><div class="film_tit"><p class="time en">12:20</p><div><a href = "/kor/html/program/prog_view.asp?idx=89725&c_idx=442"><span class="film_tit_kor">사토코는 언제나</span><span class="film_tit_eng en">Satoko Always</span></a></div></div><div class="grade"> <span class="ico_grade ico_12" title="12세이상관람가">12</span>  <span class="gv_12248"></span></div></div>
  <div class="sch_it sch_it3"><span class="code en" data-scode="006">006</span><div class="film_tit"><p class="time en">9:40</p><div><a href = "/kor/html/program/prog_view.asp?idx=1&c_idx=428"><span class="film_tit_kor">낮과 밤은 서로에게</span></a></div></div><div class="grade"> <span class="gv_1"><span class="ico_grade ico_gv" title="GV 게스트와의 만남">GV</span></span></div></div>
</div>
<div class="sch_li"><div class="sch_li_tit">영화의전당 중극장</div>
  <div class="sch_it sch_it3"><span class="code en" data-scode="010">010</span><div class="film_tit"><p class="time en">15:30</p><p class="film_tit_kor">버스정류장 + 플레시 임팩트<i class="ico_bundle"></i></p><div class="pack"><ul class="pack_list"><li><a href="/kor/html/program/prog_view.asp?idx=91189&c_idx=441"><span class="film_tit_kor">버스정류장<i class="xi"></i></span></a></li><li><a href="/kor/html/program/prog_view.asp?idx=89213&c_idx=441"><span class="film_tit_kor">플레시 임팩트</span></a></li></ul></div></div><div class="grade"></div></div>
</div>
<div class="sch_li"><div class="sch_li_tit">동서대학교-경남정보대학교 4층 북카페 라운지</div>
  <div class="sch_it sch_it1"><span class="code en" data-scode="824">824</span><div class="film_tit"><p class="time en">18:00</p><div><a href = "/kor/addon/10000001/page.asp?page_num=11043&strCode=824"><span class="film_tit_kor">[씨네 클래스] 장원석, <왕과 사는 남자>, <범죄도시> 시리즈</span></a></div></div><div class="grade"> <span class="gv_13062"></span></div></div>
</div>
<div class="sch_li"><div class="sch_li_tit">영화의전당 하늘연극장</div>
  <div class="sch_it sch_it1"><span class="code en" data-scode="731">731</span><div class="film_tit"><p class="time en">11:00</p><div><span class="film_tit_kor">플래시 포워드 관객상 수상작</span></div></div></div>
</div>
</div></div>`

const PAGE = MENU + ROWS

describe('parseBiffSectionMap', () => {
  it('메뉴 링크에서 섹션 번호와 이름을 읽는다', () => {
    expect(parseBiffSectionMap(PAGE)).toEqual({ 428: '개·폐막작', 442: '경쟁', 441: '특별상영' })
  })
})

describe('parseBiffRuntime', () => {
  it('작품 상세의 러닝타임을 분으로 읽는다', () => {
    expect(parseBiffRuntime('<li class="en"><span class="screen_outx">러닝타임</span>80min</li>')).toBe(80)
  })

  it('러닝타임 표기가 없으면 null이다', () => {
    expect(parseBiffRuntime('<li>행사</li>')).toBeNull()
  })
})

describe('splitBiffVenue', () => {
  it('붙여 쓴 극장 이름을 상영관 이름으로 맞추고 관을 떼어 낸다', () => {
    expect(splitBiffVenue('CGV센텀시티 IMAX관')).toEqual({ venue: 'CGV 센텀시티', screen: 'IMAX관' })
  })
  it('스폰서 홀 이름은 관으로 남긴다', () => {
    expect(splitBiffVenue('소향씨어터 우리은행홀')).toEqual({ venue: '동서대학교 소향씨어터', screen: '우리은행홀' })
  })
  it('관이 없는 곳은 screen이 null이다', () => {
    expect(splitBiffVenue('영화진흥위원회 표준시사실')).toEqual({ venue: '영화진흥위원회 표준시사실', screen: null })
  })
  it('규칙에 없는 곳은 표기 그대로 극장 이름이 된다', () => {
    expect(splitBiffVenue('해운대 비프광장')).toEqual({ venue: '해운대 비프광장', screen: null })
  })
})

describe('parseBiffScheduleDay', () => {
  const rows = parseBiffScheduleDay(PAGE, '2026-10-08', parseBiffSectionMap(PAGE))
  const byCode = Object.fromEntries(rows.map((r) => [r.screeningCode, r]))

  it('빈 칸은 건너뛰고 회차 칸만 읽는다', () => {
    expect(rows.map((r) => r.screeningCode)).toEqual(['005', '006', '010', '824', '731'])
  })

  it('회차 한 칸을 행으로 옮긴다', () => {
    expect(byCode['005']).toEqual({
      screeningDate: '2026-10-08',
      startTime: '12:20',
      venueLabel: 'CGV 센텀시티',
      screenLabel: '6관',
      title: '사토코는 언제나',
      section: '경쟁',
      screeningCode: '005',
      hasGv: false,
      programUrl: 'https://www.biff.kr/kor/html/program/prog_view.asp?idx=89725&c_idx=442',
    })
  })

  it('GV 아이콘이 있는 칸만 GV다 — 범례의 GV 아이콘은 세지 않는다', () => {
    expect(rows.filter((r) => r.hasGv).map((r) => r.screeningCode)).toEqual(['006'])
  })

  it('한 자리 시각을 두 자리로 맞춘다', () => {
    expect(byCode['006'].startTime).toBe('09:40')
  })

  it('묶음상영은 한 줄 제목과 첫 편의 링크·섹션을 쓴다', () => {
    expect(byCode['010'].title).toBe('버스정류장 + 플레시 임팩트')
    expect(byCode['010'].section).toBe('특별상영')
    expect(byCode['010'].programUrl).toContain('idx=91189')
  })

  it('행사는 섹션을 행사로 두고 제목의 작품명 꺾쇠를 지우지 않는다', () => {
    expect(byCode['824'].section).toBe(EVENT_SECTION)
    expect(byCode['824'].title).toBe('[씨네 클래스] 장원석, <왕과 사는 남자>, <범죄도시> 시리즈')
    expect(byCode['824'].venueLabel).toBe('동서대학교 센텀캠퍼스')
    expect(byCode['824'].screenLabel).toBe('4층 북카페 라운지')
  })

  it('작품이 아직 안 정해진 수상작 상영은 링크·섹션 없이 들어온다', () => {
    expect(byCode['731']).toMatchObject({ section: null, programUrl: null, title: '플래시 포워드 관객상 수상작' })
  })

  it('섹션 표가 없으면 섹션을 비운다', () => {
    expect(parseBiffScheduleDay(ROWS, '2026-10-08')[0].section).toBeNull()
  })
})
