# HANDOFF — 디자인 2.0 리팩터 (feature/design-refactor)

> 세션 인수인계 문서. 새 세션은 이 파일 + `docs/DESIGN.md`(2.0 전면 개정본) + `AGENTS.md`부터 읽을 것.
> 마지막 갱신: 2026-08-05 (커밋 `1877a5b`)

## 0. 상태 요약

- 브랜치 **`feature/design-refactor`** — main 미머지, 사용자 명시 승인 전 머지 금지 (AGENTS.md).
- 진행: **TheaterSheet(시트) 2.0 완료** → **PC 레일·패널 프레임 완료** → **상영작(films) 탭 2.0 거의 완료** (마무리 폴리시 중).
- 검증 루프: `npx tsc --noEmit` → `npm run build` (반드시 --webpack, package 스크립트가 이미 처리) → `npm run audit:ui:check` → 브라우저 확인 → 커밋. **audit 개선 수치 나오면 `scripts/audit/baseline.json` 하향해서 같이 커밋.**
- dev 서버: `.claude/launch.json`의 `movie` 설정 (`npm run dev`, 포트 3000, 폰에서 100.120.113.87:3000).

## 1. 피그마 파이프라인 (필수 이해)

- 피그마 무료플랜이라 MCP 금지 수준(월 6회). 대신 **Scripter 파이프라인**:
  1. 수신 서버: `python3 ~/.claude/skills/figma-scripter-sync/dump-receiver.py` (포트 8765, 세션마다 켜줄 것)
  2. 사용자가 피그마 Scripter에서 `dump-state.js`(v3, 전 깊이) Run
  3. `~/.claude/skills/figma-scripter-sync/figma-dump/state.json` + 섹션 PNG 도착
- **스펙 이식은 덤프 수치로만. 덤프에 없으면 추정 금지, 물어볼 것** (추정으로 어긋난 전과 다수).
- 피그마 쓰기 = `movie/scripts/figma/*.js` Scripter 스크립트를 내가 짜고 사용자가 Run. 결과는 캔버스 텍스트 리포트로.
- Scripter 함정: `layoutSizing FILL은 appendChild 후에만` / `instance resize는 크롭 → rescale 사용` / `텍스트 오버라이드 전 loadFontAsync(t.fontName)` / HORIZONTAL 프레임의 primary축=가로.
- 파일: "Design System - work"(작업)·"Design System"(완성) 페이지. 섹션: TheaterSheet ASIS/TOBE, FilmsTab ASIS/TOBE(grayscale·Color), Hover 인벤토리, FilmsTab Loading 상태.

## 2. 2.0 확정 문법 (코드에 반영됨)

- 거터: 콘텐츠 좌우 **24 (`--gutter-sheet`)**, 섹션 리듬 모바일 32 / PC 48.
- KIMM(display)은 **h1 24 / h2 20 + 자간 5%만**. 소제목·UI 텍스트는 Pretendard 토큰. **`.display-h1`/`.display-h2` 클래스(globals.css) 사용 — 인라인 KIMM 스타일 금지** (2026-08-05 클래스화 완료).
- 검색바 radius = `--comp-search-radius` = **r12(control)** — pill 폐기 (2026-08-05). Tailwind에서 `text-[var(--text-*)]`는 색상으로 오해석돼 글자색이 깨짐 — 반드시 `text-[length:var(--text-*)]`.
- 캡션: 제목 14 bold(모바일)/16(PC), 보조 meta 12(모바일)/body 14(PC). 시의성 캡션 = **[시간(neutral-800·600·tnum) / 극장명(caption)] 두 줄**, 통째 클릭 → 극장 상세 딥링크(`?movie&date&time`) + 해당 카드 스크롤.
- 포스터: r2(`--radius-poster`), 시트 고정폭 128, hover 확대는 **포스터 위에서만**.
- hover 규칙: `.hover-raise`(종이 위 → raised) / `.hover-card`(raised 면 위(레일) → 흰 카드) / `.caption-link`(캡션·감독명). **role="button"엔 min-height 44 전역 규칙이 걸리니 텍스트류는 `minHeight:'auto'` 필수.**
- ‹› 넘김: 헤더 버튼 폐기 → **행 hover 시 좌우 오버레이** (흰 ScrollNavButton). 행 가장자리 페이드는 스크롤 가능한 방향만 **24px 고정**.
- 라우트 진행 바: `RouteProgressBar` + `navStart()` — 3px, 트랙 neutral-300·바 neutral-800, 모바일 뷰포트 상단/웹 본문 상단.
- PC: 본문 최대폭 컬럼 1048(시각 ≈1000) 중앙, 헤더 sticky, 슬롯 패널 왼쪽 r16 + shadow-sm + 레일색 언더레이.
- 프로필 이미지: 피그마 `2.0/shadow/inset` 필수, 코드 `--shadow-inset` 토큰 추가 예정(미구현).
- 아이콘: Lucide stroke 1.75. 길찾기=map-pinned, 특별전=Theater. 인스타 히어로: 이미지 좌 62% + 우측 검정 페이드 + 전면 스크림(0.78→0.35) + 텍스트 좌상단.

## 3. 미결 / 다음 할 일

1. **상영작 탭 마감**: 사용자 브라우저 확인 대기 중인 것 — 진행 바, 캡션 스크롤, 레일 hover(흰 카드), 감독 pill.
2. **수상 SVG**: `/public/awards/venice-lion.svg`·`cannes-palm.svg` — 사용자 반입 완료 여부 확인 (없으면 워터마크 조용히 숨김).
3. **피그마 쪽 밀린 것**: bump-pc-captions.js(PC 캡션 16/14) Run 여부 확인, hover 인벤토리 최신본 Run 여부, **sync-insta-hero-20260805.js Run** (아이브로 삭제·인스타 제목 문구).
3-1. **덤프 대조 잔여 (디자인 결정 필요)**: 포스터 규격(코드 120/210 vs 덤프 128)·캡션 장르칩+연도(코드에만 있음)·기념일 카드(코드 틴트 액센트 vs 덤프 흰 카드 2.0) — 코드 우위로 잠정 유지 중.
4. **다음 스크린 후보**: 영화 상세 → 검색 → 설정(타이포만 잡음, 간격·카드 미이식) → 온보딩(구팔레트) → GV 이벤트 카드(피그마 미설계, 사용자 숙제).
4-1. **재방문 피드백 설문 모달 2.0 재디자인** (`src/components/domain/survey/FeedbackSurvey.tsx` + `survey.module.css`) — "다시 찾아주셨네요 👋" 2단계 설문. 구 팔레트/구 radius 상태, 2.0 문법(토큰·display 타이포·Button 프리미티브)으로 다시 그릴 것 (2026-08-05 사용자 요청).
5. 설정 화면 전체 2.0 이식은 별도 챕터.
6. 메모리의 나머지 TODO: `movie-redesign-todos.md` (Lucide Moon 교체, --color-info 폐지 등).
7. **디자인 부채 전수 목록: `docs/DESIGN-DEBT.md`** (2026-08-07) — 화면별 미준수(색·폰트·프리미티브)와 컴포넌트 추출 후보(ShowtimeGroupCard·Avatar·BookingCta 등). 상세 작업 전 여기부터 볼 것.

## 3.9 미해결 — 상세 직진입 hydration 스톨 (2026-08-06 조사)

- 증상: /films/movie·theater/[id] **직진입(SSR) 시 간헐적으로 hydration이 영영 안 끝남** — effects·react-query 전부 미실행, 회차 무한 로딩. 클라 네비게이션은 정상. 프로드·로컬 모두 재현되나 **라우트/환경별로 뒤집히는 레이스** (dev: movie fail·theater pass ↔ prod build: 반대).
- 소거 완료(무죄): DetailShell, page Suspense, loading.tsx, ld+json, 클라이언트 JSX 전체(트리비얼도 스톨), useSearchParams, localStorage useState 초기화(→수정함), .next 캐시, 스트리밍 메타데이터 스크립트(→비활성화함).
- 판정 도구: `버튼.__reactFiber$*` 키 존재 여부(hydration 완료), `performance` API 호출 수, `curl | grep '<!--$?-->'`(스트림 균형).
- 현재 완화: force-dynamic(영화·극장 상세) + htmlLimitedBots(스트리밍 메타 차단) + mismatch 소스 제거. **완전 근절 미확인 — Next 16.2.4 selective hydration 레이스 의심.** Next 패치 추적할 것.

## 4. 함정·규칙 리마인드

- **Turbopack 금지** — 항상 --webpack (npm 스크립트 사용).
- audit 게이트: 새 숫자 리터럴 padding-left/fontSize는 바로 회귀 뜸 → **토큰/var 사용** (`--spacing-*`, `--gutter-*`, `--text-*`). tokens.css에 변수 추가할 땐 **한 줄에 변수 하나** (감사 파서가 둘째 변수 못 읽음).
- 이 체크아웃은 다른 세션과 공유됨 — 브랜치가 바뀌어 있을 수 있으니 시작 시 `git branch --show-current` 확인. 내 브랜치 아니면 손대지 말고 보고.
- GenUI Study pro 팀 피그마 사용 금지.
- 커밋 스타일: 한국어, `feat(design)/fix(design)/chore(figma)`, Co-Authored-By: Claude Fable 5.
- 주요 파일: `src/app/(tabs)/films/FilmsClient.tsx`(섹션 오케스트레이션), `CurationSectionRow`·`DirectorSpecialSection`·`InstagramRecsSection`·`AllMoviesGrid`·`PersonalizedSection`·`AnniversarySection`(섹션들), `SectionHeader`·`ScrollNavButton`(프리미티브), `TheaterSheet`·`DateBar`·`ShowtimeCell`(시트), `GlobalNav`(레일·탭바), `src/styles/tokens.css`, `src/app/globals.css`(hover·애니메이션 키프레임).
