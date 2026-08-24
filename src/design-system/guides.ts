/** 컴포넌트 사용 규범. 값(크기·색·배리언트)은 tokens.css와 피그마 덤프에서 자동으로 생성되고,
 *  "어떤 자리에 어떻게 쓰는가"는 이 파일에 적는다. */

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
      '화면에서 가장 강한 행동을 담습니다. 예매·확인처럼 사용자가 끝내야 하는 흐름에 사용하며, ' +
      '한 화면의 primary는 하나로 유지해 주행동이 분명하게 드러나도록 합니다.',
    anatomy: [
      { name: '레이블', desc: '행동을 동사로 적습니다. "확인"보다 "예매하기"처럼 결과가 보이는 표현을 사용합니다. 아이콘만 필요한 자리에는 IconButton을 사용합니다.' },
      { required: false, name: '아이콘', desc: '레이블만으로 의미가 전달되면 생략합니다. 외부 예매처로 이동하는 경우처럼 화면이 전환된다는 신호가 필요할 때 사용합니다.' },
    ],
    specs: [
      { title: '높이', desc: 'sm 32 · md 44 · lg 52입니다. 기본은 md(44)이며 터치 타깃 최소치(--touch-target)와 같습니다. sm은 밀집한 목록 안에서 사용합니다.' },
      { title: '좌우 패딩', desc: '16 · 32 · 48로 spacing 4배수 스케일을 따릅니다. 레이블 길이에 따라 너비는 늘어나되 패딩은 고정합니다.' },
      { title: 'fullWidth', desc: '모바일 하단 고정 CTA에서 사용합니다. 넓은 화면에서는 가로로 늘어난 버튼이 초점을 흐리므로 권장하지 않습니다.' },
    ],
    usage: [
      { kind: 'do', rule: 'primary는 가장 오른쪽(또는 마지막)에 배치하고, 취소는 text·tertiary로 낮춥니다.' },
      { kind: 'dont', rule: 'primary를 나란히 두 개 배치하지 않습니다. 파괴적 행동은 danger, 목록 안 보조 행동은 secondary·text를 사용합니다.' },
    ],
  },

  IconButton: {
    intro:
      '아이콘만으로 의미가 전달되는 행동에 사용합니다. 닫기·확대·현위치처럼 설명이 필요 없는 행동이 대상이며, ' +
      '포스터나 지도처럼 배경을 예측할 수 없는 면 위에서는 overlay 변형으로 대비를 확보합니다.',
    anatomy: [
      { name: '아이콘', desc: 'Lucide 기준, stroke 1.75를 사용합니다. 의미가 보편적인 아이콘만 단독으로 사용합니다.' },
      { required: false, name: 'aria-label', desc: '화면에 글자가 없으므로 접근성 이름이 필요합니다. 타입에서도 필수로 지정되어 있습니다.' },
    ],
    specs: [
      { title: '크기', desc: '32 · 44 · 52입니다. hover 영역을 포함한 값이며, 아이콘 자체는 그보다 작게 그려집니다.' },
      { title: 'overlay 변형', desc: '배경 위 상태 레이어(--color-surface-overlay → hover → pressed)로 눌림을 표현합니다. 면 색을 알 수 없는 자리에서 사용하는 방식입니다.' },
    ],
    usage: [
      { kind: 'do', rule: '모바일에서 아이콘 버튼 사이는 최소 12px을 확보합니다. 44 타깃이 겹치면 오조작이 발생합니다.' },
      { kind: 'dont', rule: '의미가 모호한 아이콘(별·깃발 등)을 레이블 없이 단독으로 사용하지 않습니다.' },
    ],
  },

  Chip: {
    intro:
      '선택 상태를 가진 작은 토글입니다. 장르·태그처럼 여러 항목을 켜고 끄는 자리에 사용합니다. ' +
      '높이는 32(--filter-chip-height)로 고정하고 세로 크기는 padding으로 만듭니다.',
    anatomy: [
      { name: '레이블', desc: '한 단어로 적습니다. 문장이 들어가는 자리에는 Button을 사용합니다.' },
      { required: false, name: '해제 버튼', desc: 'onDismiss를 전달하면 × 가 붙습니다. 이미 적용된 필터를 해제하는 자리에 사용합니다.' },
    ],
    specs: [
      { title: '반경', desc: 'pill(9999)을 사용합니다. 사각 라운드는 카드·셀의 문법이므로 칩과 섞지 않습니다.' },
      { title: '선택 상태', desc: '면(primary/100)과 글자색(primary/900)으로 표현합니다. 테두리 굵기로만 구분하지 않습니다.' },
    ],
    usage: [
      { kind: 'do', rule: '가로 스크롤 레일에 담아 한 줄로 유지합니다.' },
      { kind: 'dont', rule: '칩을 행동 버튼으로 사용하지 않습니다. 누르면 화면이 전환되는 요소는 Button입니다.' },
    ],
  },

  FilterPill: {
    intro:
      '켜고 끄는 단일 조건을 담습니다. "예매 가능만 보기"처럼 문장형 레이블이 들어가는 필터에 사용합니다. ' +
      '레이블은 12px/600(--text-meta + SemiBold)이며 피그마 2.0/meta-strong과 같은 조합입니다.',
    specs: [
      { title: '활성 표현', desc: '면 색과 글자색으로 표현합니다. 상태 레이어는 토큰화된 색을 사용해 어떤 배경 위에서도 같은 대비를 유지합니다.' },
    ],
    usage: [
      { kind: 'do', rule: '조건이 하나일 때 사용합니다. 선택할 값이 여러 개면 드롭다운형 FilterChip을 사용합니다.' },
      { kind: 'dont', rule: '활성 상태를 테두리만으로 표시하지 않습니다. 지도 위에서는 구분되지 않습니다.' },
    ],
  },

  PosterChip: {
    intro:
      '포스터 이미지 위에 얹는 오버레이 칩입니다. 상영 상태·GV·시간처럼 포스터를 가리지 않고 전달해야 하는 정보에 사용하며, ' +
      '12px/700 · padding 8 12 · offset 6으로 포스터 위에서도 읽히는 크기를 유지합니다.',
    anatomy: [
      { name: 'corner', desc: '네 모서리 중 하나를 지정합니다. 좌하단은 순위 표기 전용으로 비워 둡니다.' },
      { name: 'tone', desc: '의미색을 지정합니다. error(매진) · warning(잔여 적음) · success(상영중) · gv · scrim(중립 정보).' },
    ],
    specs: [
      { title: '여백', desc: '포스터 모서리에서 6px(--comp-poster-chip-offset), 칩 내부는 8/12(--comp-poster-chip-pad)입니다.' },
      { title: '좌하단 규칙', desc: '랭킹 섹션이 스크림과 KIMM 숫자를 좌하단에 배치합니다. 이 자리는 순위 표기로 비워 둡니다.' },
    ],
    usage: [
      { kind: 'do', rule: '한 포스터에 칩은 두 개까지 사용합니다.' },
      { kind: 'dont', rule: '좌하단에는 칩을 배치하지 않습니다. 순위 표기 자리입니다.' },
    ],
  },

  Badge: {
    intro:
      '텍스트 옆에 붙는 상태 표식입니다. 스스로 행동하지 않으며, 누를 수 있는 요소로 보이지 않도록 합니다. ' +
      '글자는 10px/700(--text-badge)이고 피그마 대응 스타일은 2.0/badge입니다.',
    specs: [
      { title: '반경', desc: 'radius/badge(4)를 사용합니다. 칩(pill)과 달리 각을 남겨 누르는 요소가 아님을 알립니다.' },
    ],
    usage: [
      { kind: 'do', rule: '상태를 나타내는 한 단어만 담습니다 — 매진, 상영중, GV.' },
      { kind: 'dont', rule: '배지에 클릭 핸들러를 연결하지 않습니다.' },
    ],
  },

  Card: {
    intro:
      '목록의 항목 하나를 담는 기본 면입니다. 배경(미색)과 카드(흰색)의 대비로 층을 만들고, ' +
      '그림자는 실제로 떠 있는 요소에만 사용합니다.',
    specs: [
      { title: 'Elevation', desc: 'sm=E1 카드·버튼 hover / md=E2 FAB·드롭다운 / lg=E3 모달입니다. 그림자는 2겹(direct+ambient)이며 색은 웜 브라운으로 고정합니다.' },
      { title: 'Radius', desc: 'radius/control(12)을 사용합니다. 시트는 20, 팝오버는 16으로 층마다 다르게 지정합니다.' },
      { title: 'Clickability', desc: 'clickable 카드는 hover에서 한 단계 떠오르고(그림자 sm→md, 1px 상승), 누르는 순간 내려앉으며 면이 눌린 톤으로 바뀝니다. onClick을 전달하면 키보드로도 조작할 수 있습니다(role=button · Enter/Space · 포커스 링).' },
    ],
    usage: [
      { kind: 'do', rule: '카드 안 요소 간격은 spacing/3(12), 카드 사이는 spacing/4(16) 이상을 확보합니다.' },
      { kind: 'dont', rule: '카드 안에 카드를 넣지 않습니다 — 같은 높이의 흰 면이 겹치면 위계가 무너집니다. 하위 묶음이 필요하면 눌린 트레이(neutral-100 음각 면)를 깔고 그 위에 올립니다. 상영 시간표(ShowtimeGroupCard)의 흰 셀이 그 예외 문법입니다: 카드 → 음각 트레이 → 셀로 한 번 꺼졌다 올라오므로 카드 중첩이 아닙니다.' },
    ],
  },

  Input: {
    intro: '값을 직접 입력받는 자리입니다. 레이블·힌트·오류를 한 덩이로 묶어 입력 중에도 위치가 흔들리지 않도록 합니다.',
    anatomy: [
      { name: '레이블', desc: '무엇을 입력하는지 알립니다. placeholder만 단독으로 사용하지 않습니다.' },
      { required: false, name: '힌트 / 오류', desc: '같은 자리를 공유하며, 오류가 있으면 오류 문구가 우선합니다.' },
    ],
    usage: [
      { kind: 'do', rule: '오류 문구에는 무엇을 고쳐야 하는지 적습니다 — "이메일 형식이 아닙니다".' },
      { kind: 'dont', rule: '레이블 없이 placeholder만 두지 않습니다.' },
    ],
  },

  Icon: {
    intro: '서비스의 유일한 아이콘 진입점입니다. lucide를 소스로 쓰고, lucide에 없는 브랜드 마크(kakao·instagram·github·linkedin)만 직접 그립니다. 새 글리프가 필요하면 호출부에서 svg를 그리지 말고 레지스트리에 이름을 추가합니다.',
    specs: [
      { title: '크기', desc: 'xs 12 · sm 14 · md 16(기본) · lg 20 · xl 24. px를 직접 넘길 수 있지만 기본은 토큰입니다.' },
      { title: '획 굵기', desc: '크기에서 파생합니다 — 12 이하 2.5, 16 이하 2, 그 위 1.75. 24 뷰박스를 12px로 줄이면 1.75 획은 0.9px가 되어 사라지기 때문입니다.' },
      { title: '접근성', desc: 'label을 주면 role="img"과 aria-label이 붙고, 없으면 aria-hidden 처리됩니다. 아이콘 옆에 글자가 있으면 label을 비웁니다.' },
    ],
    usage: [
      { kind: 'do', rule: '색은 color prop이나 부모의 currentColor로 상속받습니다.' },
      { kind: 'dont', rule: '호출부에서 <svg>를 직접 그리지 않습니다 — 같은 글리프가 굵기만 다른 채 여러 벌 생깁니다.' },
      { kind: 'dont', rule: 'strokeWidth를 손으로 지정하지 않습니다. 크기만 정하면 굵기는 따라옵니다.' },
    ],
  },

  Divider: {
    intro: '형제 요소 사이에 홀로 서는 1px 선입니다. 컨테이너의 테두리(borderTop/Bottom)는 면의 경계라서 이 컴포넌트가 아닙니다.',
    specs: [
      { title: '방향', desc: 'horizontal이 기본이고, vertical은 부모 높이를 따라 늘어납니다(alignSelf: stretch).' },
      { title: 'inset · gap', desc: 'inset은 선 양끝 여백, gap은 선의 위아래 여백입니다. 둘 다 4배수로 넣습니다.' },
    ],
    usage: [
      { kind: 'do', rule: '"구분선 + 글자 + 구분선" 조합에서는 flex를 켜 남는 폭을 나눠 갖게 합니다.' },
      { kind: 'dont', rule: '카드나 시트의 바깥 경계를 그리는 데 쓰지 않습니다 — 그건 컨테이너의 border입니다.' },
    ],
  },

  EmptyState: {
    intro: '보여줄 것이 없을 때의 자리입니다. 문구는 화면마다 달라도 배치는 하나여야 합니다.',
    specs: [
      { title: 'inline', desc: '목록 안 한 줄짜리 안내. --text-meta, caption 색.' },
      { title: 'block', desc: '탭 전체가 비었을 때. --text-body, secondary 색. 일러스트와 행동 버튼을 같이 세웁니다.' },
    ],
    usage: [
      { kind: 'do', rule: '왜 비었는지와 다음에 할 일을 함께 적습니다 — "하트로 모아두면 여기에 쌓여요".' },
      { kind: 'dont', rule: '"데이터 없음" 같은 시스템 말투를 쓰지 않습니다.' },
    ],
  },

  Tabs: {
    intro: '같은 자리에서 내용을 갈아 끼우는 탭 줄입니다. underline(패널·시트 안)과 pill(목록 위 필터형) 두 모습만 있습니다.',
    specs: [
      { title: 'underline', desc: '높이 42, 탭들이 폭을 균등하게 나눠 갖고 선택된 탭 아래 2px 밑줄이 붙습니다.' },
      { title: 'pill', desc: 'FilterPill을 그대로 씁니다(높이 28). 개수 배지를 라벨에 붙일 수 있습니다.' },
    ],
    usage: [
      { kind: 'do', rule: 'label을 반드시 줍니다 — 스크린리더가 무슨 탭 묶음인지 읽습니다.' },
      { kind: 'dont', rule: '날짜 선택에 쓰지 않습니다. 요일 색·좌우 이동·오늘 표시는 DateBar와 DetailDateTabs가 맡습니다.' },
    ],
  },

  ListRow: {
    intro: '설정·정보 목록의 한 줄입니다. 왼쪽 글, 오른쪽 조작, 아래 1px 경계라는 프레임만 맡습니다.',
    specs: [
      { title: '밀도', desc: 'default 16px / compact 12px 세로 여백. 한 화면 안에서는 하나로 통일합니다.' },
      { title: 'last', desc: '마지막 줄은 아래 경계를 지웁니다 — 카드 바닥에 선이 두 겹으로 겹치지 않게.' },
      { title: 'stacked', desc: '오른쪽 슬롯이 넓어 한 줄에 안 들어갈 때 위아래로 쌓습니다.' },
    ],
    usage: [
      { kind: 'do', rule: '제목은 무엇을 바꾸는지, 설명은 바꾸면 무슨 일이 생기는지 적습니다.' },
      { kind: 'dont', rule: '선택지를 고르는 줄(라디오·체크박스)에는 쓰지 않습니다 — 그건 DropdownRow입니다.' },
    ],
  },

  KakaoLoginButton: {
    intro: '카카오 로그인 진입 버튼입니다. 우리 컴포넌트가 아니라 카카오가 정한 규격을 그대로 옮긴 것이라, 색·심볼·문구·반경을 우리 판단으로 바꾸지 않습니다.',
    specs: [
      { title: '카카오가 정한 값', desc: '컨테이너 #FEE500, 심볼 순검정(#000), 라벨 검정 85%, 반경 12px, 문구는 "카카오 로그인"(좁으면 축약형 "로그인"). 심볼은 모양·비율·색을 바꿀 수 없고, 빼도 규정 위반입니다.' },
      { title: '우리가 정하는 값', desc: '높이는 Button lg(52)와 맞추고, 로딩 중 문구는 "이동 중…"입니다. 폭은 좌우 대칭으로만 늘립니다.' },
      { title: '심볼의 출처', desc: 'Icon 레지스트리를 쓰지 않고 버튼이 직접 갖습니다. 레지스트리는 획 굵기·크기를 우리 톤에 맞춰 손대는 곳이라, 그 손질이 남의 브랜드 규정을 조용히 어길 수 있습니다.' },
    ],
    usage: [
      { kind: 'do', rule: '버튼 반경은 12px로 둡니다 — 다른 버튼과 달라 보여도 규정이 우선입니다.' },
      { kind: 'dont', rule: '심볼을 다른 아이콘으로 갈아 끼우거나 색을 맞추지 않습니다.' },
      { kind: 'dont', rule: '"카카오로 시작하기" 같은 임의 문구를 쓰지 않습니다.' },
    ],
  },

  Switch: {
    intro: '켜짐/꺼짐을 즉시 바꾸는 토글입니다. 누르는 순간 저장까지 끝나는 설정(알림 켜기 등)에만 쓰고, 저장 버튼이 따로 있는 폼에서는 쓰지 않습니다.',
    specs: [
      { title: '크기', desc: '트랙 44×26, 노브 20. 켜짐 면은 primary/base, 꺼짐 면은 neutral/300입니다.' },
    ],
    usage: [
      { kind: 'do', rule: '레이블은 항상 왼쪽 행(제목·설명)이 갖고, 토글은 상태만 표현합니다.' },
      { kind: 'dont', rule: '탐색·이동에 쓰지 않습니다 — 토글은 설정값 변경 전용입니다. 화면 전환은 MenuRow, 상태 필터는 Chip이 맡습니다.' },
    ],
  },

  SortToggle: {
    intro: '목록 정렬 기준을 바꾸는 텍스트 pill입니다. 높이는 28(--comp-sort-h)로 칩보다 한 단계 작습니다.',
    usage: [
      { kind: 'do', rule: '현재 정렬 기준을 글자로 보여줍니다 — "최신순 ↓".' },
      { kind: 'dont', rule: '정렬 상태를 아이콘만으로 표시하지 않습니다.' },
    ],
  },

  Avatar: {
    intro: '감독 사진을 표시합니다. 사진이 없으면 이름 첫 글자로 대체해 빈 원이 남지 않도록 합니다.',
    specs: [
      { title: '이니셜', desc: '글자 크기는 지름의 36%입니다. 크기를 바꿔도 비율이 유지됩니다.' },
    ],
  },

  SectionHeader: {
    intro: '큐레이션 섹션의 머리입니다. 제목·설명·오른쪽 액션을 한 줄로 정렬합니다.',
    usage: [
      { kind: 'do', rule: '설명은 한 줄로 마무리합니다.' },
    ],
  },

  Toast: {
    intro: '결과를 알리고 사라지는 알림입니다. 사용자의 다음 동작을 막지 않습니다(pointer-events 없음).',
    specs: [
      { title: '지속', desc: '기본 1600ms이며, trigger 값을 올릴 때마다 다시 표시됩니다.' },
    ],
    usage: [
      { kind: 'dont', rule: '토스트에 버튼을 넣지 않습니다. 행동이 필요하면 시트나 모달을 사용합니다.' },
    ],
  },

  BottomSheet: {
    intro: '화면 아래에서 올라오는 면입니다. 상단 모서리만 20(radius/sheet)으로 두고, 핸들로 끌 수 있음을 알립니다.',
    specs: [
      { title: '그림자', desc: 'shadow/sheet — offset 0의 앰비언트 2겹입니다. 아래가 화면 끝이므로 방향성 그림자를 사용하지 않습니다.' },
    ],
  },

  FabRound: {
    intro: '지도 위에 떠 있는 단일 행동입니다. 44(--comp-fab-round-size) 원형이며, 지도 조작을 가리지 않는 자리에 배치합니다.',
  },

  BubbleTail: {
    intro: '말풍선 꼬리입니다. 11×11 정사각을 45도 돌려 붙이며, 붙는 면과 같은 색을 받아 배경과 이어집니다.',
  },

  CardContainer: {
    intro: '섹션 하나를 감싸는 흰 판입니다. 큐레이션 섹션에서 제목과 가로 레일을 한 카드 안에 묶습니다.',
  },

  DirectorChip: {
    intro: '감독 이름과 사진을 함께 담는 칩입니다. 누르면 감독 상세로 이동합니다.',
  },

  GenreChip: {
    intro: '장르를 표시하는 칩입니다. 선택 상태가 없는 표시 전용이라 누를 수 없습니다.',
  },

  ScrollNavButton: {
    intro: '가로 스크롤 레일의 좌우 이동 버튼입니다. 레일 위에 절대 배치로 얹습니다.',
  },

  SearchBar: {
    intro: '검색어를 입력받는 바입니다. 높이 44(--comp-search-height), 반경은 control(12)을 사용합니다.',
  },

  SearchBarButton: {
    intro: '검색창 모양의 버튼입니다. 입력 대신 검색 화면으로 이동하는 자리에 사용합니다.',
  },

  Skeleton: {
    intro: '내용이 오기 전 자리를 잡아 두는 면입니다. 실제 요소와 같은 크기·반경으로 두어 화면이 튀지 않게 합니다.',
  },

  MovieCardSkeleton: {
    intro: '영화 카드 자리의 스켈레톤입니다. 포스터 2:3 비율과 제목·메타 줄을 실제 카드와 같은 배치로 둡니다.',
  },

  TheaterCardSkeleton: {
    intro: '영화 상세의 "상영중인 영화관" 카드 자리를 잡아 두는 스켈레톤입니다. 극장명·주소·상영 시간 칩 줄을 실제 카드와 같은 배치로 둡니다.',
  },

  Wordmark: {
    intro: '서비스 워드마크입니다. 배경을 통제할 수 없는 자리에서는 테두리 변형으로 글자가 읽히도록 합니다.',
  },
}

/** 조작 가능한 State 플레이그라운드를 제공하는 컴포넌트.
 *  목차를 서버에서 만들기 때문에 클라이언트 모듈(componentDocs.tsx) 밖에 둔다. */
export const PLAYGROUNDS = [
  'Button', 'IconButton', 'Chip', 'FilterPill', 'PosterChip', 'Badge',
  'Card', 'SortToggle', 'Avatar',
] as const

export const hasPlayground = (name: string) => (PLAYGROUNDS as readonly string[]).includes(name)

export const guideFor = (name: string): ComponentGuide | null => GUIDES[name] ?? null
