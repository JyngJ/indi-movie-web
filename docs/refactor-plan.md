# 리팩터링 PRD — 대형 파일 구조 개선

## 0. 최우선 원칙 (모든 작업 공통, 절대 위반 금지)

**기능/UI/동작상 차이가 1px, 1ms, 1바이트도 생기면 안 됨.**

- 순수 구조 리팩터(파일 분리, 함수 추출, 훅 추출, 어댑터 도입)만 한다. 로직 변경, 최적화, 버그 수정, 스타일 개선 동시에 하지 않는다.
- "이왕 보는 김에" 식 개선 금지. 발견한 버그/개선점은 별도 이슈로만 기록.
- 작업 시작 전 반드시 새 브랜치 생성 (`refactor/<파일명-요약>`), `main`에서 분기.
- 작업 완료 후 `next dev --webpack` / `next build --webpack`으로 빌드 확인 (Turbopack 금지 — AGENTS.md 참조).
- 가능하면 작업 전후 스크린샷/동작 비교 (지도, 시트, 필터바, 어드민 콘솔 각 화면).
- 커밋은 작은 단위로 — "extract X to hook", "split Y into components" 식. 한 커밋에 여러 파일 동시 변경 최소화.
- diff에 로직 변경처럼 보이는 줄(조건문 순서 변경, 삼항 변형, early return 추가 등)이 있으면 **반드시** 변경 전후 동작이 동일함을 별도로 설명.
- 각 파일 작업 끝나면 PR 올리고 사용자 승인 받을 것. **main에 직접 머지 금지.**

---

## 1. 작업 순서 (의존성 낮은 것 → 높은 것)

### Phase 1 — 데이터/유틸 분리 (리스크 최저, 워밍업)
1. ✅ **완료** (PR #94) **[sources.ts](src/lib/admin/sources.ts)** (735줄)
   - 소스 카탈로그 배열을 JSON/YAML로 분리 + 로더 함수 작성
   - SAMPLE_CRAWL_HTML/CSV는 `__fixtures__` 또는 test 디렉토리로 이동
   - export하는 타입/함수 시그니처는 100% 동일하게 유지

2. 🟡 **부분 완료** (PR #95) **[crawler.ts](src/lib/admin/crawler.ts)** (1823줄)
   - ✅ 헬퍼 함수 23개 → `src/lib/admin/crawler/utils.ts`로 이동
   - ✅ Playwright/GPT-4o 호출부 → `crawler/browser.ts`, `crawler/ocr.ts`로 분리
   - ⬜ 날짜 파싱 4벌 → 공통 유틸로 통합 (단, 사이트별 미묘한 포맷 차이 주의 — 통합 전 각 파서의 입출력 예시 테스트케이스 작성 후 진행) — 미착수, 리스크 큼
   - ⬜ 파서별 `buildCandidate()` 호출 패턴 통합 — 미착수, 리스크 큼 (별도 검토)

### Phase 2 — store 계층
3. 🟡 **부분 완료** (PR #99, #100, 머지 대기) **[store.ts](src/lib/admin/store.ts)** (1706 → 1374줄)
   - ✅ row↔domain 컨버터 13개 + Row 인터페이스 6개 → `src/lib/admin/store/converters.ts`로 분리 (그대로 이동, 로직 변경 없음) — PR #99
     - `sourceFromRow/ToRow`, `runFromRow/ToRow`, `candidateFromRow/ToRow`, `theaterFromRow/ToRow`, `movieFromRow`, `serviceShowtimeFromRow`, `showtimeInputToRow`, `normalizeTime`, `normalizeInstagramUrl`
     - `CrawlSourceRow`, `CrawlRunRow`, `CandidateRow`, `TheaterRow`, `MovieRow`, `ShowtimeRow`
   - ✅ `autoMatchShowtimeCandidates()` — 초기 4-쿼리 DB fetch를 `fetchAutoMatchInputs()`로 분리, 매칭 루프/알고리즘은 그대로 — PR #100
   - ⬜ `resolveTheater`/`resolveMovie*`/`pickExactExternalMovie` 등 매칭 헬퍼(~390줄) 별도 파일 분리 — 진행 안 함 (store.ts 내부 전용 + `importAdminExternalMovie`와 순환참조 발생, 이점 없음)
   - 트랜잭션/에러처리 개선은 이번 리팩터 범위 아님 — 별도 이슈로만 기록

### Phase 3 — 컴포넌트 분리 (UI 영향 큼, 신중)
4. ✅ **완료** (PR #96, 머지 대기) **[DesktopDetailPanel.tsx](src/components/domain/DesktopDetailPanel.tsx)** (726줄) — 가장 작고 연습용
   - MoviePanel / DirectorPanel을 각각 별도 파일로 추출
   - SVG 아이콘 10개 → `icons.tsx`로 이동
   - props/콜백 시그니처 동일 유지

5. ✅ **완료** (PR #97, 머지 대기) **[FilterBar.tsx](src/components/domain/FilterBar.tsx)** (1119줄)
   - DateDropdown, MultiSelectDropdown, RegionDropdown, CalendarPicker → 각각 별도 파일
   - useState 12개 → useReducer 통합은 진행 안 함 (리스크 — 파일 분리만 진행)
   - sessionStorage/window.innerWidth/document.addEventListener → 어댑터 교체도 진행 안 함 (리스크 — 그대로 유지)

6. 🟡 **부분 완료** (PR #98, 머지 대기) **[AdminShowtimeConsole.tsx](src/app/admin/AdminShowtimeConsole.tsx)** (2197 → 1875줄)
   - ✅ 부모 상태와 결합 없는 leaf 컴포넌트/타입/유틸 → `adminShowtimeConsole/`로 분리
     - `types.ts`: AdminPayload, OcrShowtime, OcrResult, SourceFormState, emptyPayload, inputKinds, emptySourceForm
     - `utils.ts`: groupByCity, normalizeSearchText, upsertOption, splitListInput
     - `badges.tsx`: Metric, Confidence, StatusBadge
     - `CrawlLogsTab.tsx`, `DbStatusTab.tsx`: 로그 / DB현황 탭 컴포넌트
   - ⬜ 4개 탭(crawl/status/manage/logs) 전체 분리 — 진행 안 함 (리스크 큼: ~30개 핸들러 + ~25개 state와 강결합, prop-drilling 누락/오타 위험)
   - ⬜ 폼 상태(영화/극장/소스 폼) 탭 컴포넌트 내부 이동 — 진행 안 함 (위와 동일 이유)
   - ⬜ `window.confirm` → 어댑터 교체 — 진행 안 함 (리스크, 그대로 유지)

### Phase 4 — 가장 위험, 마지막
7. **[TheaterSheet.tsx](src/components/domain/TheaterSheet.tsx)** (2329줄)
   - drag/momentum scroll 로직 260줄 → `useDragSheet`/`useMomentumScroll` 훅으로 추출 (동작 동일성 가장 검증 어려움 — 충분한 수동 테스트 필요)
   - mobile/desktop 모드 분기 → 가능하면 `TheaterSheetMobile`/`TheaterSheetDesktop` 또는 공통 hook + 두 개 thin wrapper로 분리
   - navigator.share/clipboard → 어댑터로 위임

8. **[MapView.tsx](src/components/map/MapView.tsx)** (3496줄) — 최후, 가장 크고 위험
   - 클러스터링 로직(`computeClustersByZoom` 등) → `src/lib/map/clustering.ts`
   - 포스터 충돌계산(`overlap`, `dimsForCap`, `posterRect` 등) → `src/lib/map/posterLayout.ts`
   - window.open/navigator.share/localStorage → 어댑터 위임
   - 검색/필터/시트 관련 state는 마지막에, 가능하면 손대지 않거나 최소 범위만

---

## 2. 파일별 작업 시 체크리스트 (LLM 에이전트용)

각 파일 작업 시작 전 에이전트에게 아래를 명시:

1. "이 작업은 순수 구조 리팩터다. 로직/동작/스타일/출력값을 단 하나도 바꾸지 마라."
2. "함수/컴포넌트를 옮길 때 이름, 시그니처, export 방식을 그대로 유지해라. import 경로만 바뀐다."
3. "조건문, 삼항, early return의 순서를 바꾸지 마라. 같은 순서로 그대로 옮겨라."
4. "분리 후 `grep`으로 원본 함수/변수명이 다른 곳에서 참조되는지 확인하고 import 경로 전부 업데이트해라."
5. "작업 후 `npm run build` (webpack) 통과 확인. 타입 에러 0."
6. "변경 파일 목록과 각 파일에서 옮겨진 코드 블록의 출처(원래 line 번호)를 PR 설명에 적어라."
7. "자신 없는 부분(상태 통합, 어댑터 교체 등)은 진행하지 말고 별도로 보고해라."

---

## 3. 작업 단위 / PR 분리

- 1 파일 = 최소 1 PR (큰 파일은 2-3 PR로 쪼개도 됨, 단계별)
- PR 제목: `refactor(<도메인>): split <파일명> — <분리 내용>`
- PR 설명에 "동작 변경 없음" 명시 + 검증 방법 기재
- 사용자 승인 후 머지

---

## 4. 이번 리팩터 범위 아님 (별도 이슈로만 기록)

- 알고리즘/로직 개선 (예: 클러스터링 효율화, 매칭 정확도)
- 트랜잭션/에러처리 개선
- i18n, 가상화, 접근성 개선
- 데이터 페칭 패턴(useFetch 등) 도입 — 구조만 보고 실제 도입은 차후
