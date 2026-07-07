# TASK-11 — 성능·유지보수 구조 개선 (코드리뷰 반영)

코드리뷰에서 지적된 구조적 비효율 3건. **각 항목을 독립 브랜치·PR로 진행**한다. 난이도·리스크가 크게 다르므로 순서는 3 → 2 → 1 (쉽고 안전한 것부터) 권장.

## 공통 규칙

- `AGENTS.md` 준수. Next.js webpack 모드(`npm run build`가 `--webpack` 포함).
- **행동 변화 최소화**가 원칙. 성능/구조 개선이지 기능 변경이 아니다. 눈에 보이는 동작이 바뀌면 PR 설명에 명시.
- 각 PR 완료 전 `npx tsc --noEmit` + `npx vitest run` + `npm run build` 통과.
- 거대 컴포넌트를 다루므로 **한 번에 다 쪼개지 말 것**. 작은 단위로 나눠 여러 PR로. 각 PR은 리뷰 가능한 크기(대략 ±400줄 이내)로.

---

## 항목 3 — 클라이언트 에러 기반 폴백 쿼리 제거 (가장 쉬움, 먼저)

- **브랜치**: `refactor/remove-nation-fallback-query`
- **대상**: [src/lib/supabase/queries.ts](../src/lib/supabase/queries.ts) — `isMissingColumnError` + 이를 쓰는 4곳(현재 line 74·428·516·621 부근, grep으로 재확인)

### 문제
`movies` 테이블 조회 시 `nation` 컬럼 유무를 몰라, 1차 쿼리가 실패하면 에러 메시지를 가로채(`isMissingColumnError`) `nation`을 뺀 2차 쿼리를 다시 던진다. 컬럼이 없는 환경에선 **매 조회가 2회 왕복(round-trip)** → 체감 응답 지연.

### 개선
1. **먼저 확인**: 프로덕션·로컬 Supabase `movies` 스키마에 `nation` 컬럼이 실제로 있는지 조사 (`.env.local`로 읽기 전용 조회, 또는 `docs/DB.md`/마이그레이션 확인). 지침서 작성 시점 기준 프로덕션엔 이미 있을 가능성이 높다 — 있으면 폴백은 순수 레거시 방어 코드.
2. `nation` 컬럼이 모든 대상 환경에 존재함을 확인하면:
   - 4곳의 `primary.error && isMissingColumnError(...) ? 2차쿼리 : primary` 분기를 **단일 쿼리**로 교체.
   - `isMissingColumnError` 헬퍼가 다른 데서도 쓰이는지 grep — 안 쓰이면 제거.
3. 컬럼이 아직 없는 환경이 있다면(예: 특정 개발 DB): 폴백 제거 대신 **마이그레이션을 먼저 적용**해 스키마를 동기화하고, 그 다음 폴백 제거. 이 경우 마이그레이션 파일 추가가 이 태스크 범위.

### 주의
- `useMovies` 외 3곳(각 line의 쿼리 목적이 다름)도 같은 패턴 — 4곳 모두 처리하되 각 쿼리의 select 컬럼·매핑이 다를 수 있으니 개별 확인.
- 폴백 제거로 **컬럼 없는 환경에서 전체 쿼리가 깨지지 않는지** 반드시 확인. 스키마 동기화가 전제.

### 완료 기준
- `movies` 조회가 단일 쿼리로 동작, 2회 왕복 제거.
- 스키마 동기화 상태(마이그레이션/문서) 명시.

---

## 항목 2 — 무제한 마커 캐시에 LRU 도입 (중간)

- **브랜치**: `refactor/marker-icon-lru-cache`
- **대상**: [src/components/map/MapView.tsx](../src/components/map/MapView.tsx) — `_pinIconCache`(line 121 부근), `_gvMarkerIconCache`(line 226 부근), `makePinIcon`/`makeGvMarkerIcon`

### 문제
`renderToStaticMarkup` 오버헤드를 줄이려 `Map`에 DivIcon을 캐시하는데, **TTL·크기 제한이 없다**. 캐시 키가 (줌 · 필터 · 오프셋 직렬화)라 사용자가 오래 드래그·필터 조작할수록 엔트리가 무한히 쌓임 → 메모리 누수.

### 개선
1. `src/lib/` 아래에 **작은 LRU 캐시 유틸**을 순수 함수/클래스로 추가 (예: `src/lib/lruCache.ts`). 의존성 추가 금지 — `Map`의 삽입 순서 특성을 이용한 간단 구현으로 충분:
   - `get(key)`: 히트 시 삭제 후 재삽입(최근 사용으로 이동).
   - `set(key, val)`: 삽입, `size > max`면 `map.keys().next().value`(가장 오래된) 삭제.
   - 순수 로직이라 **vitest 테스트 필수** (용량 초과 시 오래된 것 축출, 히트 시 순서 갱신).
2. `_pinIconCache`·`_gvMarkerIconCache`를 이 LRU로 교체. **최대 크기**는 실제 사용 패턴 기준으로 정한다 — 한 화면의 마커 수 × 줌/필터 조합 여유를 감안해 예: 500~1000. 근거를 PR에 적을 것.
3. `.get`/`.set` 호출부 시그니처가 `Map`과 동일하면 교체 최소화.

### 주의
- 두 캐시는 모듈 레벨 전역(`const _pinIconCache = new Map(...)`)이라 컴포넌트 언마운트와 무관하게 산다. LRU 크기 제한이 핵심이며, "지도 벗어날 때 초기화"는 (tabs) persistent 마운트 구조상 트리거가 애매하니 **크기 제한 방식**을 우선.
- 캐시 히트율이 급락하면 `renderToStaticMarkup`이 다시 자주 불려 성능 저하 — max를 너무 작게 잡지 말 것. before/after로 캐시 히트가 유지되는지 감으로 확인.
- 동작(마커 모양) 변화는 0이어야 한다.

### 완료 기준
- LRU 유틸 + 테스트 존재, 두 캐시 교체.
- max 크기 근거 문서화, 마커 렌더 동작 무변경.

---

## 항목 1 — MapView·TheaterSheet 거대 컴포넌트 분리 (가장 크고 위험, 마지막)

- **브랜치**: 여러 개로 — `refactor/split-mapview-<영역>`, `refactor/split-theatersheet-<영역>`
- **대상**: [MapView.tsx](../src/components/map/MapView.tsx)(3,500+줄), [TheaterSheet.tsx](../src/components/domain/TheaterSheet.tsx)(2,100+줄)

### 문제
검색어·줌·최근검색·패널 스택 등 **빈번히 바뀌는 로컬 상태가 단일 거대 컴포넌트에 집중**돼, 사소한 상태 변경(검색어 1글자) 하나에 수천 줄 컴포넌트 전체가 리렌더/diff를 탄다.

### 개선 원칙
- **점진적으로**. 한 PR에 파일 하나를 통째로 재작성하지 말 것. "이미 함수/JSX 블록으로 나뉜 경계"를 그대로 파일·컴포넌트 경계로 추출하는 것부터.
- 상태는 **가장 좁은 범위로 내린다**: 검색어 같은 고빈도 상태는 그 UI(SearchPanel)만 리렌더하도록 해당 컴포넌트로 지역화하거나, 여러 곳이 공유하면 zustand store(기존 `useUIStore` 패턴)로. Context는 값 바뀔 때 구독자 전체 리렌더라 고빈도 상태엔 부적합 — zustand selector 우선.
- 추출한 하위 컴포넌트는 `React.memo` + 안정적 props(콜백은 `useCallback`)로 리렌더 전파를 끊는다.

### MapView 분리 후보 (독립 PR 단위)
1. **통합 검색 패널** — 이미 `SearchPanel.tsx`로 크롬은 분리됨([#146]). 남은 검색 상태 머신(searchQuery·결과 렌더러)을 SearchPanel로 마저 내려 MapView에서 `searchQuery` 리렌더가 지도에 안 퍼지게.
2. **FilterBar 연동부** — 이미 별도 컴포넌트. MapView의 `filters` 상태를 zustand로 올릴지 검토(단, 지도 카메라·마커가 filters에 강결합이라 신중히).
3. **데스크톱 우측/좌측 디테일 패널 스택** — `panelStack` 상태와 렌더를 별도 컴포넌트로.
4. **마커 레이어** — 마커 렌더 로직을 하위 컴포넌트로 분리해 지도 외 상태 변경 시 마커가 재계산되지 않게 (`useMemo`/`memo` 경계 명확히).

### TheaterSheet 분리 후보
1. **시트 레이아웃/드래그 애니메이션** (드래그 훅은 이미 `refactor/theater-sheet-drag-hooks`에서 일부 분리됨 — 히스토리 확인) 과
2. **날짜 탭(DateBar)** 과
3. **극장별 스케줄 리스트 콘텐츠 영역**
을 완전히 분리해, 날짜 탭 전환·회차 선택이 시트 전체를 리렌더하지 않게.

### 주의 (가장 중요)
- 이 항목은 **회귀 위험이 가장 크다**. 각 추출 PR마다:
  - 추출 전후 동작을 수동으로 대조 (지도 인터랙션, 검색, 필터, 시트 드래그·날짜전환·회차선택).
  - 가능하면 추출 대상 순수 로직에 테스트를 먼저 붙이고 이동.
- **상태 끌어올리기(zustand)와 컴포넌트 추출을 한 PR에 섞지 말 것.** 먼저 순수 추출(동작 동일) → 별도 PR에서 상태 지역화. 뒤섞으면 회귀 원인 추적이 지옥.
- 진행 중인 다른 UI 작업과 MapView/TheaterSheet가 겹치면 **그 작업 머지 후** 착수 (리베이스 충돌 최소화).
- 성능 개선 효과는 React DevTools Profiler로 before/after 리렌더 횟수를 재서 PR에 첨부하면 가장 설득력 있음.

### 완료 기준(항목 1 전체)
- 검색어 입력 시 지도/마커가 리렌더되지 않음(Profiler로 확인).
- 날짜 탭 전환 시 시트 전체가 아니라 콘텐츠 영역만 리렌더.
- 각 추출 PR에서 기능 회귀 없음.

---

## 실행 순서 요약
```
1) refactor/remove-nation-fallback-query   ← 쉬움·안전, 즉효
2) refactor/marker-icon-lru-cache          ← 중간, 메모리 누수 차단
3) refactor/split-*  (여러 PR, 점진적)      ← 크고 위험, 마지막·신중히
```
