/** 사람이 쓰는 규범 — 매니페스트가 만들 수 없는 것만 여기 적는다.
 *  값(크기·색·배리언트)은 tokens.css와 피그마 덤프에서 생성되고,
 *  "무엇을 왜 그렇게 쓰는가"는 이 파일에 남긴다. */

export interface GuidePart {
  required?: boolean
  name: string
  desc: string
}

export interface GuideSpec {
  title: string
  desc: string
}

export interface GuideUsage {
  kind: 'do' | 'dont'
  rule: string
}

export interface ComponentGuide {
  intro: string
  anatomy?: GuidePart[]
  specs?: GuideSpec[]
  usage?: GuideUsage[]
}

export const GUIDES: Record<string, ComponentGuide> = {
  Button: {
    intro:
      '화면에서 가장 강한 행동을 담는 컴포넌트. 예매·확인처럼 사용자가 끝내야 하는 흐름에 쓴다. ' +
      '한 화면에 primary는 하나만 둔다 — 둘이 되는 순간 무엇이 주행동인지 사라진다.',
    anatomy: [
      { name: '레이블', desc: '행동을 동사로 적는다. "확인"보다 "예매하기"처럼 결과가 보이는 말을 쓴다. 아이콘만 있는 버튼은 IconButton으로 따로 만든다.' },
      { required: false, name: '아이콘', desc: '레이블만으로 뜻이 서면 넣지 않는다. 외부 예매처로 나가는 버튼처럼 "여기서 화면이 바뀐다"를 알릴 때만 붙인다.' },
    ],
    specs: [
      { title: '높이', desc: 'sm 32 · md 44 · lg 52. md(44)가 기본이며 터치 타깃 최소치(--touch-target)와 같다. sm은 밀집한 목록 안에서만.' },
      { title: '좌우 패딩', desc: '16 · 32 · 48 — spacing 4배수 스케일. 레이블 길이에 따라 폭은 늘어나되 패딩은 고정한다.' },
      { title: 'fullWidth', desc: '모바일 하단 고정 CTA에서만 쓴다. 넓은 화면에서 가로로 늘어난 버튼은 눌러야 할 곳을 흐린다.' },
    ],
    usage: [
      { kind: 'do', rule: 'primary는 가장 오른쪽(또는 마지막)에 둔다. 취소는 text·tertiary로 내린다.' },
      { kind: 'dont', rule: 'primary를 나란히 두 개 두지 않는다. 파괴적 행동은 danger로, 목록 안에서는 secondary·text로.' },
    ],
  },

  IconButton: {
    intro:
      '아이콘만으로 뜻이 서는 행동에 쓴다. 닫기·확대·현위치처럼 설명이 필요 없는 것만. ' +
      '포스터·지도처럼 배경을 알 수 없는 면 위에서는 overlay 변형으로 대비를 만든다.',
    anatomy: [
      { name: '아이콘', desc: 'Lucide 기준, stroke 1.75. 뜻이 보편적인 것만 단독으로 쓴다.' },
      { required: false, name: 'aria-label', desc: '화면에 글자가 없으므로 접근성 이름이 사실상 필수다. 타입도 필수로 잡혀 있다.' },
    ],
    specs: [
      { title: '크기', desc: '32 · 44 · 52. hover 영역까지 포함한 값이라, 아이콘 자체는 그보다 작다.' },
      { title: 'overlay 변형', desc: '배경 위 상태 레이어(--color-surface-overlay → hover → pressed)로 눌림을 표현한다. 면 색을 모르는 자리에서 쓰는 방식이다.' },
    ],
    usage: [
      { kind: 'do', rule: '모바일에서 아이콘 버튼끼리는 최소 12px 띄운다. 44 타깃이 겹치면 오탭이 난다.' },
      { kind: 'dont', rule: '뜻이 모호한 아이콘(별·깃발 등)을 레이블 없이 쓰지 않는다.' },
    ],
  },

  Chip: {
    intro:
      '선택 상태를 가진 작은 토글. 장르·태그처럼 여러 개를 켜고 끄는 자리에 쓴다. ' +
      '높이는 32(--filter-chip-height)로 고정하고, 세로 크기는 padding으로 만든다 — 전역 button min-height 44를 무력화해야 하기 때문이다.',
    anatomy: [
      { name: '레이블', desc: '한 단어. 문장이 들어가면 칩이 아니라 버튼이어야 한다.' },
      { required: false, name: '해제 버튼', desc: 'onDismiss를 주면 × 가 붙는다. 이미 적용된 필터를 걷어내는 자리에서만 쓴다.' },
    ],
    specs: [
      { title: '반경', desc: 'pill(9999). 사각 라운드는 카드·셀의 문법이라 칩과 섞으면 위계가 흐려진다.' },
      { title: '선택 상태', desc: '선택은 면(primary/100)과 글자색(primary/900)으로 표현한다. 테두리 굵기로 표현하면 레이아웃이 흔들린다.' },
    ],
    usage: [
      { kind: 'do', rule: '가로 스크롤 레일에 담아 한 줄로 유지한다.' },
      { kind: 'dont', rule: '칩을 행동 버튼으로 쓰지 않는다. 누르면 화면이 바뀌는 것은 Button이다.' },
    ],
  },

  FilterPill: {
    intro:
      '켜고 끄는 단일 조건. "예매 가능만 보기"처럼 문장형 라벨이 들어가는 필터에 쓴다. ' +
      '라벨은 12px/600(--text-meta + SemiBold) — 피그마 2.0/meta-strong과 같은 조합이다.',
    specs: [
      { title: '활성 표현', desc: '면 색과 글자색으로만 바꾼다. 상태 레이어는 inset box-shadow 대신 토큰화된 색을 쓴다 — 동적 배경 위에서 겹침이 생기던 문제를 그렇게 정리했다.' },
    ],
    usage: [
      { kind: 'do', rule: '조건이 하나일 때 쓴다. 값이 여러 개면 드롭다운형 FilterChip으로 간다.' },
      { kind: 'dont', rule: '활성 상태를 테두리만으로 표시하지 않는다. 지도 위에서는 보이지 않는다.' },
    ],
  },

  PosterChip: {
    intro:
      '포스터 이미지 위에 얹는 오버레이 칩. 상영 상태·GV·시간처럼 포스터를 가리지 않고 얹어야 하는 정보에 쓴다. ' +
      '2026-08-13에 12px/700 · padding 8 12 · offset 6으로 키웠다 — 그 전(10px)에는 포스터 위에서 읽히지 않았다.',
    anatomy: [
      { name: 'corner', desc: '네 모서리 중 하나. 좌하단은 랭킹 숫자 전용이라 비워 둔다.' },
      { name: 'tone', desc: '의미색. error(매진)·warning(잔여 적음)·success(상영중)·gv·scrim(중립 정보).' },
    ],
    specs: [
      { title: '여백', desc: '포스터 모서리에서 6px(--comp-poster-chip-offset). 칩 내부는 8/12(--comp-poster-chip-pad).' },
      { title: '좌하단 규칙', desc: '랭킹 섹션이 스크림 + KIMM 숫자를 좌하단에 얹는다. 다른 칩을 그 자리에 두면 숫자와 겹친다.' },
    ],
    usage: [
      { kind: 'do', rule: '한 포스터에 칩은 두 개까지. 셋을 넘으면 포스터가 아니라 배지 판이 된다.' },
      { kind: 'dont', rule: '좌하단에 칩을 두지 않는다 — 순위 전용 자리다.' },
    ],
  },

  Badge: {
    intro:
      '텍스트 옆에 붙는 상태 표식. 스스로 행동하지 않으며, 누를 수 있는 것처럼 보이면 안 된다. ' +
      '글자는 10px/700(--text-badge)이고, 피그마 대응 스타일은 2.0/badge다.',
    specs: [
      { title: '반경', desc: 'radius/badge(4). 칩(pill)과 다르게 각을 남겨 "누르는 것이 아니다"를 알린다.' },
    ],
    usage: [
      { kind: 'do', rule: '상태를 나타내는 한 단어만 담는다 — 매진, 상영중, GV.' },
      { kind: 'dont', rule: '배지에 클릭 핸들러를 붙이지 않는다.' },
    ],
  },

  Card: {
    intro:
      '흰 종이 한 장. 목록의 항목 하나를 담는 기본 면이다. 배경(미색)과 카드(흰색)의 대비로 층을 만들고, ' +
      '그림자는 층을 더 얹을 때만 쓴다.',
    specs: [
      { title: '고도', desc: 'sm=E1 카드·버튼 hover / md=E2 FAB·드롭다운 / lg=E3 모달. 그림자는 2겹(direct+ambient)이고 색은 웜 브라운 고정 — 순검정 금지.' },
      { title: '반경', desc: 'radius/control(12). 시트는 20, 팝오버는 16으로 층마다 다르다.' },
      { title: '클릭 가능 상태', desc: 'clickable 카드는 hover에서 한 단계 뜨고(그림자 sm→md, 1px 상승), 누르는 순간 도로 내려앉으며 면이 눌린 톤으로 바뀐다. onClick을 주면 키보드로도 눌린다(role=button · Enter/Space · 포커스 링).' },
    ],
    usage: [
      { kind: 'do', rule: '카드 안 요소 간격은 spacing/3(12), 카드 사이는 spacing/4(16) 이상.' },
      { kind: 'dont', rule: '카드 안에 카드를 넣지 않는다. 층이 두 번 쌓이면 어느 것이 항목인지 사라진다.' },
    ],
  },

  Input: {
    intro:
      '값을 직접 받는 자리. 라벨·힌트·오류를 한 덩이로 묶어 위치가 흔들리지 않게 한다.',
    anatomy: [
      { name: '라벨', desc: '무엇을 넣는지. placeholder로 대신하지 않는다 — 입력을 시작하면 사라진다.' },
      { required: false, name: '힌트 / 오류', desc: '둘은 같은 자리를 쓴다. 오류가 있으면 오류가 이긴다.' },
    ],
    usage: [
      { kind: 'do', rule: '오류 문구는 무엇을 고쳐야 하는지 적는다 — "이메일 형식이 아닙니다".' },
      { kind: 'dont', rule: '라벨 없이 placeholder만 두지 않는다.' },
    ],
  },

  SortToggle: {
    intro: '목록 정렬 기준을 바꾸는 텍스트 pill. 높이 28(--comp-sort-h)로 칩보다 한 단계 작다.',
    usage: [
      { kind: 'do', rule: '현재 기준을 글자로 보여준다 — "최신순 ↓".' },
      { kind: 'dont', rule: '정렬 상태를 아이콘만으로 표시하지 않는다.' },
    ],
  },

  Avatar: {
    intro: '감독 사진. 사진이 없으면 이름 첫 글자로 떨어진다 — 빈 원을 두지 않는다.',
    specs: [
      { title: '이니셜', desc: '글자 크기는 지름의 36%. 크기를 바꿔도 비율이 유지된다.' },
    ],
  },

  SectionHeader: {
    intro: '큐레이션 섹션의 머리. 제목·설명·오른쪽 액션을 한 줄로 정렬한다.',
    usage: [
      { kind: 'do', rule: '설명은 한 줄로 끝낸다. 두 줄이 되면 섹션 자체가 무거워진다.' },
    ],
  },

  Toast: {
    intro: '결과를 알리고 사라지는 알림. 사용자의 다음 동작을 막지 않는다(pointer-events 없음).',
    specs: [
      { title: '지속', desc: '기본 1600ms. trigger 값을 올릴 때마다 다시 뜬다.' },
    ],
    usage: [
      { kind: 'dont', rule: '토스트에 버튼을 넣지 않는다. 행동이 필요하면 시트나 모달이다.' },
    ],
  },

  BottomSheet: {
    intro: '화면 아래에서 올라오는 면. 상단 모서리만 20(radius/sheet)이고, 핸들로 끌 수 있음을 알린다.',
    specs: [
      { title: '그림자', desc: 'shadow/sheet — offset 0의 앰비언트 2겹. 아래가 화면 끝이라 방향성 그림자가 필요 없다.' },
    ],
  },

  FabRound: {
    intro: '지도 위에 뜬 단일 행동. 44(--comp-fab-round-size) 원형이며, 지도 조작을 가리지 않는 자리에 둔다.',
  },

  FabPill: {
    intro: '지도 ↔ 목록처럼 두 모드를 오가는 전환 컨트롤. 라벨 두 개를 한 pill에 담아 현재 위치를 알린다.',
  },
}

/** 조작 가능한 State 플레이그라운드가 있는 컴포넌트.
 *  목차를 서버에서 만들어야 해서 클라이언트 모듈(componentDocs.tsx) 밖에 둔다. */
export const PLAYGROUNDS = [
  'Button', 'IconButton', 'Chip', 'FilterPill', 'PosterChip', 'Badge',
  'Card', 'SortToggle', 'Avatar',
] as const

export const hasPlayground = (name: string) => (PLAYGROUNDS as readonly string[]).includes(name)

export const guideFor = (name: string): ComponentGuide | null => GUIDES[name] ?? null
