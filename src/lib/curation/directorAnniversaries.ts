export type AnniversaryEventType = 'birthday' | 'deathday'

export interface DirectorAnniversary {
  month: number
  day: number
  nameKo: string
  nameEn: string
  birthYear: number
  deathYear?: number
  eventType: AnniversaryEventType
  sectionTitle: string
  sectionDesc: string
}

export const DIRECTOR_ANNIVERSARIES: DirectorAnniversary[] = [
  { month: 4,  day: 4,  nameKo: '안드레이 타르콥스키', nameEn: 'Andrei Tarkovsky',          birthYear: 1932, deathYear: 1986, eventType: 'birthday',  sectionTitle: '🕯️ 타르콥스키 탄생일',         sectionDesc: '롱테이크와 침묵으로 영화를 시로 만든 감독, 오늘 태어났습니다' },
  { month: 12, day: 29, nameKo: '안드레이 타르콥스키', nameEn: 'Andrei Tarkovsky',          birthYear: 1932, deathYear: 1986, eventType: 'deathday',  sectionTitle: '🕯️ 타르콥스키를 기억하며',       sectionDesc: '1986년 오늘, 타르콥스키가 세상을 떠났습니다' },
  { month: 2,  day: 6,  nameKo: '프랑수아 트뤼포',     nameEn: 'François Truffaut',         birthYear: 1932, deathYear: 1984, eventType: 'birthday',  sectionTitle: '🎂 트뤼포 탄생일',              sectionDesc: '400번의 구타로 시작한 누벨바그의 아이, 오늘 태어났습니다' },
  { month: 10, day: 21, nameKo: '프랑수아 트뤼포',     nameEn: 'François Truffaut',         birthYear: 1932, deathYear: 1984, eventType: 'deathday',  sectionTitle: '🕯️ 트뤼포를 기억하며',          sectionDesc: '1984년 오늘, 트뤼포가 세상을 떠났습니다' },
  { month: 3,  day: 3,  nameKo: '장 뤽 고다르',        nameEn: 'Jean-Luc Godard',           birthYear: 1930, deathYear: 2022, eventType: 'birthday',  sectionTitle: '🎂 고다르 탄생일',              sectionDesc: '영화의 문법을 해체한 반란아, 오늘 태어났습니다' },
  { month: 9,  day: 13, nameKo: '장 뤽 고다르',        nameEn: 'Jean-Luc Godard',           birthYear: 1930, deathYear: 2022, eventType: 'deathday',  sectionTitle: '🕯️ 고다르를 기억하며',          sectionDesc: '2022년 오늘, 고다르가 세상을 떠났습니다' },
  { month: 3,  day: 23, nameKo: '구로사와 아키라',      nameEn: 'Akira Kurosawa',            birthYear: 1910, deathYear: 1998, eventType: 'birthday',  sectionTitle: '🎂 구로사와 탄생일',            sectionDesc: '일본 영화의 천황, 오늘 태어났습니다' },
  { month: 9,  day: 6,  nameKo: '구로사와 아키라',      nameEn: 'Akira Kurosawa',            birthYear: 1910, deathYear: 1998, eventType: 'deathday',  sectionTitle: '🕯️ 구로사와를 기억하며',        sectionDesc: '1998년 오늘, 구로사와가 세상을 떠났습니다' },
  { month: 12, day: 12, nameKo: '오즈 야스지로',        nameEn: 'Yasujiro Ozu',              birthYear: 1903, deathYear: 1963, eventType: 'birthday',  sectionTitle: '🎂 오즈 탄생일',                sectionDesc: '다다미 높이의 카메라로 일상을 영원으로 만든 감독, 오늘 태어났습니다' },
  { month: 12, day: 12, nameKo: '오즈 야스지로',        nameEn: 'Yasujiro Ozu',              birthYear: 1903, deathYear: 1963, eventType: 'deathday',  sectionTitle: '🕯️ 오즈를 기억하며',            sectionDesc: '생일과 기일이 같은 날, 오즈 야스지로를 기억합니다' },
  { month: 5,  day: 4,  nameKo: '아녜스 바르다',        nameEn: 'Agnès Varda',               birthYear: 1928, deathYear: 2019, eventType: 'birthday',  sectionTitle: '🎂 바르다 탄생일',              sectionDesc: '누벨바그의 어머니, 오늘 태어났습니다' },
  { month: 3,  day: 29, nameKo: '아녜스 바르다',        nameEn: 'Agnès Varda',               birthYear: 1928, deathYear: 2019, eventType: 'deathday',  sectionTitle: '🕯️ 바르다를 기억하며',          sectionDesc: '2019년 오늘, 바르다가 세상을 떠났습니다' },
  { month: 7,  day: 14, nameKo: '잉마르 베리만',        nameEn: 'Ingmar Bergman',            birthYear: 1918, deathYear: 2007, eventType: 'birthday',  sectionTitle: '🎂 베리만 탄생일',              sectionDesc: '영혼의 침묵을 스크린에 새긴 감독, 오늘 태어났습니다' },
  { month: 7,  day: 30, nameKo: '잉마르 베리만',        nameEn: 'Ingmar Bergman',            birthYear: 1918, deathYear: 2007, eventType: 'deathday',  sectionTitle: '🕯️ 베리만을 기억하며',          sectionDesc: '2007년 오늘, 베리만이 세상을 떠났습니다' },
  { month: 9,  day: 5,  nameKo: '페데리코 펠리니',      nameEn: 'Federico Fellini',          birthYear: 1920, deathYear: 1993, eventType: 'birthday',  sectionTitle: '🎂 펠리니 탄생일',              sectionDesc: '꿈과 현실 사이를 유영한 이탈리아의 마술사, 오늘 태어났습니다' },
  { month: 10, day: 31, nameKo: '페데리코 펠리니',      nameEn: 'Federico Fellini',          birthYear: 1920, deathYear: 1993, eventType: 'deathday',  sectionTitle: '🕯️ 펠리니를 기억하며',          sectionDesc: '1993년 오늘, 펠리니가 세상을 떠났습니다' },
  { month: 5,  day: 22, nameKo: '압바스 키아로스타미',  nameEn: 'Abbas Kiarostami',          birthYear: 1940, deathYear: 2016, eventType: 'birthday',  sectionTitle: '🎂 키아로스타미 탄생일',         sectionDesc: '이란의 길 위에서 삶을 찍은 시인 감독, 오늘 태어났습니다' },
  { month: 7,  day: 4,  nameKo: '압바스 키아로스타미',  nameEn: 'Abbas Kiarostami',          birthYear: 1940, deathYear: 2016, eventType: 'deathday',  sectionTitle: '🕯️ 키아로스타미를 기억하며',     sectionDesc: '2016년 오늘, 키아로스타미가 세상을 떠났습니다' },
  { month: 5,  day: 17, nameKo: '왕가위',               nameEn: 'Wong Kar-wai',              birthYear: 1958,                  eventType: 'birthday',  sectionTitle: '🎂 왕가위 탄생일',              sectionDesc: '홍콩의 밤과 멜랑콜리를 영상으로 빚은 감독, 오늘 태어났습니다' },
  { month: 9,  day: 2,  nameKo: '허우샤오셴',           nameEn: 'Hou Hsiao-hsien',           birthYear: 1947,                  eventType: 'birthday',  sectionTitle: '🎂 허우샤오셴 탄생일',          sectionDesc: '대만의 역사와 기억을 롱테이크로 담은 거장, 오늘 태어났습니다' },
  { month: 6,  day: 22, nameKo: '빔 벤더스',            nameEn: 'Wim Wenders',               birthYear: 1945,                  eventType: 'birthday',  sectionTitle: '🎂 빔 벤더스 탄생일',           sectionDesc: '길 위의 감독, 파리 텍사스의 작가, 오늘 태어났습니다' },
  { month: 9,  day: 28, nameKo: '미켈란젤로 안토니오니', nameEn: 'Michelangelo Antonioni',   birthYear: 1912, deathYear: 2007, eventType: 'birthday',  sectionTitle: '🎂 안토니오니 탄생일',          sectionDesc: '소외와 공허를 스크린에 새긴 이탈리아의 거장, 오늘 태어났습니다' },
  { month: 7,  day: 30, nameKo: '미켈란젤로 안토니오니', nameEn: 'Michelangelo Antonioni',   birthYear: 1912, deathYear: 2007, eventType: 'deathday',  sectionTitle: '🕯️ 안토니오니를 기억하며',      sectionDesc: '2007년 오늘, 안토니오니가 세상을 떠났습니다' },
  { month: 4,  day: 22, nameKo: '이창동',               nameEn: 'Lee Chang-dong',            birthYear: 1954,                  eventType: 'birthday',  sectionTitle: '🎂 이창동 탄생일',              sectionDesc: '한국 현대사의 상처를 정면으로 바라본 감독, 오늘 태어났습니다' },
  { month: 9,  day: 14, nameKo: '봉준호',               nameEn: 'Bong Joon-ho',              birthYear: 1969,                  eventType: 'birthday',  sectionTitle: '🎂 봉준호 탄생일',              sectionDesc: '장르와 사회를 동시에 비튼 감독, 오늘 태어났습니다' },
  { month: 3,  day: 12, nameKo: '홍상수',               nameEn: 'Hong Sang-soo',             birthYear: 1960,                  eventType: 'birthday',  sectionTitle: '🎂 홍상수 탄생일',              sectionDesc: '일상의 반복 속에서 균열을 포착하는 감독, 오늘 태어났습니다' },
  { month: 9,  day: 20, nameKo: '박찬욱',               nameEn: 'Park Chan-wook',            birthYear: 1963,                  eventType: 'birthday',  sectionTitle: '🎂 박찬욱 탄생일',              sectionDesc: '복수와 욕망의 서사를 탐미적으로 빚은 감독, 오늘 태어났습니다' },
]

/** 오늘 생몰일에 해당하는 항목 반환 */
export function getTodayAnniversaries(): DirectorAnniversary[] {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  return DIRECTOR_ANNIVERSARIES.filter((d) => d.month === month && d.day === day)
}
