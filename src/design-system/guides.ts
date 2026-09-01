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

/** do·dont만으로는 "이 경우엔 조심해서 쓴다"를 적을 자리가 없어 두 등급을 더 뒀다.
 *  caution — 금지는 아니지만 조건이 붙는 것. note — 규칙의 예외나 배경. */
export type GuideUsageKind = 'do' | 'dont' | 'caution' | 'note'

export interface GuideUsage {
  kind: GuideUsageKind
  rule: string
  /** 금지에는 대안을 붙인다 — "쓰지 마라"만 남으면 읽는 사람이 갈 곳을 잃는다. */
  instead?: string
}

/** 값이 바뀐 날과 그 이유. 토큰만 고치고 문서를 놔두면 "왜 이 값인가"가 사라져
 *  다음 사람이 같은 논쟁을 다시 한다. 날짜는 tokens.css 주석의 결정일을 따른다. */
export interface GuideChange {
  date: string
  note: string
}

export interface ComponentGuide {
  intro: string
  /** 개요 맨 앞에 놓는 변경 이력 — 최신이 위 */
  changes?: GuideChange[]
  anatomy?: GuidePart[]
  specs?: GuideSpec[]
  usage?: GuideUsage[]
  /** 접근성 — 이 컴포넌트에서 실제로 보장되는 것만 적는다 */
  a11y?: GuideSpec[]
}

export const GUIDES: Record<string, ComponentGuide> = {
  Button: {
    changes: [
      { date: '2026-08-08', note: '크기를 sm/md/lg = 32/44/52, 좌우 여백을 16/32/48로 고정했습니다(피그마 확정). 웨이트는 400/500/700입니다.' },
      { date: '2026-07-28', note: '--radius-button(8)을 --radius-control(12)에서 분리했습니다. control 반경이 버튼에는 과했습니다.' },
    ],
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
      { kind: 'dont', rule: 'primary를 나란히 두 개 배치하지 않습니다.', instead: '주행동 하나만 primary로 두고 나머지는 secondary·text로 낮춥니다.' },
      { kind: 'caution', rule: 'danger는 되돌릴 수 없는 행동에만 사용합니다.' },
    ],
    a11y: [
      { title: '터치 타깃', desc: 'md(44)는 --touch-target과 같은 값입니다. sm(32)은 밀집한 목록 안에서만 쓰고, 그 안에서도 좌우 간격으로 실제 누르는 면을 확보합니다.' },
      { title: '중복 제출', desc: 'loading을 켜면 disabled가 함께 걸립니다. 응답을 기다리는 동안 같은 요청이 두 번 가지 않습니다.' },
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
      { title: 'overlay 변형', desc: '포스터나 지도처럼 뒤에 무엇이 올지 모르는 자리에서 씁니다. ghost는 배경의 밝은 부분에 닿으면 사라지지만, overlay는 자기 면(--color-surface-overlay)을 깔고 그 위에 상태 레이어(hover → pressed)를 얹어 어느 배경에서도 읽힙니다.' },
    ],
    usage: [
      { kind: 'do', rule: '모바일에서 아이콘 버튼 사이는 최소 12px을 확보합니다. 44 타깃이 겹치면 오조작이 발생합니다.' },
      { kind: 'dont', rule: '버튼을 맞붙이지 않습니다. 아이콘 사이가 떨어져 보여도 손가락이 닿는 44 영역은 이미 겹쳐 있습니다.' },
      { kind: 'dont', rule: '뜻이 하나로 읽히지 않는 아이콘(별·반짝임 등)을 글자 없이 단독으로 쓰지 않습니다.', instead: '글자가 필요하면 Button을, 목록 안 보조 행동이면 text 변형을 사용합니다.' },
    ],
    a11y: [
      { title: 'aria-label', desc: '타입에서 필수(string)로 지정돼 있습니다. 화면에 글자가 없으므로 이것이 이 버튼의 유일한 이름입니다.' },
      { title: '크기', desc: '기본 44가 터치 타깃 최소치입니다. 32를 쓸 때는 이웃한 버튼과 12px 이상 띄웁니다.' },
    ],
  },

  Chip: {
    changes: [
      { date: '2026-08-18', note: '상태 색을 --chip-bg / --chip-bg-hover 토큰으로 옮겼습니다. 인라인 style로 배경을 넣으면 클래스 :hover가 밀려 호버가 죽습니다.' },
      { date: '2026-08-09', note: '높이를 36에서 32(--filter-chip-height)로 내려 피그마 2.0/Chip과 맞췄습니다.' },
    ],
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
      { kind: 'note', rule: 'GenreChip과 모양(pill)이 같습니다. 고르는 칩과 읽는 칩을 한 줄에 섞으면 어느 것이 눌리는지 알 수 없으므로 줄을 나눠 배치합니다.' },
    ],
    a11y: [
      { title: '터치 타깃', desc: '높이 32는 44에 미치지 못합니다. 가로 레일에서 칩 사이를 8 이상 띄워 실제 누르는 면을 확보합니다.' },
    ],
  },

  FilterPill: {
    changes: [
      { date: '2026-08-18', note: '상태 색을 토큰으로 옮겼습니다. 인라인 style로 배경을 넣으면 클래스 :hover가 밀려 호버가 죽습니다 — 칩 계열이 함께 겪던 문제입니다.' },
    ],
    intro:
      '켜고 끄는 단일 조건을 담습니다. "예매 가능만 보기"처럼 문장형 레이블이 들어가는 필터에 사용합니다. ' +
      '레이블은 12px/600(--text-meta + SemiBold)이며 피그마 2.0/meta-strong과 같은 조합입니다.',
    specs: [
      { title: '활성 표현', desc: '면 색과 글자색으로 표현합니다. 상태 레이어는 토큰화된 색을 사용해 어떤 배경 위에서도 같은 대비를 유지합니다.' },
    ],
    usage: [
      { kind: 'do', rule: '조건이 하나일 때 사용합니다. 선택할 값이 여러 개면 드롭다운형 FilterChip을 사용합니다.' },
      { kind: 'dont', rule: '활성 상태를 테두리만으로 표시하지 않습니다. 지도 위에서는 구분되지 않습니다.', instead: '면(primary/100)과 글자색(primary/900)을 함께 바꿔 표현합니다.' },
    ],
    a11y: [
      { title: '터치 타깃', desc: '높이 28은 터치 타깃 최소치(44)에 못 미칩니다. 필터 줄에서는 위아래 여백으로 실제 누르는 면을 넓힙니다.' },
      { title: '상태 전달', desc: '활성은 면과 글자색을 함께 바꿔 알립니다. 색 하나만 바뀌면 색을 구별하지 못하는 사람에게 두 상태가 같습니다.' },
    ],
  },

  PosterChip: {
    changes: [
      { date: '2026-09-01', note: '긴 카피를 자르지 않고 접도록 바꿨습니다(white-space: normal · word-break: keep-all · lineHeight 1.2 · maxWidth). 문서에는 접기가 규칙으로 적혀 있었는데 컴포넌트는 nowrap이라, 규칙을 지킨 곳은 정작 이 컴포넌트를 쓰지 않는 화면뿐이었습니다.' },
      { date: '2026-09-01', note: 'GvEventSection·InstagramRecsSection·TheaterSheet·CurationSheet의 인라인 칩을 실제로 이 컴포넌트로 옮겼습니다. 8/13에 합쳤다고 적었지만 옮겨간 건 CurationSectionRow 하나뿐이었고, 나머지는 구 스펙(10px/600·padding 4 8)으로 2주 넘게 남아 있었습니다.' },
      { date: '2026-08-13', note: '글자를 11px/600에서 12px/700으로, 안쪽 여백을 4 8에서 8 12로 키웠습니다. 문서는 11px인데 코드는 --text-badge(10px)를 써서 값이 셋으로 갈려 있었고, 포스터 위에서 읽히지 않았습니다.' },
      { date: '2026-08-13', note: 'CurationSectionRow의 인라인 칩을 이 컴포넌트로 옮겼습니다. 정책은 한 줄인데 구현이 다섯이라 크기·여백·그림자가 조금씩 어긋나 있었습니다.' },
      { date: '2026-08-03', note: '--radius-poster를 8에서 2로 내렸습니다(인쇄물 모서리). 칩의 4px 라운드가 상대적으로 둥글어 보이는 것은 의도한 대비입니다.' },
    ],
    intro:
      '포스터 이미지 위에 얹는 오버레이 칩입니다. 상영 상태·GV·시간처럼 포스터를 가리지 않고 전달해야 하는 정보에 사용하며, ' +
      '12px/700 · padding 8 12 · offset 6으로 포스터 위에서도 읽히는 크기를 유지합니다.',
    anatomy: [
      { name: 'corner', desc: '네 모서리 중 하나를 지정합니다. 좌하단은 순위 표기 전용으로 비워 둡니다.' },
      { name: 'tone', desc: '의미색을 지정합니다. error(매진) · warning(잔여 적음) · success(상영중) · gv · scrim(중립 정보).' },
      { name: 'size', desc: 'default(12/700 · 8 12) / compact(10/600 · 4 8). compact는 포스터가 아닌 소형 썸네일 전용입니다.' },
    ],
    specs: [
      { title: '여백', desc: '포스터 모서리에서 6px(--comp-poster-chip-offset), 칩 내부는 8/12(--comp-poster-chip-pad)입니다.' },
      { title: '좌하단 규칙', desc: '랭킹 섹션이 스크림과 KIMM 숫자를 좌하단에 배치합니다. 이 자리는 순위 표기로 비워 둡니다.' },
      { title: 'compact', desc: '기본 규격은 높이 30px이라 GV 카드의 56px 색 띠에서는 절반을 덮습니다. 그런 소형 썸네일에서만 compact(높이 20px)를 쓰고, 88px 이상 포스터에는 쓰지 않습니다.' },
      { title: '접기', desc: '긴 카피는 말줄임 대신 어절 단위로 접습니다. 막바지 카피("오늘이 마지막"·"D-n 막바지 상영")는 완화·생략이 금지라 92px 포스터에서 자르면 곧 규칙 위반이 됩니다. 폭은 포스터에서 좌우 offset을 뺀 만큼입니다.' },
    ],
    usage: [
      { kind: 'do', rule: '한 포스터에 칩은 두 개까지 사용합니다.' },
      { kind: 'dont', rule: '좌하단에는 칩을 배치하지 않습니다. 순위 표기 자리입니다.', instead: '상태 정보는 우하단, 시간·거리는 우상단에 둡니다.' },
      { kind: 'caution', rule: '우상단은 관심 하트(FavoriteButton overlay)와 같은 자리입니다.', instead: '한 포스터에 하트와 우상단 칩을 함께 얹지 않습니다 — 관심 섹션에는 하트를, 거리·시간 정보에는 칩을 둡니다.' },
      { kind: 'caution', rule: 'neutral 톤(#78716C)은 neutral 램프에 대응 스탑이 없어 하드코딩으로 남아 있는 예외입니다. 새 색이 필요하다고 이 자리에 값을 하나 더 넣지 않습니다.', instead: '램프에 스탑을 만들고 그 토큰을 참조합니다.' },
    ],
    a11y: [
      { title: '축약 풀기', desc: 'label을 넘기면 스크린리더가 그 문구를 읽습니다. 화면의 "30주년"은 label="개봉 30주년"으로 풀어 줍니다 — 눈은 포스터를 함께 보지만 리더는 칩만 읽습니다.' },
      { title: '초점', desc: 'pointer-events: none이라 초점을 받지 않습니다. 칩이 전하는 사실은 감싸는 카드의 접근성 이름에 포함되어야 합니다.' },
      { title: '대비', desc: '배경 사진을 통제할 수 없으므로 모든 톤이 불투명 배경 + 흰 글자(--color-on-accent)입니다. 반투명 배경을 쓰지 않습니다.' },
    ],
  },

  Badge: {
    intro:
      '텍스트 옆에 붙는 상태 표식입니다. 스스로 행동하지 않으며, 누를 수 있는 요소로 보이지 않도록 합니다. ' +
      '틴트 면 위에 같은 계열의 딥 스탑 글자를 얹는 "틴트 배경 + 900 텍스트" 문법을 씁니다.',
    specs: [
      { title: '크기', desc: '높이 20 · 좌우 8 · pill입니다. 칩과 모양이 같으므로 크기와 자리로 구분합니다 — 배지는 글자 옆에 붙고 칩은 줄을 이룹니다.' },
      { title: '색', desc: 'default는 border 면, 나머지는 시맨틱 틴트(success·warning·error·info) 위에 같은 계열 딥 스탑 글자입니다. 솔리드 면은 쓰지 않습니다 — 그건 포스터 위 칩의 문법입니다.' },
    ],
    usage: [
      { kind: 'do', rule: '상태를 나타내는 한 단어만 담습니다 — 매진, 상영중, GV.' },
      { kind: 'dont', rule: '배지에 클릭 핸들러를 연결하지 않습니다.', instead: '누를 수 있어야 하면 Chip이나 Button을 사용합니다.' },
      { kind: 'caution', rule: '글자 크기가 11px로 박혀 있습니다. 타입 스케일(10 · 12) 밖의 값이라 감사에서 하드코딩으로 집계됩니다.', instead: '수렴할 때는 --text-badge(10) 또는 --text-meta(12) 중 하나로 옮깁니다.' },
    ],
    a11y: [
      { title: '초점', desc: 'span이라 초점을 받지 않습니다. 상태를 나타내는 표식이지 조작하는 요소가 아닙니다.' },
      { title: '색만으로 알리지 않기', desc: '면 색과 함께 글자로도 상태를 적습니다 — "매진"이라는 말이 있어야 색을 구별하지 못해도 읽힙니다.' },
    ],
  },

  Card: {
    changes: [
      { date: '2026-08-04', note: '그림자를 2겹(direct + ambient)으로 바꾸고 색을 웜 브라운(--shadow-base #140F0A)으로 고정했습니다. 순검정 그림자는 미색 종이 위에서 재처럼 보였습니다.' },
    ],
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
    a11y: [
      { title: '키보드', desc: 'onClick을 넘기면 role="button"과 tabIndex 0이 함께 붙습니다. 카드 전체가 하나의 클릭 타깃이므로 안에 또 다른 버튼을 두면 초점이 두 번 멈춥니다.' },
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
      { kind: 'dont', rule: '레이블 없이 placeholder만 두지 않습니다. 입력을 시작하면 무엇을 적는 칸이었는지 사라집니다.', instead: '레이블은 위에 두고, placeholder에는 예시 값을 적습니다.' },
    ],
    a11y: [
      { title: '레이블 연결', desc: 'label을 넘기면 htmlFor로 입력과 묶입니다. label 없이 쓸 때는 id를 직접 지정하고 바깥 레이블과 연결합니다 — 자동 생성되는 id는 레이블 문자열에서 만들어지므로 label이 없으면 id도 없습니다.' },
    ],
  },

  Icon: {
    intro: '서비스의 유일한 아이콘 진입점입니다. lucide를 소스로 쓰고, lucide v1이 뺀 브랜드 마크(instagram·github·linkedin)만 직접 그립니다. 카카오 로그인처럼 규격이 정해진 마크는 레지스트리에 두지 않고 그 컴포넌트가 직접 갖습니다. 새 글리프가 필요하면 호출부에서 svg를 그리지 말고 레지스트리에 이름을 추가합니다.',
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

  FavoriteButton: {
    changes: [
      { date: '2026-09-01', note: '지도 큐레이션 "관심 작품 상영 중"의 "관심 영화"/"관심 감독" 텍스트 칩을 이 버튼(overlay 32)으로 바꿨습니다. 같은 관심을 화면마다 텍스트 칩·빨간 링·하트로 달리 그리고 있었고, 관심 전용 섹션인데 정작 거기서 해제할 수가 없었습니다.' },
    ],
    intro:
      '관심(하트) 토글입니다. 채워진 하트는 등록됨, 빈 하트는 등록 안 됨이며 누르면 그 자리에서 바뀝니다. ' +
      '상태·로그인 게이트는 호출부(useFavorites)가 맡고 버튼은 모양만 담당합니다.',
    anatomy: [
      { name: 'variant', desc: 'ghost — 상단바·헤더·행 우측. overlay — 포스터 이미지 위.' },
      { name: 'size', desc: '32(포스터 오버레이·목록 그리드) / 44(기본) / 52(상세 액션 행).' },
    ],
    specs: [
      { title: '색', desc: '채워진 하트는 --color-error-mid, 빈 하트는 currentColor 선입니다. 관심의 빨강은 에러 빨강과 같은 스탑을 쓰지만 의미가 다르므로 경고 문구와 같은 화면에 나란히 놓지 않습니다.' },
      { title: '포스터 위 자리', desc: '포스터 우상단, 모서리에서 4px입니다. 좌하단은 순위, 좌상단은 오버레이 칩 자리라 하트는 우상단으로 고정합니다.' },
      { title: '거리 칩과의 관계', desc: '거리 칩도 우상단이라 한 포스터에 하트와 거리 칩을 함께 얹지 않습니다. 관심 섹션에는 하트를, 거리 섹션에는 칩을 둡니다.' },
      { title: '모션', desc: '켜고 끌 때 스프링으로 살짝 튑니다(stiffness 500 · damping 18). prefers-reduced-motion에서는 크기 변화 없이 상태만 바뀝니다.' },
    ],
    usage: [
      { kind: 'do', rule: '카드 전체가 버튼·링크인 곳에서는 하트를 그 안에 넣지 않고 감싼 요소에 형제로 얹습니다.', instead: '버튼 중첩은 유효하지 않은 마크업이고, 하트를 눌러도 카드 이동이 함께 일어납니다.' },
      { kind: 'do', rule: '대상이 감독 때문에 노출된 항목이면 하트의 대상도 그 감독으로 둡니다 — 해제하면 관심 감독에서 빠집니다.' },
      { kind: 'dont', rule: '관심 여부를 텍스트 칩("관심 영화")이나 빨간 테두리로 대신 표시하지 않습니다.', instead: '같은 뜻을 세 가지 기호로 나눠 쓰면 하트가 무엇을 뜻하는지 흐려집니다. 표식이 필요한 자리에도 같은 하트를 씁니다.' },
      { kind: 'caution', rule: '지도 핀·핀 포스터의 하트는 누를 수 없는 표식입니다.', instead: 'Leaflet DivIcon은 HTML 문자열이라 이 컴포넌트를 쓸 수 없습니다. 모양은 맞추되 토글은 기대하지 않습니다.' },
    ],
    a11y: [
      { title: '이름', desc: 'label에 대상 이름을 넘기면 "오디세이 관심 등록" / "오디세이 관심 해제"로 읽힙니다. 하트만 있는 버튼이 화면에 여럿이라 대상 이름 없이는 구분되지 않습니다.' },
      { title: '상태', desc: 'aria-pressed로 등록 여부를 알립니다. 색(빨강/회색)만으로 상태를 구분하지 않습니다.' },
      { title: '탭 크기', desc: 'size가 곧 탭 영역입니다 — IconButton은 width·height를 그 값으로 고정할 뿐 별도 여백을 두지 않습니다. 포스터 오버레이의 32는 권장 44보다 작은 의도된 예외이므로, 좁다고 그보다 더 줄이지 않습니다.' },
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
    specs: [
      { title: '크기', desc: '높이 28(--comp-sort-h) · 좌우 8(--comp-sort-px)입니다. 필터 칩(32)보다 한 단계 작게 두어 같은 줄에 있어도 필터와 섞이지 않습니다.' },
      { title: '활성 표현', desc: '활성일 때만 글자가 진해집니다. 면을 채우면 필터 칩으로 읽히므로 배경은 두지 않습니다.' },
    ],
    usage: [
      { kind: 'do', rule: '현재 정렬 기준을 글자로 보여줍니다 — "최신순 ↓".' },
      { kind: 'dont', rule: '정렬 상태를 아이콘만으로 표시하지 않습니다.', instead: '기준 이름과 방향 화살표를 함께 적습니다.' },
    ],
    a11y: [
      { title: '터치 타깃', desc: '높이 28은 터치 타깃 최소치(44)에 못 미칩니다. 섹션 머리 오른쪽에 둘 때는 위아래 여백으로 누르는 면을 넓힙니다.' },
      { title: '현재 기준', desc: '레이블 자체가 지금 무엇으로 정렬돼 있는지를 말합니다 — "최신순 ↓". 상태를 색으로만 알리지 않습니다.' },
    ],
  },

  Avatar: {
    intro: '감독 사진을 표시합니다. 사진이 없으면 이름 첫 글자로 대체해 빈 원이 남지 않도록 합니다.',
    specs: [
      { title: '이니셜', desc: '글자 크기는 지름의 36%입니다. 크기를 바꿔도 비율이 유지됩니다.' },
      { title: '크기', desc: '24는 감독 칩 안, 44는 목록, 64는 상세 머리에 사용합니다. 그 사이 값은 만들지 않습니다.' },
    ],
    usage: [
      { kind: 'do', rule: '사진이 없을 수 있는 자리에는 name을 반드시 함께 넘깁니다. 이니셜이 빈 원을 대신합니다.' },
      { kind: 'dont', rule: '아바타 자체를 클릭 타깃으로 쓰지 않습니다. 24px은 터치 타깃에 미치지 못합니다.', instead: '감독으로 이동해야 하면 DirectorChip을 사용합니다.' },
    ],
    a11y: [
      { title: '대체 텍스트', desc: '사진이 있으면 name이 그대로 img의 alt가 됩니다. name을 비우면 사진에 이름이 없는 채로 남습니다.' },
    ],
  },

  SectionHeader: {
    intro: '큐레이션 섹션의 머리입니다. 제목·설명·오른쪽 액션을 한 줄로 정렬합니다.',
    anatomy: [
      { name: '제목', desc: '무엇을 모아 둔 묶음인지 한 덩이로 적습니다. 이모지를 붙이면 제목 앞에 놓입니다.' },
      { required: false, name: '설명', desc: '제목만으로 기준이 분명하지 않을 때만 붙입니다 — "전국 독립·예술영화관 기준".' },
      { required: false, name: '오른쪽 액션', desc: '정렬 토글이나 전체보기처럼 섹션 전체에 걸리는 행동만 둡니다.' },
    ],
    usage: [
      { kind: 'do', rule: '설명은 한 줄로 마무리합니다.' },
      { kind: 'dont', rule: '설명에 두 문장을 넣지 않습니다. 머리가 길어지면 아래 목록이 화면 밖으로 밀립니다.', instead: '더 적을 것이 있으면 섹션 안 첫 카드나 상세 화면으로 내립니다.' },
    ],
    a11y: [
      { title: '제목 층', desc: 'title은 h2로 그려집니다. 화면에 h1이 하나 있어야 제목 층이 h1 → h2로 이어집니다 — 섹션 머리만 늘어놓으면 문서의 시작이 없습니다.' },
      { title: '이모지', desc: '이모지는 제목 글자 앞에 붙어 함께 읽힙니다. 뜻을 이모지에만 담지 않습니다.' },
    ],
  },

  Toast: {
    intro: '결과를 알리고 사라지는 알림입니다. 사용자의 다음 동작을 막지 않습니다(pointer-events 없음).',
    specs: [
      { title: '지속', desc: '기본 1600ms이며, trigger 값을 올릴 때마다 다시 표시됩니다.' },
    ],
    usage: [
      { kind: 'do', rule: '끝난 일을 알립니다 — "관심 영화에 담았어요". 사용자가 방금 한 행동의 결과만 담습니다.' },
      { kind: 'caution', rule: '기본 1600ms입니다. 읽는 데 그보다 오래 걸리는 문장은 토스트에 담기지 않습니다 — 한 줄로 줄이거나 다른 자리를 찾습니다.' },
      { kind: 'dont', rule: '토스트에 버튼을 넣지 않습니다. 1600ms 안에 누르지 못하면 사라집니다.', instead: '되돌릴 수 있어야 하면 삭제를 지연 실행하고 목록 안에서 되돌리게 합니다. 확인이 필요하면 시트나 모달을 사용합니다.' },
    ],
    a11y: [
      { title: '읽히는 방식', desc: 'role="status" · aria-live="polite"입니다. 초점을 빼앗지 않으므로 입력 중에도 하던 일을 끊지 않습니다.' },
    ],
  },

  BottomSheet: {
    intro: '화면 아래에서 올라오는 면입니다. 상단 모서리만 20(radius/sheet)으로 두고, 핸들로 끌 수 있음을 알립니다.',
    anatomy: [
      { name: '핸들', desc: '36×4(--comp-sheet-handle-*)입니다. 끌어서 닫을 수 있다는 유일한 신호이므로 생략하지 않습니다.' },
      { name: '내용', desc: '거터는 24(--gutter-sheet)를 사용합니다. 본문 화면(16)보다 넓게 두어 떠 있는 면임을 알립니다.' },
    ],
    specs: [
      { title: '그림자', desc: 'shadow/sheet — offset 0의 앰비언트 2겹입니다. 아래가 화면 끝이므로 방향성 그림자를 사용하지 않습니다.' },
      { title: '반경', desc: '상단만 20(radius/sheet)입니다. 하단은 화면 끝에 닿으므로 각을 남깁니다.' },
    ],
    usage: [
      { kind: 'do', rule: '지금 화면의 맥락을 유지한 채 보조 내용을 보여줄 때 사용합니다 — 극장 상영표, 필터 목록.' },
      { kind: 'dont', rule: '되돌릴 수 없는 확인을 시트로 받지 않습니다. 시트는 바깥을 눌러도 닫힙니다.', instead: '삭제·탈퇴처럼 확인이 필요한 흐름에는 모달을 사용합니다.' },
    ],
    a11y: [
      { title: '닫는 방법', desc: '핸들을 끌어 닫는 것 말고도 닫을 길이 있어야 합니다. 끌기는 포인터가 있어야 되는 동작입니다.' },
      { title: '초점', desc: '시트가 열리면 그 안으로 초점을 옮기고, 닫히면 열었던 자리로 되돌립니다. 뒤에 남은 화면으로 초점이 새면 어디를 조작하는지 알 수 없습니다.' },
    ],
  },

  FabRound: {
    intro:
      '지도 위에 떠 있는 단일 행동입니다. 44(--comp-fab-round-size) 원형이며, 지도 조작을 가리지 않는 자리에 배치합니다.',
    specs: [
      { title: '크기', desc: '지름 44 · 아이콘 18(--comp-fab-round-icon)로 지름의 약 0.41배입니다. 버튼을 키우면 글리프도 같은 비율로 키웁니다.' },
      { title: '떠 있는 정도', desc: 'E2를 사용합니다. 지도 타일 위에서 면이 사라지지 않도록 카드(E1)보다 한 단계 높입니다.' },
    ],
    usage: [
      { kind: 'do', rule: '한 화면에 하나만 둡니다. 지도에서 가장 자주 쓰는 행동 하나를 고릅니다.' },
      { kind: 'dont', rule: 'FAB을 스크롤되는 목록 위에 겹쳐 두지 않습니다. 손가락이 닿는 자리에서 카드를 가립니다.', instead: '목록의 주 행동은 카드 안 버튼이나 하단 고정 CTA로 둡니다.' },
    ],
    a11y: [
      { title: '이름', desc: '아이콘만 있으므로 aria-label이 필요합니다 — "현위치로", "지도 초기화"처럼 무엇이 일어나는지 적습니다.' },
      { title: '읽는 순서', desc: '화면에는 떠 있지만 DOM에서는 그 화면의 주 행동이 놓일 자리에 둡니다. 시각 위치와 읽는 순서가 어긋나지 않게 합니다.' },
    ],
  },

  BubbleTail: {
    intro:
      '말풍선 꼬리입니다. 11×11 정사각을 45도 돌려 붙이며, 붙는 면과 같은 색을 받아 배경과 이어집니다. ' +
      '지역 힌트 툴팁과 지도 말풍선이 이 문법을 공유합니다.',
    anatomy: [
      { name: 'dir', desc: 'up · right · left 중 팁이 향할 방향입니다. 회전한 정사각형의 어느 꼭짓점이 밖으로 나갈지를 정합니다.' },
      { name: 'background', desc: '말풍선 본체와 같은 색을 넘깁니다. 색이 어긋나면 꼬리가 덧붙인 조각으로 보입니다.' },
      { required: false, name: 'border', desc: '보더 있는 말풍선에서만 사용합니다. 팁에서 만나는 두 변에만 같은 보더를 그려 본체 선과 이어 붙입니다.' },
    ],
    specs: [
      { title: '튀어나오는 깊이', desc: '팁이 본체 밖으로 나가는 거리는 bubbleTailReach()로 계산합니다. 말풍선을 대상에 닿게 놓으려면 이 값만큼 띄웁니다 — 눈대중으로 맞추면 크기를 바꿀 때마다 다시 어긋납니다.' },
      { title: '보더 처리', desc: '노출되지 않는 두 변에는 보더를 그리지 않습니다. 본체에 가려지는 선을 그리면 겹친 자리가 진해집니다.' },
    ],
    usage: [
      { kind: 'do', rule: '본체와 같은 background·border 값을 그대로 넘겨 한 덩이로 보이게 합니다.' },
      { kind: 'dont', rule: '가리킬 대상이 없는 자리에 꼬리를 달지 않습니다.', instead: '떠 있는 안내만 필요하면 꼬리 없이 Card나 Toast를 사용합니다.' },
    ],
    a11y: [
      { title: '읽히지 않는 조각', desc: '꼬리는 글자가 없는 도형이라 스크린리더에 아무것도 남기지 않습니다. 말풍선이 무엇을 가리키는지는 본체 문구가 말해야 합니다 — "이 지역"처럼 화면을 봐야 아는 표현을 쓰지 않습니다.' },
    ],
  },

  CardContainer: {
    intro: '섹션 하나를 감싸는 흰 판입니다. 큐레이션 섹션에서 제목과 가로 레일을 한 카드 안에 묶습니다.',
  },

  DirectorChip: {
    intro:
      '감독 이름과 사진을 함께 담는 칩입니다. 통째로 하나의 클릭 타깃이며, 누르면 감독 상세로 이동합니다. ' +
      '감독 표시가 필요한 자리는 여러 화면에 흩어져 있습니다 — 새로 그리지 말고 이것을 사용합니다.',
    anatomy: [
      { name: '아바타', desc: '지름 24(--comp-director-chip-avatar)입니다. 사진이 없으면 Avatar가 이름 첫 글자로 대신합니다.' },
      { name: '이름', desc: '12px/500(caption)입니다. 길면 줄이지 않고 말줄임합니다.' },
      { required: false, name: 'pending', desc: '라우팅을 기다리는 동안의 표시입니다. 누른 뒤 아무 반응이 없는 구간을 없앱니다.' },
    ],
    specs: [
      { title: '좌우 패딩', desc: '8/12/8/8(--comp-director-chip-pad)로 좌우가 다릅니다. 왼쪽은 아바타가 여백을 채우고 오른쪽은 글자만 있어 같은 값을 주면 오른쪽이 좁아 보입니다.' },
      { title: '높이', desc: '피그마 40 기준입니다. role="button"에 걸리는 전역 min-height 44를 이 컴포넌트에서만 끕니다.' },
    ],
    usage: [
      { kind: 'do', rule: '카드 안에서는 alignSelf: flex-start로 두어 내용 폭만큼만 차지하게 합니다.' },
      { kind: 'dont', rule: '카드 아래 전체폭 행으로 늘리지 않습니다. 카드가 한 줄 더 길어집니다.', instead: '한 줄을 다 쓰는 감독 표시가 필요하면 SectionHeader를 사용합니다.' },
    ],
    a11y: [
      { title: '키보드', desc: 'onClick을 주면 role="button" · tabIndex 0이 붙고 Enter·Space로 열립니다. onClick이 없으면 초점을 받지 않는 표시가 됩니다.' },
      { title: '카드 안에서', desc: '클릭과 키 입력의 전파를 막습니다. 카드 전체가 눌리는 자리여도 감독 칩은 감독으로만 갑니다.' },
    ],
  },

  GenreChip: {
    intro:
      '장르를 표시하는 칩입니다. 선택 상태가 없는 표시 전용이라 누를 수 없습니다. ' +
      '같은 pill 모양이라도 Chip과 역할이 다릅니다 — 이쪽은 읽는 것, 저쪽은 고르는 것입니다.',
    specs: [
      { title: '크기', desc: '12px(--text-caption) · padding 4 8 · pill입니다. 선택 칩(Chip, 높이 32)보다 한 단계 작게 두어 고르는 줄과 읽는 줄을 구분합니다.' },
      { title: '색', desc: 'raised 면 + caption 글자 + 보더입니다. 채도를 두지 않아 누르는 요소로 보이지 않게 합니다.' },
    ],
    usage: [
      { kind: 'do', rule: '값이 고정된 표시에 사용합니다 — 장르, 등급, 상영 포맷.' },
      { kind: 'dont', rule: 'onClick을 붙이지 않습니다. 누를 수 있는 pill이 섞이면 어느 것이 필터인지 알 수 없습니다.', instead: '고르고 해제하는 자리에는 Chip을, 조건 하나를 켜고 끄는 자리에는 FilterPill을 사용합니다.' },
    ],
    a11y: [
      { title: '초점', desc: 'span이라 초점을 받지 않습니다. 읽는 표시이므로 탭 순서에 끼어들지 않는 것이 맞습니다.' },
    ],
  },

  ScrollNavButton: {
    intro:
      '가로 스크롤 레일의 좌우 이동 버튼입니다. 레일 위에 절대 배치로 얹으며, 마우스만 있는 환경을 위한 보조 수단입니다.',
    specs: [
      { title: '크기', desc: '기본 지름 32이고 아이콘은 지름의 44%입니다. size를 바꾸면 아이콘도 비례해 커집니다.' },
      { title: '배치', desc: '레일 안 absolute · 좌우 6px · 세로 중앙 · zIndex 3입니다. 전역 버튼 min-height 44를 끄고 원형을 유지합니다.' },
      { title: '면', desc: '흰 면 + 보더 + E1 그림자입니다. 포스터 위로 지나가도 사라지지 않아야 합니다.' },
    ],
    usage: [
      { kind: 'do', rule: '스와이프로도 넘길 수 있는 레일에만 얹습니다. 이 버튼은 대체 수단이 아니라 보조 수단입니다.' },
      { kind: 'dont', rule: '레일 끝에 도달했는데도 버튼을 그대로 두지 않습니다. 눌러도 아무 일이 없으면 고장으로 읽힙니다.', instead: '더 갈 곳이 없으면 해당 방향 버튼을 감춥니다.' },
    ],
    a11y: [
      { title: '이름', desc: 'aria-label로 "이전" · "다음"이 붙습니다. 화살표 모양만으로는 읽히지 않습니다.' },
      { title: '유일한 경로가 아니어야', desc: '레일 자체가 키보드와 스와이프로 움직입니다. 이 버튼이 없어도 끝까지 갈 수 있어야 합니다 — 감췄을 때 갈 길이 막히면 안 됩니다.' },
    ],
  },

  SearchBar: {
    changes: [
      { date: '2026-08-05', note: '반경을 pill에서 control(12)로 바꿨습니다(피그마 search 프레임 r12). 검색창만 유독 둥글어 다른 입력과 다른 문법으로 보였습니다.' },
    ],
    intro:
      '검색어를 직접 입력받는 바입니다. 검색 화면에서만 사용하며, 다른 화면에서는 같은 모양의 SearchBarButton이 이 자리를 대신합니다.',
    anatomy: [
      { name: '돋보기', desc: '왼쪽 16px 아이콘입니다. 입력 중에도 자리를 지켜 무엇을 하는 칸인지 남깁니다.' },
      { name: '입력', desc: '14px입니다. 플레이스홀더는 무엇을 찾을 수 있는지 나열합니다 — "영화, 영화관, 감독을 검색하세요".' },
      { required: false, name: '지우기', desc: '값이 있을 때만 나타납니다. 한 번에 비우고 다시 입력할 수 있게 합니다.' },
    ],
    specs: [
      { title: '크기', desc: '높이 44(--comp-search-height) · 좌우 18(--comp-search-px) · 반경 control 12(--comp-search-radius)입니다. 2.0에서 pill을 폐기했습니다(2026-08-05).' },
    ],
    usage: [
      { kind: 'do', rule: '검색 화면 최상단에 두고 진입과 동시에 초점을 줍니다.' },
      { kind: 'dont', rule: '목록 화면 상단에 입력 가능한 검색바를 두지 않습니다. 키보드가 올라오며 목록이 접힙니다.', instead: '이동만 필요한 자리에는 SearchBarButton을 사용합니다.' },
    ],
    a11y: [
      { title: '이름', desc: '보이는 레이블이 없으므로 aria-label이나 연결된 레이블이 필요합니다. 플레이스홀더는 입력을 시작하면 사라지므로 이름이 될 수 없습니다.' },
      { title: '글자 크기', desc: '기본 16px입니다. 그보다 작으면 iOS가 초점을 받을 때 화면을 확대합니다 — inputFontSize를 낮추는 것은 데스크톱 전용 배치에서만입니다.' },
    ],
  },

  SearchBarButton: {
    changes: [
      { date: '2026-08-05', note: 'SearchBar와 함께 반경을 pill에서 control(12)로 바꿨습니다. 두 상태가 같은 자리에 있는 것처럼 보이려면 값이 함께 움직여야 합니다.' },
    ],
    intro:
      '검색창처럼 생긴 버튼입니다. 누르면 입력이 아니라 검색 화면으로 이동합니다. ' +
      '목록 화면에서 키보드를 띄우지 않으면서 검색을 안내하는 자리입니다.',
    specs: [
      { title: '같은 규격', desc: 'SearchBar와 높이·좌우 여백·반경이 같습니다. 화면이 바뀌어도 같은 자리에 같은 것이 있는 것처럼 보이게 하기 위한 것이므로 따로 조정하지 않습니다.' },
      { title: '글자색', desc: '플레이스홀더 색(--color-text-placeholder)을 사용합니다. 입력된 값이 아니라 안내 문구임을 색으로 알립니다.' },
    ],
    usage: [
      { kind: 'do', rule: '상영작·지도처럼 검색이 주 행동이 아닌 화면에서 사용합니다.' },
      { kind: 'dont', rule: '이 버튼 안에서 입력을 받으려 하지 않습니다.', instead: '실제 입력이 필요하면 검색 화면으로 보내고 그곳에서 SearchBar를 사용합니다.' },
    ],
    a11y: [
      { title: '버튼으로 읽힌다', desc: 'button이라 "영화, 영화관, 감독을 검색하세요, 버튼"으로 읽힙니다. 안의 문구는 플레이스홀더가 아니라 이 버튼의 이름입니다 — 입력칸으로 오해되지 않게 문구를 행동처럼 적습니다.' },
    ],
  },

  Skeleton: {
    intro:
      '내용이 오기 전 자리를 잡아 두는 면입니다. 실제 요소와 같은 크기·반경으로 두어 내용이 들어올 때 화면이 밀리지 않게 합니다.',
    specs: [
      { title: '반경', desc: 'sm=badge(4) · md·lg=poster(2) · full=pill입니다. 대신할 요소와 같은 반경을 고릅니다 — 포스터 자리에 pill을 두면 로딩 중에 다른 화면처럼 보입니다.' },
      { title: '모션', desc: 'animate-pulse 한 종류만 사용합니다. 속도가 다른 스켈레톤이 한 화면에 섞이면 로딩이 아니라 고장으로 읽힙니다.' },
      { title: '색', desc: '--color-border 한 단계만 사용합니다. 여러 밝기를 섞어 실제 내용처럼 그리지 않습니다.' },
      { title: '프리셋 · 영화 카드', desc: 'MovieCardSkeleton — 포스터(2:3) + 제목 18 + 메타 14 두 줄입니다. 실제 카드와 줄 수·높이가 같아 목록 높이가 로딩 전후로 변하지 않습니다. 제목 75% · 메타 50%로 두어 글자가 들어찬 것처럼 보이게 합니다.' },
      { title: '프리셋 · 극장 카드', desc: 'TheaterCardSkeleton — 카드 면(control 12 + 보더) 안에 극장명 16 · 주소 12 · 68×32 시간 칩 세 개입니다. 시간 칩까지 그리는 이유는 이 카드의 높이를 결정하는 것이 칩 줄이기 때문입니다.' },
    ],
    usage: [
      { kind: 'do', rule: '대신할 요소와 같은 크기를 지정합니다. 폭이 다르면 내용이 들어오는 순간 레이아웃이 튑니다.' },
      { kind: 'dont', rule: '1초 안에 끝나는 갱신에는 사용하지 않습니다. 깜빡이고 사라지는 회색 면이 더 어수선합니다.', instead: '짧은 갱신에는 이전 내용을 그대로 두고 값만 교체합니다.' },
      { kind: 'caution', rule: '목록 전체를 스켈레톤으로 채우지 않습니다. 개수를 모를 때 여러 장을 그리면 도착한 내용보다 많아 보였다가 줄어듭니다.', instead: '첫 화면에 보이는 개수(모바일 4~6장)만 그리고 나머지는 비워 둡니다.' },
    ],
    a11y: [
      { title: '읽히지 않는다', desc: '글자가 없는 면이라 스크린리더에는 아무것도 남지 않습니다. 기다리는 중이라는 사실은 감싸는 영역에서 알려야 합니다 — 스켈레톤만 두면 화면이 빈 것과 구분되지 않습니다.' },
      { title: '모션', desc: '동작 최소화를 켠 사용자에게는 깜빡임이 부담이 됩니다. 애니메이션 없이도 자리가 잡혀 있어야 합니다.' },
    ],
  },



  Wordmark: {
    intro:
      '서비스 워드마크입니다. 피그마 2.0/logo/wordmark와 같은 도형이며, 색을 토큰으로 받아야 해서 패스를 인라인으로 들고 있습니다. ' +
      '배경을 통제할 수 없는 자리에서는 테두리 변형으로 글자가 읽히게 합니다.',
    specs: [
      { title: '변형', desc: '기본은 잉크 한 색(--color-neutral-900)입니다. outlineColor를 주면 피그마 Color=테두리 변형이 되어 글자 뒤에 흰 테두리 패스가 깔립니다.' },
      { title: '테두리 두께', desc: '141px 폭 기준 바깥 2px입니다. non-scaling-stroke로 화면 px에 고정되어 로고를 키워도 테두리가 같이 굵어지지 않습니다.' },
      { title: '획 순서', desc: 'paintOrder를 stroke로 두어 테두리가 글자 바깥으로만 나갑니다. 안쪽으로 파고들면 글자가 얇아 보입니다.' },
    ],
    usage: [
      { kind: 'do', rule: '지도처럼 배경이 정해지지 않은 자리에서는 테두리 변형을 사용합니다.' },
      { kind: 'dont', rule: '대비를 그림자로 만들지 않습니다. 밝은 지도 타일 위에서 그림자는 뭉개집니다.', instead: 'outlineColor에 흰색을 넘겨 테두리 변형을 사용합니다.' },
    ],
    a11y: [
      { title: 'title이 곧 이름', desc: 'title을 넘기면 role="img"과 aria-label이 붙어 읽힙니다. 넘기지 않으면 aria-hidden이 되어 조용히 지나갑니다 — 로고가 홈 링크일 때는 title을 주거나 링크 쪽에 이름을 답니다.' },
    ],
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
