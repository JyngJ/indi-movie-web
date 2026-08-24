<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Next.js Runtime Rules

- Do not use Turbopack for local development or build verification in this project.
- Use the npm scripts in `package.json`; they must keep `next dev --webpack` and `next build --webpack`.
- If you need to run Next.js directly, pass `--webpack` explicitly.
- Before changing Next.js CLI flags or bundler behavior, read `node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md` and update this section plus `README.md`.

## Design 2.0 Refactor (feature/design-refactor)

- 디자인 2.0 작업을 이어받는 세션은 반드시 `docs/HANDOFF-design-refactor.md`를 먼저 읽을 것 — 피그마 Scripter 파이프라인, 확정 문법, 미결 목록, 함정이 정리돼 있다.

## Branching Rules

- Do all non-trivial work on a dedicated branch. Do not implement directly on `main`.
- Always branch from the latest `main` unless the user explicitly asks to continue from another branch.
- Before creating a new work branch, switch to `main` and update it from the remote when network access is available.
- Use branch names that describe the work type and scope:
  - `feature/<short-description>` for product features and user-facing behavior.
  - `fix/<short-description>` for bug fixes.
  - `docs/<short-description>` for documentation-only changes.
  - `refactor/<short-description>` for internal restructuring without behavior changes.
  - `chore/<short-description>` for tooling, dependency, configuration, and maintenance work.
  - `experiment/<short-description>` for throwaway prototypes or research spikes.
- Keep branch names lowercase and hyphen-separated.
- Keep each branch focused on one coherent change. If a task grows into unrelated work, split it into a new branch from `main`.
- Do not merge into `main` without explicit user approval.
- **Never push to `main` directly.** "메인에 반영해줘/넣어두자" always means: push the feature branch and open a pull request for the user to review and merge. It is never permission for a local merge + push.
- A direct local merge is allowed only when the user explicitly says to skip the PR in that same message; summarize the diff and verification first.
- Before asking to merge, run the relevant checks for the branch and report any failures clearly.

## Architecture Rules

- Follow Clean Architecture principles for new features and meaningful refactors.
- Keep domain logic independent from UI, framework APIs, database clients, and external services.
- Use a clear dependency direction:
  - Domain types and pure business rules must not import from Next.js, React, Supabase, browser APIs, or route handlers.
  - Application/use-case logic may orchestrate domain logic and repositories, but should not know UI details.
  - Infrastructure code may depend on Supabase, HTTP clients, crawlers, storage, and other external systems.
  - UI components and Next.js route handlers should stay thin and delegate work to application/use-case modules.
- Prefer explicit interfaces for repositories, crawlers, and external service adapters when the code crosses a boundary.
- Do not put business rules directly inside React components, route handlers, or Supabase query code.
- Keep parsing, normalization, matching, approval, and persistence as separate concerns.
- Shared domain types should live in stable modules such as `src/types` or domain-specific `src/lib/<domain>` files, not inside UI components.
- When integrating a new external provider, isolate provider-specific details in an adapter module and return normalized application data.
- Add abstractions only when they protect a real boundary or remove meaningful duplication. Avoid ceremony for tiny, local UI behavior.
- Prefer pure functions for parsing, matching, validation, and normalization so they can be tested without a browser or database.

## UI Design Audit (회귀 방지)

- **디자인 토큰·스케일 규칙:**
  - spacing/radius는 4배수만 사용: `max(4, round(n/4)*4)`. gutter(좌우여백)는 `var(--gutter)`/`var(--gutter-md)`/`var(--gutter-sm)` = 16/12/8px (최상위 → 중첩 순).
  - radius는 역할 토큰 사용: `--radius-badge` / `--radius-poster` / `--radius-button` / `--radius-control` / `--radius-popover` / `--radius-sheet` / `--radius-pill`.
  - fontSize는 `--text-*` 타입 스케일 최근접 값으로. 하드코딩 px 금지.
  - 색은 시맨틱 토큰 사용: `--color-error` / `--color-success` / `--color-warning` / `--color-info` / `--color-gv`. 액센트 배경 위 흰색 텍스트는 `--color-on-accent`.
  - 포스터 오버레이 칩 정책 (2026-08-13 개정): fontSize `--text-meta`(12) / fontWeight 700, padding `8px 12px`, `--radius-badge`, lineHeight 1, offset 6px. 구 정책은 11px/600/`4px 8px`였는데 문서만 11px이고 코드는 `--text-badge`(10px)를 써서 셋이 어긋나 있었다 — 포스터 위에서 작아 안 읽히는 문제가 있어 한 단계 키우고 토큰으로 고정했다.
  - 포스터 좌하단은 **순위 전용**으로 비워 둔다. 랭킹 섹션이 스크림(높이 42% · 투명 → `rgba(15,12,9,0.78)`) + KIMM 숫자(포스터 높이의 31%)를 얹는다. 다른 칩을 좌하단에 두지 말 것.
- **하드코딩 검사:** `npm run audit:ui` — 결과는 `.audit-out/migration.csv` · `.audit-out/report-v3.md` (git 미추적).
- **회귀 게이트:** `npm run audit:ui:check` — `scripts/audit/baseline.json` 대비 카테고리별 카운트가 **증가하면 실패** (primitiveAdoptionPct는 감소하면 실패). CI(`.github/workflows/ui-audit.yml`)가 PR마다 실행한다.
- 수치를 개선했으면(카운트 감소/채택률 증가) `scripts/audit/baseline.json`을 낮춰서 **같이 커밋할 것**. 절대 baseline을 올려서 통과시키지 말 것 — 신규 하드코딩 금지, 토큰을 사용한다.
- **채택률이 떨어지는데 코드는 좋아진 경우가 있다.** 여러 호출부를 공용 컴포넌트로 묶으면 그 호출부들이 prim에도 raw에도 안 잡혀 분자·분모가 같이 줄고 비율이 내려간다(정규식 카운트라 합성을 못 본다). 이때는 **커밋 메시지에 이유를 적고 baseline을 조정**한다. 관계없는 파일에서 전환거리를 찾아 숫자를 메우지 말 것 — 지표에 코드를 맞추는 순간 지표가 거짓말이 된다.
- `PRIM` 목록은 `src/components/primitives/index.ts`에서 자동으로 뽑는다. 손으로 적지 말 것 — 예전에 손 목록이 12개에 멈춰 있는 동안 index는 26개로 늘어, 프리미티브 62개 사용이 통째로 안 세졌다.
- 감사 제외 파일 목록(스크립트에 하드코딩됨)은 그대로 유지: `onboarding/illustrations` / `GvPinSlots` / `GvPin` / `MapPin` / `GvMarkerIcon` / `opengraph-image` / `dev/components` / `src/app/admin` (style) / `subwayUtils`.

## UI Writing (화면 문구 규범)

원본은 `src/design-system/writing.ts` — 사람용 `/design-system/foundations/writing`, AI용 `/design-system/llms-writing.txt`가 거기서 렌더된다. 새 문구를 쓰거나 고칠 때 이 규칙을 따른다. 규칙을 바꾸려면 `writing.ts`를 고치고 여기 요약도 맞춘다.

- **어미:** 화면 문장은 해요체 하나(~해요 / ~없어요 / ~했어요). 합니다체는 약관·개인정보처리방침에만. FAQ 답변도 해요체.
- **마침표:** 한 줄 문구(제목·버튼·칩·토스트·빈 상태 한 줄)에는 찍지 않는다. 두 문장 이상 본문에만.
- **띄어쓰기:** 보조 용언은 띄운다 — "해 주세요", "해 보세요". "상영 중"도 띄운다(포스터 칩만 "상영중" 허용).
- **부호:** 나열은 가운뎃점(·), 부연은 줄표(—), 진행 중은 말줄임표 한 글자(…).
- **숫자:** 아라비아 숫자 + 단위 붙여쓰기 — 12편 · 3곳 · 95분 · 82/120석 · 1.2km. 시간은 24시간제 19:30. 날짜는 "8월 23일 (토)".
- **문장:** 능동형("복사했어요", 됐어요 X)·긍정형(할 수 있는 것을 말한다). 한자어 명사 나열("예매 진행") 대신 동사("예매하기"). "되어요"는 "돼요".
- **자리별 꼴:** 버튼 "~하기/~보기/~가기"(주 CTA "예매하러 가기", "확인"·"OK" 금지, 다이얼로그 보조 버튼은 "닫기"이지 "취소"가 아님) · 빈 상태 "~이 없어요" + 할 일 · 에러 "~하지 못했어요" + 다음 행동(상태 코드·예외 메시지 금지) · 로딩 "불러오는 중…"("데이터" 금지) · 토스트 "~했어요" 한 줄.
- **배지:** 막바지 배지는 사실 등급대로 — 오늘 "오늘이 마지막", confirmed "D-n 종영", likely "D-n 막바지 상영". 완화·격상 금지.
- **용어:** 극장·회차·상영 시간표·예매·잔여석·관심 영화·GV. 상영관·타임·스케줄·예약·북마크·"데이터"·"서버"는 화면에 쓰지 않는다.
- **톤 범위:** 문학적 한 줄은 큐레이션 부제에만. 버튼·에러·빈 상태엔 쓰지 않는다. 사과("죄송합니다")·감탄으로 시작하지 않는다.
- **회귀 게이트:** `npm run audit:writing:check` — 합니다체·붙여 쓴 보조 용언·"데이터" 로딩·마침표 세 개·되어요 카운트가 `scripts/audit/writing-baseline.json`(현재 전부 0) 대비 증가하면 실패. CI(ui-audit.yml)가 PR마다 실행한다. baseline을 올려서 통과시키지 말 것. SEO 메타·스키마·법적 문구처럼 문어체가 맞는 줄은 `// writing-audit-ignore` 주석으로 제외한다.

## Crawler Operations

The crawler runs on a Raspberry Pi (`ssh pi@100.76.84.97`, Tailscale). Full runbook: `docs/RUNBOOK-crawler.md`.

- **dtryx requests must stay at concurrency 1 per domain.** Bursty parallel requests (`Promise.all` over per-theater tasks, high `mapWithConcurrency`) get the RPi's public IP firewall-banned by dtryx. Do not raise concurrency without domain-level rate limiting.
- **If dtryx returns `fetch failed` / connect timeouts (IP ban):** on the RPi, run the IP-rotation script — `ssh pi@100.76.84.97 'sudo systemd-run --unit=mac-rotate --collect /bin/bash /home/pi/mac-rotate.sh'`. It swaps the `eth0` cloned MAC to get a new DHCP public IP, with a 150s self-healing rollback. Verify with `timeout 8 bash -c "cat < /dev/null > /dev/tcp/www.dtryx.com/443" && echo OPEN`. See the runbook for detection, verification, and MAC revert.
- Seat crawling is `npm run crawl:seats` (movie repo, throttled, all parsers). The old standalone `/home/pi/seat-checker` was retired 2026-07-09 — do not resurrect it.
