# 디자인 2.0 부채 목록 (2026-08-07 기준)

> 화면별 2.0 미준수 현황 + 컴포넌트 추출 후보. 근거: `npm run audit:ui` 결과(.audit-out) + 코드 실측.
> 완료 시 항목 지우고, audit baseline은 개선분만큼 하향해서 같이 커밋.

## 1. 화면별 미준수 현황

### 🔴 심함 — 2.0 이전 팔레트/문법
| 화면 | 파일 | 문제 |
|---|---|---|
| 온보딩 | `domain/onboarding/Onboarding.tsx` | 구팔레트 통째, 프리미티브 0 (raw 12) |
| 재방문 설문 | `domain/survey/FeedbackSurvey.tsx` + `survey.module.css` | 구 radius(20)·구 그림자, CSS 모듈 하드코딩. 2.0 재디자인 확정 (HANDOFF §3 4-1) |
| 영화제 상세 | `festival/[slug]/FestivalDetailClient.tsx` | gutter 5종 혼재(16·8·4·24·12), 색 하드코딩 3, 프리미티브 0 |
| 설정 패널 | `map/SettingsPanel.tsx` | 타이포만 2.0. 간격·카드 미이식, raw 12·색 3 |
| 지도 탭 | `map/MapView.tsx`·`FilterBar.tsx`·`SearchPanel.tsx` | 2.0 미이식 영역. 검색 팝오버·필터 칩 문법 films와 불일치 |
| GV | `GvEventSection.tsx`·`GvDetailPanel.tsx` | 피그마 미설계(사용자 숙제) + 색 하드코딩 3 |

### 🟡 부분 준수 — 2.0 이식됐지만 잔재
| 화면 | 파일 | 문제 |
|---|---|---|
| TheaterSheet | `domain/TheaterSheet.tsx` | **색 하드코딩 10건(전체 1위)**, raw 버튼 34(프리미티브 1) — 2.0 완료 화면인데 내부 부채 최다 |
| 영화 상세 | `films/movie/[id]/…` | **폰트: 제목·시간에 `--font-serif` 5곳** — 2.0 타이포는 KIMM(display)+Pretendard(+Libre 라틴)만. 세리프 유지 여부 결정 필요 |
| 극장 상세 | `films/theater/[id]/…` | serif 4곳 · **ShowtimeChip 구식**(2.0 ShowtimeCell 미적용, 반전 수법 없음) · 히어로 그라데이션(primary-subtle)은 2.0 표면 문법 밖 |
| 감독 상세 | `films/director/[name]/…` | serif 2곳 · 정렬 pill raw · 필모 리스트 행 구식 |
| 레거시 상세 | `movie/[id]`·`director/[name]` (SSG SEO용) | films 상세와 이중 구현 — 2.0 미이식 (통합 or 동결 결정 필요) |
| 인스타 섹션 | `InstagramRecsSection.tsx` | 색 1(#000 고정 카드 bg는 의도), 포스터 r8(→ `--radius-poster` 2 검토) |
| PosterThumb | `domain/PosterThumb.tsx` | 색 2 + 주석의 radius 구값(6/8px) 스테일 — 실값 2 |
| 검색(films) | `FilmsSearchBar.tsx` | raw 8 — 프리미티브 전환 여지, PC 포커스 상태 ACCENT 보더 1.5 하드코딩 |
| 데스크톱 패널 | `desktopDetailPanel/MoviePanel·DirectorPanel` | 지도 도크용 구세대 — films 상세와 중복 구현 |
| CalendarPicker | `filterBar/CalendarPicker.tsx` | raw 5, 2.0 DateCell 문법 미적용 |

### 폰트 규칙 위반 요약
- `--font-serif`(상세 제목·시간): films 상세 3종 + 레거시 2종. **2.0 확정 문법엔 없음** — ① KIMM으로 교체 ② serif를 공식 토큰으로 승격, 둘 중 결정.
- KIMM 오용: `privacy` Section h2가 KIMM 16 (display는 h1 24/h2 20만 허용).
- 하드 fontSize: audit 0건 (2026-08-07 해소).

### 색 규칙 위반 요약 (audit color 29건)
- TheaterSheet 10 · SettingsPanel 3 · Festival 3 · MapView 2 · PosterThumb 2 · GV 2 · 기타 7
- 대부분 rgba 그림자/스크림(의도적)과 구팔레트 hex 혼재 — 시맨틱 토큰(`--color-*`)으로 치환.

## 2. 컴포넌트/배리언트 추출 후보 (상영작·상세 작업 중 반복 확인)

### 우선 추출 (중복 2곳 이상, 즉시 효과)
1. **`ShowtimeGroupCard`** — [헤더(포스터+제목+메타) / 회차 3열 그리드] 카드. 영화 상세 극장 카드 + 극장 상세 영화 카드가 같은 골격의 이중 구현. 헤더만 slot으로.
2. **극장 상세 ShowtimeChip → `ShowtimeCell` 통일** — kind 분류(soldout/low/late/ended) 포함. 시트·영화 상세는 이미 Cell.
3. **`Avatar`** — 감독 원형 이미지 4곳(히어로 160/100 · 사이드카드 48 · DirectorChip 28 · 스포트라이트 88) 제각각. size prop + 이니셜 폴백 + inset 링.
4. **`SectionLabel`** — uppercase 13px 캡션 라벨("시놉시스"/"상세 정보"/"감독"/"소개") 6곳+ 반복.
5. **`InfoTable`** — 상세 정보 key-value 테이블(r12·row border) 영화 상세 + 레거시 중복.
6. **`MapCtaButton`류 아이콘 pill 버튼** — "지도에서 필터로 보기"(h30 pill primary) / "지도에서 보기·길찾기·공유"(h40 r12) → Button 프리미티브에 `icon` slot + `size=sm/md` + `variant=primary/secondary`로 흡수. 현재 Button 있는데도 raw로 6곳+.
7. **`DirectorChip`** — 영화 상세 히어로의 [아바타28+이름+감독→] pill. 감독 다중일 때 반복 렌더.
8. **`BookingCta`** — 회차 선택 모바일 하단 바 + PC 카드 한 컴포넌트 두 배리언트(bar/card). 영화·극장 상세 이중 구현.

### 피그마 배리언트로도 등록할 것 (Components 2.0)
- `2.0/ShowtimeGroupCard` (header=theater/movie 배리언트)
- `2.0/Avatar` (size=160/100/48/28)
- `2.0/BookingCta` (layout=bar/card)
- `2.0/DetailTopBar` (이미 코드 공용 — 피그마엔 프레임으로만 존재)
- `2.0/DetailDateTabs` 셀 (state=selected/default/disabled — 현 DateCell과 별개 문법이라 정리 필요: **DateCell(시트)과 DetailDateTabs(상세) 두 날짜 문법 공존 중 — 통합 결정 필요**)
- Chip에 `tone=filter`(예매 가능만 보기) 배리언트 — 코드 Chip 그대로 매핑

### 이미 공용화 완료 (참고)
- `DetailShell`·`DetailTopBar`·`DetailDateTabs`·`ShowtimeCell`·`DateBar`·`SectionHeader`·`ScrollNavButton`·`Chip`(예매 토글)·`.display-h1/h2`
