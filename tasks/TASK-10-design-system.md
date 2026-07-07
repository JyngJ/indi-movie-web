# TASK-10 — 디자인 시스템 토큰 체계 완성 + 적용률 감사 (Astryx 모델)

- **종류**: refactor + docs
- **브랜치**: 단계별 분리 — `refactor/design-tokens`(1단계), `refactor/token-adoption-<영역>`(2단계 여러 개), `refactor/primitives`(3단계)
- **난이도**: 중상 (단계당 1~3일, 전체 1~2주)
- **의존성**: 없음. 단, 큰 UI 작업(온보딩, 검색 패널, 상세 통합)과 같은 파일을 만질 수 있어 **머지 순서 조율 필요**

## 배경 — 왜 하는가

Meta의 Astryx 디자인 시스템(https://astryx.atmeta.com/docs/getting-started)처럼 **모든 디자인 토큰(색·간격·라디우스·타이포그래피)을 CSS 커스텀 프로퍼티로 일원화**하고, 코드가 그 토큰을 실제로 쓰는지 감사하는 체계를 만든다. **컬러 시스템은 제외** — 현재 `--color-*` 변수 체계를 그대로 유지한다.

현황 진단 (2026-07-06):
- 색: `var(--color-*)` 체계 존재, 적용률 높음 ✅
- 간격·라디우스·폰트 크기: **전부 인라인 하드코딩** — `fontSize: 12`, `borderRadius: 10`, `padding: '12px 14px'` 등이 컴포넌트마다 산재. 같은 의미의 값이 파일마다 드리프트 (카드 라디우스 10 vs 12, 캡션 폰트 10 vs 11 vs 12)
- `src/components/primitives/` 존재하나 활용 저조 — 칩/카드/섹션헤더가 페이지마다 재발명
- 디자인 문서: `docs/DESIGN.md` 존재 (먼저 읽고 이 작업과 정합시킬 것)

**Astryx에서 가져오는 것**: 토큰 계층 구조, "테마 = 토큰 전체 제공" 관점, 컴포넌트 카테고리 정리, 문서화 습관.
**가져오지 않는 것**: Astryx npm 패키지·StyleX·React 컴포넌트 자체 (기술 스택 교체 아님), 컬러 팔레트.

**실제 확인 결과(2026-07-06, 구현 착수 시점)**: 위 "간격·라디우스·폰트 크기: 전부 인라인 하드코딩" 진단은 틀림 —
`src/styles/tokens.css`에 `--text-*`(타이포)/`--spacing-*`(간격)/`--radius-*`(라디우스) 토큰이 이미 상당히
완성돼 있고 `docs/DESIGN.md`에도 문서화돼 있었음(이 문서 작성 시점엔 몰랐던 것으로 보임). 1단계는 아래 "가야
할 방향" 중 **"기존 tokens.css 채택"**으로 진행 — `--font-size-*`/`--space-*` 같은 새 이름을 만들지 않고
기존 체계를 확장. grep 감사 결과 실제 갭은 `fontSize: 15`(33곳), `gap: 6`(41곳), `gap: 10`(31곳) 세 개뿐이라
`--text-subtitle`/`--spacing-1-5`/`--spacing-2-5`로 채움. 나머지 드리프트(라디우스 10 vs 12 등)는 시각
변화가 생기므로 stage 2로 미룸 — `docs/DESIGN.md`의 "TASK-10 하드코딩 감사" 섹션에 수렴 대상 목록화.

## 1단계 — 토큰 정의 (`refactor/design-tokens`)

1. **현황 스캔 먼저**: 아래 grep으로 실제 사용 분포를 수집해 토큰 스케일을 "현실에서 역산"한다. 이상적 스케일을 새로 발명해서 전면 리디자인하는 것 금지 — 기존 값들을 몇 개의 대표값으로 수렴시키는 것이 목표.
   ```bash
   grep -rEoh "fontSize: [0-9]+" src/components src/app --include="*.tsx" | sort | uniq -c | sort -rn
   grep -rEoh "borderRadius: [0-9]+" src --include="*.tsx" | sort | uniq -c | sort -rn
   grep -rEoh "gap: [0-9]+|padding: '[^']+'" src --include="*.tsx" | sort | uniq -c | sort -rn
   ```
2. ~~`src/app/globals.css`에 `--font-size-*`/`--space-*` 신규 네이밍으로 토큰 추가~~ →
   **정정**: `src/styles/tokens.css`에 이미 `--text-*`/`--spacing-*`/`--radius-*`가 존재하므로 그걸 확장한다.
   실사용 분포에서 진짜 누락된 값만 채움:
   - 타이포: `--text-*` 스케일에 누락 구간 추가 (예: `--text-subtitle`)
   - 간격: `--spacing-*` 스케일에 누락 구간 추가 (4px 배수가 원칙이지만 실사용이 많으면 반스텝도 허용, 예: `--spacing-1-5`)
   - 라디우스: 신규 토큰 추가보다 기존 값으로의 수렴 대상 목록화(칩 99→full, 카드 10↔12 등) — 시각 변화라 stage 2로
   - 그림자·z-index는 이미 `--shadow-*`/`--transition-*`로 존재, 반복 패턴 추가 필요시만 확장
3. `docs/DESIGN.md`에 토큰 표 + 사용 규칙 갱신: "새 코드는 px 리터럴 대신 토큰. 토큰에 없는 값이 필요하면 토큰을 추가하고 문서에 기록."
4. 이 단계에서는 **globals.css와 문서만 변경** — 컴포넌트 치환 없음. 리뷰 부담 최소화.

## 2단계 — 적용 감사 + 치환 (`refactor/token-adoption-*` 여러 PR)

원칙: **시각적 변화 0이 기본.** 값이 토큰 대표값과 다른 곳(드리프트)은 치환하면서 픽셀이 바뀌는데, 그 목록을 PR 설명에 명시해 리뷰에서 확인받는다 (예: "borderRadius 10→12 수렴: CurationSectionRow compact 카드").

- 영역별 PR 분할 (한 PR에 전체 금지):
  1. `src/components/domain/` 큐레이션 계열 (CurationSectionRow, CurationSheet, …)
  2. 시트/패널 계열 (TheaterSheet, MovieSheet, DesktopDetailPanel, …)
  3. `src/app/` 페이지들 (films, movie/[id], theater/[id], …)
  4. 지도 계열 (MapPin, GvPin, MapView 내 스타일)
- 치환은 기계적으로: `fontSize: 12` → `fontSize: 'var(--font-size-body)'` 식. 인라인 스타일 체계 자체는 유지 (CSS 모듈 전환 등 스타일링 방식 변경은 이 태스크 범위 밖).
- **감사 스크립트 추가**: `src/scripts/audit-design-tokens.ts` — 하드코딩된 fontSize/borderRadius/px 패딩을 스캔해 파일별 카운트 출력. 완료 기준 측정과 이후 회귀 감시에 사용. package.json에 `audit:tokens` 스크립트 등록.

## 3단계 — 프리미티브 정리 (`refactor/primitives`)

1. 실제 반복이 확인된 것만 컴포넌트화 (예방적 추상화 금지 — AGENTS.md 원칙):
   - 장르 칩 (CurationSectionRow, films 그리드 등 3곳 이상 반복 확인됨)
   - 섹션 헤더 (emoji+타이틀+설명 패턴)
   - 카드 컨테이너 (border+radius+surface 패턴)
2. `src/components/primitives/`에 배치, 기존 것과 컨벤션 통일.
3. 교체는 영역별 PR로 (2단계와 동일 원칙).

## 주의사항

- **행동·시각 변화가 있는 치환은 반드시 PR 설명에 목록화.** "리팩터링인데 화면이 바뀌었다"가 최악.
- 진행 중인 큰 UI 작업(온보딩 구현, 검색 패널, 상세 라우트 통합)과 파일이 겹치면 **그 작업이 머지된 뒤에** 해당 영역 치환 PR을 진행 (리베이스 지옥 방지).
- admin 화면(`src/app/admin/`)은 후순위 — 사용자 노출 영역부터.
- 다크모드: 토큰은 색이 아니므로 다크모드 분기 불필요하지만, 치환 과정에서 기존 다크모드 동작 깨지지 않는지 확인.
- 각 PR: `npx vitest run` + `npm run build` + (UI 변경 시) before/after 스크린샷.

## 완료 기준

- [ ] globals.css에 타이포/간격/라디우스 토큰 정의 + DESIGN.md 문서화
- [ ] `npm run audit:tokens` 스크립트 존재, 실행 시 하드코딩 잔여 카운트 출력
- [ ] 사용자 노출 컴포넌트(domain/, app/ 주요 페이지)의 하드코딩 카운트가 감사 스크립트 기준 90% 이상 감소
- [ ] 드리프트 수렴 목록이 각 PR에 문서화됨
- [ ] 프리미티브 3종(칩/섹션헤더/카드) 이상 정리, 반복 구현 제거
- [ ] 시각 리그레션 없음 (드리프트 수렴으로 의도된 변화 제외)
