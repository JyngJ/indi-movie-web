# Rage Click 개선 계획

출처: PostHog 최근 30일 rage click 세션 90개 분석 (2026-08-09). 7가지 패턴 발견.
아래는 그 7가지를 코드에서 원인 특정한 결과와 수정 계획.

> **상태 요약**
> - [x] 0단계 계측 — 커밋 `1215ffd`
> - [ ] P0 상영 일정 필터 마찰 (유형 1)
> - [ ] P0 필터 드롭다운 draft 패턴 (유형 1)
> - [ ] P1 캐러셀 (유형 6)
> - [ ] P1 온보딩 (유형 3)
> - [ ] P1 설문 타이밍 (유형 7)
> - [ ] P2 탐색 분산·예매 이탈·결정 불가 (유형 2·4·5)

---

## 원본 분석 (PostHog)

### 심각 (Critical)

**1. 상영 일정 필터 마찰**
날짜, 주차, 지역, 기간 선택 컨트롤이 반응하지 않거나 다음 단계로 진행이 안 되는 경우.
상영 시간 탐색의 핵심 경로에 위치해 전환율에 직접 영향.
- 증상: 날짜/지역 필터 반복 클릭 → 주차 이동 버튼에서 rage click → 필터 재적용 후 포기

### 높음 (High)

**2. 외부 예매 사이트 이탈 후 복귀**
상영 시간 선택 후 외부 예매 사이트로 이동했다가 돌아와서 같은 영화나 다른 극장을 탐색. 최종 전환 직전 누수.

**3. 온보딩 단계 마찰**
"다음", "시작", "위치 건너뛰기" 버튼에서 rage click. 대부분 결국 완료하지만 초기 마찰이 큼.

**4. 분산된 탐색 (영화 ↔ 지도 반복)**
영화 목록 → 지도 → 영화 상세 → 검색을 오가며 정보를 조합. 예매로 이어지는 모멘텀이 약함.

### 중간 (Medium)

**5. 극장 비교 후 결정 못함**
지도에서 여러 극장 시트를 열고 날짜를 바꾸지만 최종 예매 안 함. 탐색은 되나 결정을 돕는 요소 부족.

**6. 영화 캐러셀 내비게이션 마찰**
추천/큐레이션 행의 좌우 이동 버튼이 여러 번 눌러야 반응하거나 rage click.

**7. 설문 타이밍 문제**
온보딩 중, 영화 탐색 중에 설문이 등장해 흐름 방해. 대부분 즉시 닫고 이탈.

---

## 0단계 — 계측 (완료, 커밋 `1215ffd`)

수정 전 원인 구분과 개선 측정 기준선 확보가 목적. 동작 변경 없음.

### 들어간 것

- **`dead click` 이벤트** — [src/lib/analytics/deadClick.ts](../src/lib/analytics/deadClick.ts)
  document 캡처 리스너가 아래 3종 무반응 클릭을 잡는다.
  - `disabled` 요소
  - `aria-disabled="true"` 요소
  - `data-rc-dead="scrim"` 오버레이 스크림 (자기 자신이 눌렸을 때만)

  props: `rc`(컴포넌트 이름) · `reason` · `streak`(2초 내 연속 횟수) · `path`.
  컴포넌트별 30초 10건 상한.
  [providers.tsx](../src/app/providers.tsx)에서 전역 마운트.

- **`data-rc` 속성** — rage click을 element 셀렉터가 아니라 컴포넌트 이름으로 집계하기 위한 표식.
  PostHog autocapture가 `attr__data-rc`로 수집한다.

  | 값 | 위치 |
  |---|---|
  | `datebar-date`, `datebar-week-prev/next` | [DateBar.tsx](../src/components/domain/DateBar.tsx) |
  | `filter-chip-{movie,director,region,date,genre,nation,bookable}` | [FilterChip.tsx](../src/components/domain/filterBar/FilterChip.tsx) via [FilterBar.tsx](../src/components/domain/FilterBar.tsx) |
  | `filter-row-{radio,checkbox}` | [DropdownRow.tsx](../src/components/domain/filterBar/DropdownRow.tsx) |
  | `carousel-nav-{left,right}` | [ScrollNavButton.tsx](../src/components/primitives/ScrollNavButton.tsx) |
  | `onboarding-{skip,prev,next,dot,cta-location,cta-browse}` | [Onboarding.tsx](../src/components/domain/onboarding/Onboarding.tsx) |
  | `survey-{scrim,close,next}` | [FeedbackSurvey.tsx](../src/components/domain/survey/FeedbackSurvey.tsx) |
  | `booking-cta` | [BookingActions.tsx](../src/components/domain/booking/BookingActions.tsx) |

### 구현 중 발견한 함정 2개

1. **`disabled` 요소는 click 이벤트의 target이 조상으로 바뀐다.** `e.target`을 믿으면 안 되고
   좌표로 `document.elementFromPoint`를 다시 찍어야 진짜 눌린 요소가 나온다.

2. **Button 2.0은 disabled에 `pointer-events:none`을 건다** ([Button.tsx:88](../src/components/primitives/Button.tsx)).
   그러면 `elementFromPoint`조차 그 버튼을 건너뛴다.
   → **PostHog autocapture도 이 버튼들의 rage click을 지금까지 못 잡고 있었다는 뜻.**
   부모 서브트리에서 좌표를 품는 계측 노드를 직접 스캔하는 폴백을 뒀다 (`scanInertDescendant`, 상한 40노드).

### 검증

실 브라우저 확인 — plain disabled / aria-disabled / pointer-events:none 폴백 / 스크림 자기클릭 모두 발화,
정상 버튼·스크림 내부 카드 클릭은 미발화, streak 1→2→3 누적.
`tsc --noEmit` 클린, `npm run audit:ui:check` baseline 동일.

### 남은 수동 작업 (PostHog 콘솔)

- [ ] `dead click` 이벤트 인사이트 생성, `rc` breakdown. 이게 수정 전 기준선이 된다.
- [ ] rage click 인사이트를 `attr__data-rc` breakdown으로 전환.
- [ ] 세션 리플레이에서 유형 1·6 각 5개 직접 확인 — 아래 원인 추정은 코드 기반이라 리플레이로 교차검증 필요.

---

## P0 — 상영 일정 필터 마찰 (유형 1)

원인 3개 확정.

### (a) 로딩 중 모든 날짜가 비활성 — 최대 원인

[TheaterSheet.tsx:390](../src/components/domain/TheaterSheet.tsx) — `buildDays(7, theaterAvailableDates, dateWindowOffset)`.
`theaterAvailableDates`는 `allMovieEntries`에서 파생인데 `allMoviesLoading` 동안 빈 Set.
`buildDays`([:227](../src/components/domain/TheaterSheet.tsx))는 `availableDates ? !has(iso) : false` —
**빈 Set = 전부 disabled**. 시트 열자마자 7일 전부 취소선 + 클릭 무반응.

수정: `allMoviesLoading`이면 `availableDates`를 `undefined`로 넘겨 전부 활성 유지 + DateBar 스켈레톤/펄스.
로드 완료 후에만 disabled 적용.

### (b) disabled 클릭이 완전 무음

[DateBar.tsx:126,145](../src/components/domain/DateBar.tsx) — `disabled` 속성 + `onClick={undefined}`.

수정: `disabled` 제거하고 `aria-disabled`로 전환. 클릭 시 "이 날은 상영이 없어요" 인라인 토스트 +
가장 가까운 상영일 점프 제안. 무반응을 "이유 있는 반응"으로 바꾸는 게 핵심.
(`aria-disabled`로 바꾸면 위 계측이 자동으로 계속 잡는다.)

### (c) 주차 이동 버튼 28px + 상한 무고지

[DateBar.tsx:48-57](../src/components/domain/DateBar.tsx) — `width:28, height:28, minHeight:'unset'`.
[globals.css:57](../src/app/globals.css)의 44px 터치타겟(`--touch-target`)을 명시적으로 깬다. 오탭 → 연타.
[TheaterSheet.tsx:1404](../src/components/domain/TheaterSheet.tsx) — `hasNext={dateWindowOffset < 21}`.
4주차에서 opacity 0.25로 죽는데 "더 없음" 설명이 없다.

수정: 시각 크기 28 유지 + `::before` 확장 hit area 44px. 상한 도달 시 "3주 뒤까지만 볼 수 있어요" 힌트.

---

## P0 — 필터 드롭다운 draft 패턴 (유형 1 후반부)

[FilterBar.tsx:143-145](../src/components/domain/FilterBar.tsx) ·
[:246-250](../src/components/domain/FilterBar.tsx) ·
[MultiSelectDropdown.tsx](../src/components/domain/filterBar/MultiSelectDropdown.tsx)

장르·국가는 draft 상태다. 체크해도 **닫아야 적용**되는데 적용 버튼이 없다.
사용자는 체크 → 뒤 목록 안 변함 → 다시 탭 → 연타.

게다가 바깥 닫기 핸들러가 `document.addEventListener('mousedown', …)`.
터치에서 mousedown은 합성 이벤트라 스크롤/탭 상황에 안 뜨거나 지연된다. 모바일에서 드롭다운이 안 닫히는 케이스 존재.

수정:
1. `mousedown` → `pointerdown` 교체 (터치 즉시 반응). **먼저 할 것.**
2. draft 폐기하고 즉시 적용(날짜·지역과 동일 문법)으로 통일 — 또는 최소한 하단 "적용 (N)" 버튼 명시.
   **즉시 적용 권장**: 다른 칩과 문법 일치, 결과 즉시 확인.
3. 필터 적용 후 결과 로딩 구간에 스켈레톤. 지금은 이전 결과가 그대로 남아 "안 먹혔다"로 읽힌다.

---

## P1 — 캐러셀 (유형 6)

[CurationSectionRow.tsx:329-337](../src/components/domain/CurationSectionRow.tsx)

```js
if (!el || scrollingRef.current) return
```

350ms 락. 주석엔 "연타 방지"라 적혀 있지만 실제론 **연타 유발** — 두 번째 클릭이 조용히 버려져
"안 눌렸다"로 보인다.

[:427,434](../src/components/domain/CurationSectionRow.tsx) — 버튼이 `rowHovered`일 때만 렌더.
마우스가 버튼 위로 가는 순간이 리렌더 경계라 첫 클릭이 새로 마운트된 요소에 떨어져 씹힐 수 있다.

수정: 락 제거하고 목표 위치 누적 방식으로 (`targetLeft += delta` ref 관리).
버튼은 항상 렌더하고 opacity로만 숨김 — 마운트/언마운트 금지.

---

## P1 — 온보딩 (유형 3)

[Onboarding.tsx:155-166](../src/components/domain/onboarding/Onboarding.tsx) —
`scrollTo({behavior:'smooth'})` on scroll-snap 컨테이너. iOS Safari에서 snap + smooth 조합은
무시되거나 튄다. "다음" 눌렀는데 안 넘어감 → 연타.

[:118-127](../src/components/domain/onboarding/Onboarding.tsx) —
CTA는 `requestLocation()` → `close()` → `router.push()`.
권한 프롬프트 대기 + 라우팅 대기 동안 버튼에 **pending 상태가 없다.** "시작" 연타 원인.

수정:
- `goTo`에 in-flight 가드 + snap 컨테이너에서 `scrollTo` 실패 시 `setPage` 폴백. **iOS 실기 확인 필수.**
- CTA에 `loading` 상태 (Button 2.0에 `loading` prop 이미 있음) + 중복 실행 방지.
- 도트/이전 버튼 터치타겟 44px 확인.

---

## P1 — 설문 타이밍 (유형 7)

[SurveyGate.tsx:13](../src/components/domain/survey/SurveyGate.tsx) — 진입 15초 고정. 사용자가 뭘 하든 무관.
[survey.module.css:1-11](../src/components/domain/survey/survey.module.css) —
스크림에 **onClick이 없다.** z-index 1200. 밖을 탭해도 안 닫힘 → 확정 rage click.

수정:
- 스크림 클릭 = 닫기. 단 `markSurvey('dismissed')`(영구 소각)와는 분리 — 실수 탭으로 영구 소각되면 응답률 손해.
  스크림 탭은 "다음에"로 처리 권장.
- 트리거를 시간 → **행동**으로: 예매 링크 클릭 후 복귀 시점, 또는 시트 닫은 직후 idle 3초.
  최소한 "온보딩 이후 30초 이상 무입력"일 때만.
- 온보딩/시트/드롭다운 열림 상태에선 억제.

---

## P2 — 유형 2·4·5 (탐색 분산, 예매 이탈, 결정 불가)

UI 버그가 아니라 정보 구조 문제. 별도 브랜치로 분리, 위 P0/P1 지표 개선 확인 후 착수.

- **유형 2**: 외부 예매 새 탭 복귀 시 "보던 상영 이어보기" 복원 배너.
- **유형 5**: 극장 시트에 비교 근거 추가 — 거리 · 다음 상영까지 남은 시간 · 좌석 여부.
- **유형 4**: 지도 ↔ 영화 왕복 대신 시트 안에서 완결되도록.

---

## 실행 순서

1. ~~계측~~ → 완료. 기준선 데이터 쌓이는 중.
2. `fix/rage-click-p0` — P0 두 절 전체. 가장 큰 효과.
3. `fix/rage-click-p1` — 캐러셀 · 온보딩 · 설문
4. 각 브랜치 `npm run audit:ui:check` 통과 + **iOS 실기 확인 필수**
   (smooth scroll · pointerdown 이슈는 데스크톱에서 재현 안 됨)
5. 2주 후 `dead click` · rage click 재측정

### 브랜치 주의

계측 커밋은 `feature/design-refactor`에 들어갔다. 계측 대상 파일(DateBar · Onboarding · survey · FilterBar)이
전부 디자인 리팩터 중인 파일이라 stale `main`에서 브랜치를 따면 충돌이 확정이었기 때문.
P0/P1 브랜치도 design-refactor가 main에 머지된 뒤 최신 main에서 따는 게 맞다.

---

## 기준선 (Baseline) — 2026-07-13 ~ 2026-08-11 (30일)

PR #272(`fix/rageclick-friction`) **직전** 값. 개선 효과는 배포 후 동일 길이 구간과 비교한다.
아래 두 계열은 **집계 단위가 다르므로 섞어 읽지 말 것.**

### A. 세션/코호트 기준 (PostHog 인사이트, 대시보드에 저장)

여기서 "rage click"은 *해당 기능을 쓴 세션 안에서 발생한* 연타를 뜻한다.
버튼 자체를 연타했다는 뜻이 아니다 — B와 숫자가 다른 이유.

**패턴 1 — 상영 일정 필터 마찰**

| 지표 | 30일 합계 | 일평균 |
|---|---|---|
| Rage click 발생 유저 | 391명 | 13명/일 |
| 날짜 필터 사용 유저 | 1,017명 | 33.9명/일 |

| 구간 | Rage click 유저/일 | 필터 사용 유저/일 |
|---|---|---|
| 7/13~7/19 (초반) | 20명 | 68.1명 |
| 8/5~8/11 (최근 7일) | 10.9명 | 23명 |

- 절대 수치는 줄었지만 **모수(필터 사용자)가 더 많이 줄어** 비율로는 개선 없음 또는 악화.
- 7/22 피크(34명) 이후 감소 추세, 8/11 다시 14명으로 반등.

**패턴 2 — 외부 예매 handoff 이탈**

| 지표 | 30일 합계 | 일평균 |
|---|---|---|
| 예매 버튼 클릭 | 209건 | 7건/일 |
| Rage click | 467건 | 15.6건/일 |

| 구간 | 예매 클릭/일 | Rage click/일 |
|---|---|---|
| 7/13~7/19 (초반) | 8건 | 24.4건 |
| 8/5~8/11 (최근 7일) | 11.4건 | 13건 |

- 예매 클릭 +42%, rage click −46%. 8/8은 예매 클릭 20건(30일 최고)인데 rage click은 8건.
- 해석 주의: 연타로 표출되지 않고 **조용히 이탈**하는 쪽으로 옮겨갔을 가능성.
  그래서 rage click 감소만으로 개선을 주장하면 안 되고, 예매 클릭/방문자 비율을 같이 봐야 한다.

### B. 요소 기준 (elements_chain 분해, 2026-08-12 측정)

같은 30일 창의 `$rageclick` 512건 / 377명을 **실제로 눌린 요소**로 쪼갠 값. PR #272는 이쪽을 고쳤다.

| 대상 | rageclick | 유저 |
|---|---|---|
| 온보딩 네비(다음/이전/CTA) | 298 (58%) | 293 |
| 가로 레일 넘김 화살표 `/films` | 55 | ~23 |
| 지도 FAB · 줌 · 포스터 오버레이 | ~40 | ~25 |
| DateBar "다음 주" | 4 | 3 |
| 지역 칩 "검색 지역" | 7 | 7 |

- `/` + `/films` 방문자 3,151명 중 **293명(9.3%)** 이 온보딩에서 연타.
- 온보딩 연타 브라우저: **Mobile Safari/iOS 201건(199명)**, Chrome/Android 54건 → iOS 스크롤 이슈.
- `dead click`(커스텀 계측)은 60일간 21건뿐 — disabled만 보느라 실제 무반응을 못 잡았다.
  PR #272에서 `no-op click`을 추가한 이유.
- 같은 상영 `booking clicked` 2회 이상: 225쌍 중 23쌍(**10%**).
- **A의 "패턴 1 = 필터 마찰"은 요소 기준으로 보면 상위 원인이 아니다**(DateBar 4건 + 지역 7건).
  A의 391명은 "필터를 쓴 세션에서 아무 데나 연타한 사람" 수에 가깝다.

### 개선 후 비교할 KPI

| 지표 | 기준선 | 방향 |
|---|---|---|
| 날짜 필터 rage click 유저/일 (A) | 10.9명 | ↓ |
| 예매 클릭/일 (A) | 11.4건 | ↑ |
| 예매 관련 rage click/일 (A) | 13건 | ↓ |
| 온보딩 요소 rage click 유저 (B) | 293명/30일 | ↓ |
| 온보딩 rage click 유저 / `/`+`/films` 방문자 (B) | 9.3% | ↓ |
| 레일 화살표 rage click (B) | 55건/30일 | ↓ |
| 같은 상영 중복 `booking clicked` 비율 | 10% | ↓ |
| `no-op click` (신규) | — (계측 없음) | 기준선 수집 |
| `booking returned` away_seconds 분포 (신규) | — (계측 없음) | 기준선 수집 |

측정 주의:
- 표본이 작다(일 10~30명 수준). **7일 이동평균**으로 보고, 하루 단위 등락으로 결론 내지 말 것.
- 모수 변화가 크므로 절대 건수 대신 **비율(연타 유저 / 해당 기능 사용 유저)** 로 판단한다.
- 배포일을 PostHog annotation으로 남기고, 최소 2주 뒤 비교한다.
