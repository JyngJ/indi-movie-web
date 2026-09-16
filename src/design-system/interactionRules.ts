/** 사람이 보는 Elevation 문서와 AI용 규칙이 같은 원본을 사용한다. */
export const INTERACTION_RULES = [
  {
    title: '겹침 순서',
    rules: [
      '그림자는 면의 깊이를 표현하고 z-index는 겹침 순서를 정해요. 그림자만으로 가림 문제를 해결할 수 없어요.',
      '지도 마커 내부는 포스터 < 코너 칩 < 호버 팝업 순서예요. --z-map-* 토큰은 마커 내부에서만 비교해요.',
      '부모의 z-index·transform·opacity가 별도 stacking context를 만들면 자식은 그 범위를 벗어나지 못해요. 팝업 숫자를 높이기 전에 부모부터 확인해요.',
      '본문은 이동 진행 표시 < 모서리 마스크 < 글로벌 메뉴 < 메뉴 팝오버 순서예요. --z-route-progress·--z-panel-mask·--z-navigation·--z-rail-popover를 사용해요.',
      '패널과 접기 손잡이는 --comp-panel-bg를 공유해요. 별도 흰색 면을 붙이지 않아요.',
    ],
  },
  {
    title: '스크롤과 메뉴 간격',
    rules: [
      '높이가 제한된 패널은 헤더와 PanelScrollBody로 구성해요. 메뉴 본문에 flex column을 직접 적용하지 않아요.',
      'PanelScrollBody는 block 흐름·min-height:0·overflow-y:auto를 보장해요. 긴 내용은 자식 높이를 줄이는 대신 스크롤해요.',
      '메뉴는 MenuCard와 MenuRow를 사용해요. 카드의 overflow:hidden은 모서리를 자르는 용도이며 콘텐츠 높이를 제한하지 않아요.',
    ],
  },
  {
    title: '알림 그릇 고르기',
    rules: [
      '필터·검색 결과처럼 사용자가 방금 한 행동의 결과는 토스트로 알려요. 스스로 사라지고 닫기 버튼을 두지 않아요.',
      '사라진 뒤 돌아갈 길이 화면에 남아 있으면 토스트로 충분해요. 지도 지역 안내는 지역 필터 칩이 그 길이에요.',
      '되돌릴 길이 화면에 없거나 진행을 멈추고 결정을 받아야 하면 시트·다이얼로그를 써요. 그런 일을 토스트로 알리지 않아요.',
      '지도의 지역 안내 문장은 buildRegionNotice가 만들어요. 상영이 있으면 결과 요약, 없으면 다른 지역 안내 — 둘 다 같은 토스트예요.',
      '같은 (영화×지역) 조합에서 같은 말을 두 번 하지 않아요. 조합이 바뀔 때만 다시 말해요.',
    ],
  },
  {
    title: '관심 상태와 상세 이동',
    rules: [
      '포스터의 아이콘 토글은 FavoriteButton, 상세의 문구 있는 토글은 FavoriteToggle을 사용해요. 로그인과 저장은 호출부에서 처리해요.',
      '상세 관심 토글은 미등록일 때 회색, 등록하면 옅은 빨강이에요. 문구가 바뀌어도 폭을 유지하고 reduced motion에서는 확대 애니메이션을 꺼요.',
      '상세의 명령형 이동은 useProgressRouter를 사용해요. RouteProgressBar는 Providers에 한 번만 두고, 메뉴 선택과 뒤로가기는 isFilmsPath로 상영작 경로를 판정해요.',
    ],
  },
]
