# 지도 탭 극장 시트 — 상영시간 전환율 개선 계획

작성일: 2026-07-21

## 배경 / 문제

모바일 사용자 비중 큼. 지도 탭 → 극장 시트 → 영화 선택 후, 상영시간을 실제로 눌러보는 비율 낮음 (세션 리플레이 관찰 근거, 추가 정량 검증은 6번 측정 계획으로 보완).

현재 깔때기 추정치 (PostHog 이벤트 기준):
- 시트 오픈 → 시트 내 상영시간 선택: **5.0%**
- 영화 선택 → 시트 내 상영시간 선택: **20.6%**
- 시트 내 상영시간 선택 월간 표본: **약 37명** (작음, 유의성 주의)

원인 가설: 영화 선택 시 상영시간 섹션이 화면 밖(아래)에 있어 스크롤 안 하면 안 보임. 날짜별 상영 여부를 미리 알 수 없어 날짜 tap을 헛되이 반복. 예매 가능 회차만 거르는 빠른 필터가 상단에 노출 안 됨(드로어 안에만 있음).

관련 코드: `src/components/domain/TheaterSheet.tsx` (메인, 2157줄), `src/components/domain/DateBar.tsx`, `src/components/domain/ShowtimeCell.tsx`, 부모 `src/components/map/MapView.tsx`.

---

## 0. 순서 (선행 계측 → 개선 → 검증)

1. 계측 공백 메우기 (5번)
2. UX 개선 3건 배포 (1, 2, 3번)
3. 수 주간 전후 비교 (6번)

---

## 1. 영화 선택 시 상영시간 섹션으로 스무스 스크롤

**변경 지점**: `handleMovieSelect` — `TheaterSheet.tsx:617-628`
**대상 ref**: `showtimeSectionRef` — 이미 선언돼 있음 (`TheaterSheet.tsx:429`), `IntersectionObserver`가 참조 중 (`470-482`).

구현:
```ts
const handleMovieSelect = (movieId: string, source: string) => {
  const entry = allMovieEntries.find((item) => item.movie.id === movieId)
  const isSameMovie = movieId === selectedMovieId // 기존 selected state와 비교

  trackEvent('theater movie selected', { theater_id: theater.id, ..., source, selected_date: selectedIsoDate })
  onMovieSelect(movieId)

  if (!isSameMovie) {
    // 같은 영화 재탭 시 반복 스크롤 방지 가드
    requestAnimationFrame(() => {
      showtimeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
}
```

주의:
- 정보 구조(영화 정보 → 감독 → 버튼 → 상영시간) 순서는 그대로 유지, 스크롤 위치만 이동.
- `block: 'start'` 권장 (섹션 상단이 뷰포트 상단 근처로) — 실제 sticky 헤더(날짜바 등) 높이 고려해 `scroll-margin-top` CSS로 오프셋 보정 필요할 수 있음. `TheaterSheet.tsx:1361` sticky DateBar 높이 확인 후 조정.
- 가드: `isSameMovie` 체크로 같은 영화 재탭 시 스크롤 재발 방지. `selectedMovieId`는 기존 state 사용 (state 갱신 전에 비교해야 하므로 `onMovieSelect` 호출 전에 계산).
- 시트가 드래그로 collapsed 상태일 때(=`useDragSheet`) 스크롤 대상이 실제로 보이는 영역인지 확인 필요 — collapsed/expanded 두 케이스 모두 QA.

---

## 2. 날짜 탭에 "이 영화 상영일" 밑줄 표시

**대상**: `DateBar.tsx` (line 78 컴포넌트), day 배열은 `TheaterSheet.tsx:198-217` `buildDays()`에서 생성.

구현 방향:
- `buildDays()` 또는 `DateBar` 호출부에서, 선택된 영화(`selectedMovieId`)의 상영 날짜 집합을 계산해 `Day` 타입에 `hasSelectedMovie: boolean` 같은 필드 추가.
- 상영 날짜 집합 소스: 영화별 showtime 데이터에서 날짜별 그룹 필요 — 현재 `availableDates`가 극장 단위로 존재(`disabled` 계산에 이미 사용, `TheaterSheet.tsx:198-217` 근처). 영화 단위로 존재하는지 확인 필요(없으면 `allMovieEntries`에서 movie별 showtime → date 파생 함수 추가).
- `DateBar.tsx`에서 `hasSelectedMovie`가 true인 날짜 아래 짧은 밑줄(2-3px, brand color) 렌더. 기존 `getDayTextColor` (`DateBar.tsx:25-34`) 옆에 비슷한 위치에 `getUnderlineVisible` 유틸 추가.
- 영화 미선택 상태에선 밑줄 렌더 안 함 (전원 상영일 표시는 노이즈).

---

## 3. "당일 예매 가능만" 빠른 필터를 상단에 노출

**현재 상태**: 이미 로직은 있음 — 드로어 안 `pendingFilters.bookable` 토글 (`TheaterSheet.tsx:2102-2133`), `applySheetFilters` (`287-301`), `bookableMovieIds`/`filteredMovieEntries` (`522-547`), 이벤트 `'map filter changed'` (`288`, `filter_scope: 'theater_sheet'`).

**변경**: 드로어에 숨어있는 걸 상단 "12편 상영" 옆(필터 아이콘 왼쪽)에 즉시 토글 가능한 칩으로 노출.

구현:
- 새 칩 UI를 필터 아이콘(`IconFilter`, `1496` 근처) 왼쪽에 추가, `sheetFilters.bookable` 상태를 직접 바인딩 (드로어 열지 않고 즉시 적용 — `pendingFilters` 우회, 바로 `sheetFilters` 갱신 + `trackEvent('map filter changed', ...)`).
- 드로어 내부 토글과 상태 동기화 유지 (같은 `sheetFilters.bookable` 소스 공유).
- "지난 회차" 정의: `ShowtimeCell`의 `kind` 계산(`1905-1912`, ended/nowplaying/soldout/low/late/normal) 재사용 — 필터는 `ended`, `soldout` 제외 기준.

---

## 4. (참고) 정보 구조 유지 원칙

1, 2, 3번 모두 기존 DOM 순서/컴포넌트 트리 변경 없음. 스크롤 위치 이동 + 표시 요소 추가만. 레이아웃 시프트 없도록 밑줄은 기존 날짜 셀 높이 안에 흡수(`padding-bottom` 등으로 사전 확보), 칩은 기존 "예매 가능만 보기" 관련 요소 자리 재활용.

---

## 5. 계측 공백 메우기 (선행 작업 — 개선 착수 전 필수)

| 대상 | 현재 | 조치 |
|---|---|---|
| 시트 오픈/닫기 | ✅ `MapView.tsx:2166,2217,2282,2384` (opened), `2363,3670` (closed) | 유지 |
| 영화 선택 | ✅ `TheaterSheet.tsx:619` `'theater movie selected'` | 유지 |
| 날짜 변경 | ✅ `TheaterSheet.tsx:1378` `'theater date changed'` | 유지 |
| 시트 내 상영시간 선택 | ✅ `TheaterSheet.tsx:634` `'showtime selected'` (source=theater_sheet) | 유지 |
| 시트 필터 버튼 | ❌ 계측 없음 | **신규**: 필터 아이콘 클릭 시 `'theater sheet filter opened'` 추가 (`1496` 근처 onClick). `map filter changed`(`288`)는 "적용" 시점 이벤트라 "버튼을 눌러 드로어를 열었다"는 별도로 필요. |
| 지난 회차 클릭 시도 | ❌ 없음 | **신규**: `ShowtimeCell`에서 `kind === 'ended'` 또는 `soldout`인 셀 클릭 시 `'showtime unavailable clicked'` (kind 포함) 이벤트 추가. 현재 `onClick`이 `handleShowtimeSelect`(`1923`)로 가는지, disabled 처리라 클릭 자체가 막혀있는지 먼저 확인 — 막혀있다면 pointerdown 레벨에서라도 캡처 필요. |
| (신규, 3번 대비) 빠른 필터 칩 사용 | — | **신규**: 상단 칩 토글 시에도 기존 `'map filter changed'` 재사용 가능, `filter_scope` 값으로 드로어 vs 칩 구분 (예: `filter_scope: 'theater_sheet_quick'`). |

배포 순서: 계측 먼저 머지·배포 → 최소 며칠 베이스라인 수집 → 이후 1/2/3번 UX 변경 배포.

---

## 6. 측정 계획 (개선 효과 검증)

- **주 지표**: 영화 선택 → 시트 내 상영시간 선택 전환율 (현재 20.6%)
- **보조 지표**: 시트 오픈 → 상영시간 선택 전환율 (현재 5.0%), 예매 클릭 전환 (`'booking clicked'`, `TheaterSheet.tsx:1968`)
- **신규 보조 지표** (5번 계측 이후 확보): 필터 버튼 사용률, 지난 회차 클릭 시도율 — 값 자체가 아니라 UX 마찰 지점 파악용
- **방법**: 개선 배포 전후 비교(PostHog). 표본 충분해지면 시트 렌더 레벨 A/B (스크롤 이동 유/무) 고려.
- **주의**: 시트 내 상영시간 선택 월 37명 수준 — 표본 작음. 유의미한 전후 비교엔 수 주 필요, 초기 며칠 수치로 판단 금지.

---

## 브랜치 / 작업 분리 제안 (AGENTS.md 규칙)

- `chore/theater-sheet-instrumentation` — 5번 계측만 (필터 오픈, 지난 회차 클릭 시도 이벤트)
- `feature/theater-sheet-scroll-to-showtime` — 1번
- `feature/theater-sheet-date-availability-indicator` — 2번
- `feature/theater-sheet-quick-bookable-filter` — 3번

계측 브랜치가 먼저 머지·배포되어야 베이스라인이 쌓이므로 순서 준수.
