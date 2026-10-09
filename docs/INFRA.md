# 인프라 & 호스팅 전략

> **[스테일 주의 — 2026-08-14 검토]** 작성 시점(런칭 전) 계획 문서. 현재 확정 스택: Vercel(`indi-movie-web` 프로젝트, main 브랜치만 배포) + Supabase(프로덕션 운영 중) + Raspberry Pi 크롤러(`docs/RUNBOOK-crawler.md`). 도메인은 한글 도메인(영화볼지도.com)이라 코드에선 퓨니코드(`xn--hq1bv8o5phw2d7wt.com`) 사용. **TMDB는 상업적 이용 불가로 사용 금지 — 메타·포스터는 KMDB(+씨네21)만.** 아래 TBD 항목들은 모두 결론 났으므로 참고용으로만 읽을 것.

> 무료 시작 → 잘 되면 이전 가능한 구조 유지

---

## ⚠️ TBD (백엔드 팀과 협의 필수)

- [ ] **DB 선택**: Supabase vs 자체 서버?
- [ ] **백엔드 구현**: Node.js/Express vs Python/FastAPI vs Java/Spring?
- [ ] **외부 API 연동**: KMDB/TMDB 프론트에서 직접 vs 백엔드 정규화?

---

## 추천 조합 (MVP)

| 영역 | 서비스 | 무료 한도 | 이전 시 |
|------|--------|-----------|---------|
| **프론트 호스팅** | Vercel Hobby | 100GB 트래픽/월 | Vercel Pro 또는 자체 빌드 |
| **백엔드 + DB** | Supabase | 500MB DB, 50MB 파일, 월 50K MAU | Supabase Pro 또는 자체 Postgres |
| **도메인** | Namecheap / Gabia | 별도 비용 | 그대로 |

---

## Supabase 추천 이유

- PostgreSQL + Auth + Storage + Realtime 한 번에 해결 → 백엔드 개발 부담 ↓
- 클라이언트 SDK로 프론트에서 직접 호출 가능 (BFF 없이도 가능)
- Row Level Security로 권한 관리 용이
- Postgres 표준 → 자체 호스팅 이전 시 마이그레이션 쉬움

---

## 대안

| 서비스 | 용도 |
|--------|------|
| **Cloudflare Pages** | Vercel 대안. 트래픽 무제한, cold start 없음 |
| **Neon** | Serverless Postgres. 무료 0.5GB. Supabase의 DB만 필요할 때 |
| **Railway** | 월 $5 크레딧. 풀스택 자체 서버 띄울 때 |

---

## 외부 데이터 소스

- 영화 포스터, 메타 정보는 **외부 API 직접 참조** (자체 호스팅 X)
- 영화 DB:
  - **KMDB** — 한국영화데이터베이스, 한국 독립/예술영화 정보 풍부
  - **씨네21** — 보조 메타
  - **TMDB는 쓰지 않는다** — 상업적 이용 불가
- API 키는 환경 변수, 절대 클라이언트 코드에 노출 금지

### 지도 베이스맵

타일은 **CARTO 래스터**(`rastertiles/voyager`)를 쓴다. 타일 주소는
`src/lib/map/basemap.ts` 한 곳에만 두고, `MapView`와 온보딩 일러스트가 여기서 가져다 쓴다.

- **키 필수.** CARTO가 2026-08부터 키 없는 요청에 `API KEY REQUIRED` 워터마크를 구워
  내보낸다. HTTP 200이라 요청 실패로 잡히지 않으니, 지도가 이상하면 타일 PNG를 직접 열어볼 것.
- 무료 한도는 래스터·벡터 합산 **월 500만 타일 요청**. 실측으로 지도 1회 로드가 24~30장,
  온보딩 첫 방문이 9장이다.
- 무료 티어 조건으로 **CARTO·OpenStreetMap 출처를 화면에 노출해야 한다.** 지도는
  `attributionControl={false}`라 라이플릿 기본 표기가 뜨지 않으므로, 출처 표기 페이지
  (`SettingsAttributionPage`)가 그 역할을 한다 — 여기서 CARTO 줄을 지우지 말 것.

**국내 지도 3사(카카오·네이버·구글)는 대안이 아니다.** 셋 다 자체 SDK로만 지도를 띄우게 하고
타일 주소를 다른 라이브러리에 꽂는 걸 약관으로 금지한다(카카오 이용약관 11조 2항 5호). 쓰려면
Leaflet 기반 지도 전체를 다시 만들어야 한다.

**교체 후보** — CARTO가 래스터를 벡터로 대체하며 데이터 갱신 중단을 검토 중이라 언젠가 옮겨야 한다.

| 후보 | 성격 | 비용 |
|------|------|------|
| **브이월드**(국토부) | 래스터 WMTS. `…/wmts/1.0.0/{KEY}/Base/{z}/{y}/{x}.png` — Leaflet에 그대로 꽂힌다. 좌표 순서가 `{y}/{x}`로 뒤집혀 있는 것만 주의. `midnight` 스타일 있음 | 무료. `V_WORLD_KEY` 이미 보유(현재는 좌표 보정 스크립트용) |
| **OpenFreeMap** | 벡터. 키·가입·한도 없음. MapLibre 필요 | 무료, SLA 없음 |
| **Protomaps** | 벡터. `.pmtiles` 자체 호스팅 | 스토리지 비용만 |

---

## 환경 변수

`.env.local`은 gitignore 대상이다(`.gitignore`의 `.env*.local`). `.env.example`은 두지 않는다 —
목록의 원본은 이 문서다.

```bash
# 브라우저로 나가는 값 (NEXT_PUBLIC_ = 빌드 시점에 번들에 인라인된다)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=              # 미설정 시 www.xn--hq1bv8o5phw2d7wt.com
NEXT_PUBLIC_CARTO_API_KEY=         # 지도 타일 — 없으면 워터마크
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_POSTHOG_TOKEN=

# 서버 사이드 전용 — 클라이언트 코드에서 참조 금지
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
KMDB_SERVICE_KEY=                  # 영화 메타
KOBIS_API_KEY=                     # 영화진흥위원회
NAVER_CLIENT_ID=                   # 로컬 검색(극장 좌표)
NAVER_CLIENT_SECRET=
KAKAO_REST_API_KEY=                # 로그인
KAKAO_CLIENT_SECRET=
V_WORLD_KEY=                       # 국토부 브이월드 — 좌표·지하철역 보정 스크립트
OPENAI_API_KEY=                    # OCR
DISCORD_BOT_TOKEN=                 # 매칭 리뷰·리포트 알림
DISCORD_APPLICATION_ID=
DISCORD_PUBLIC_KEY=
DISCORD_REPORT_WEBHOOK_URL=
DISCORD_REPORT_CHANNEL_ID=
DISCORD_OCR_CHANNEL_ID=
DISCORD_MATCH_REVIEW_CHANNEL_ID=
POSTHOG_PERSONAL_API_KEY=          # 분석 조회 스크립트
POSTHOG_PROJECT_ID=
```

**규칙**

- `NEXT_PUBLIC_` 접두사 없는 변수는 절대 클라이언트 코드에서 참조 금지.
- `NEXT_PUBLIC_`은 빌드 때 번들에 박히므로 **비밀값에 붙이면 안 된다**. 반대로 Vercel에서
  `NEXT_PUBLIC_` 변수를 등록할 때는 Secret이 아니라 **Config 타입**을 쓴다 — 어차피 브라우저에
  공개되는 값이라 Secret으로 넣으면 팀에게만 가려지고 인터넷에는 그대로 노출된다.
- `NEXT_PUBLIC_` 값을 바꾸면 **재배포해야 반영된다**. env만 고치고 재배포를 안 하면 이전 빌드에
  박힌 옛 값이 계속 나간다.
- Vercel에 등록할 때 Production·Preview·Development 세 환경을 모두 채운다.
- `vercel env pull`은 실행하지 말 것 — 로컬 `.env.local`을 덮어써서 위 키들이 날아간다.

### TMDB는 쓰지 않는다

TMDB는 상업적 이용이 막혀 있어 이 프로젝트에서 쓸 수 없다. 영화 메타는 KMDB와 씨네21만
사용한다. (구 문서에 `TMDB_API_KEY`가 적혀 있었으나 실제로 참조하는 코드는 없다.)

---

## 배포 흐름

```
로컬 개발
   ↓ feature 브랜치 push
Vercel Preview Deploy 자동 생성 (PR 미리보기)
   ↓ PR 리뷰 후 develop 머지
Vercel Preview (develop 환경)
   ↓ QA 통과 후 main 머지
Vercel Production Deploy
   ↓
Supabase는 별도 마이그레이션 (백엔드 담당)
```

## Vercel 사용량 관리 (2026-09)

무료(Hobby) 한도 중 **Fluid Active CPU(월 4시간)** 가 먼저 찼다. 서버에서 코드가 실제로 CPU를 쓴 시간이다.
2026-09 기준 하루 9~10분(월 5시간 안팎)이었고, 9/13~17 상세 페이지 ISR 전환(#346·#359·#362) 뒤에도 줄지 않았다.
하루 CPU가 PostHog 페이지뷰와 같이 움직여서(9/23~26 동반 상승) 사람 방문에 딸린 서버 작업을 먼저 줄였다.

| 조치 | 위치 | 이유 |
|---|---|---|
| 회차·상영 API 캐시 2분 → 30분 | `src/lib/http/cachePolicy.ts` | 방문이 시간당 수십 회라 2분 캐시는 거의 적중하지 않았다. 데이터는 3시간(잔여석)·하루 3번(시간표)마다 바뀐다 |
| 상세 ISR·CDN 캐시 5분 → 1시간 | `movie/[id]` 등 4개 페이지 + `next.config.ts` `detail` | 같은 이유. 크롤 직후 반영은 아래 on-demand 갱신이 맡는다 |
| 크롤 후 캐시 갱신 | `/api/revalidate` ← `scripts/crawl-showtimes.ts` | 상영 데이터 태그를 `revalidateTag(tag, 'max')`로 무효화. RPi `.env.local`에 `CRON_SECRET` 필요 |
| 학습 전용 크롤러 차단 | `src/app/robots.ts` | 수천 쪽을 훑으며 식은 캐시를 다시 그리게 한다. 검색·답변용 봇은 유지 |
| OG 폰트·로고 한 번만 읽기 | `src/lib/og/cards.tsx` | 카드마다 900KB 폰트를 디스크에서 다시 읽고 있었다 |
| 문서만 바뀐 커밋은 배포 건너뛰기 | `vercel.json` `ignoreCommand` | `docs/`·`*.md`·테스트·`.github`만 바뀌면 빌드하지 않는다. `scripts/audit/*.json`은 CI 검사 페이지가 읽으므로 빼지 않는다 |

### 2026-10: 상세 ISR이 한 번도 걸려 있지 않았다

9월의 "ISR 전환 뒤에도 CPU가 안 줄었다"는 ISR이 실제로는 꺼져 있었기 때문이다. Next 16은 동적 경로에
`generateStaticParams`가 없으면 `revalidate`를 걸어도 요청마다 렌더한다. #362(9/17)부터 모든 운영 빌드 로그의
라우트 표에서 상세가 `ƒ (Dynamic)`이었고, 운영 응답은 `private, no-store` + `x-vercel-cache: MISS`였다.

| 조치 | 위치 | 이유 |
|---|---|---|
| 빈 `generateStaticParams` 추가 | `movie/[id]`·`movie/[id]/s/[showtimeId]`·`films/theater/[id]`·`films/theater/[id]/s/[showtimeId]`·`festival/[slug]` | 빌드 라우트 표가 `●`로 바뀐다. 첫 방문에 그려 캐시한다 |
| 극장 상세 첫 화면 데이터를 서버가 심음 | `src/lib/catalog/getTheaterShowtimesCached.ts` · `ssrSnapshot.ts` | 페이지 렌더 뒤 브라우저가 `/api/public/theater/[id]/movies`·`/showtimes`를 또 불러 방문 한 번에 함수 3번이었다. 1시간 안의 데이터면 다시 받지 않는다 |

- 한글이 들어가는 경로(`director/[name]`·`films/director/[name]`·`films/area/[region]`)는 동적으로 둔다. ISR이면
  캐시 태그 헤더에 raw 한글이 실려 500이 난다(#278).
- 확인: 배포 빌드 로그의 라우트 표(`vercel inspect <배포 URL> --logs`)에서 상세가 `●`인지, 같은 상세를 두 번 요청했을 때
  `x-vercel-cache`가 HIT/STALE로 바뀌는지.
- 배포 횟수와 하루 함수 호출 수는 9월 30일치에서 상관이 없었다(-0.13). 호출 수는 방문량을 따라 움직였다.

### 2026-10: CDN 요청 수(월 100만 건) 초과

CPU 다음으로 CDN Requests가 Hobby 한도를 넘었다(30일 1,024,407건). 적중률은 97~100%라 함수 비용은 작지만
한도는 건수로 센다. Observability → CDN Requests 12시간 상위가 `/my` 1.9K · `/feed` 1.5K · `/map` 1.5K · `/` 1.2K로,
같은 시간 페이지뷰(1.4K)와 비슷했다 — 메뉴 바 탭 prefetch.

| 조치 | 위치 | 이유 |
|---|---|---|
| 메뉴 바·레일 탭 링크 prefetch 끔 | `GlobalNav.tsx` `TAB_PREFETCH` | 모든 화면에 떠 있어 페이지뷰마다 네 탭을 미리 받았다 |
| 브라우저 JS 조각 합치기 | `next.config.ts` `webpack` | 기본값(maxInitialRequests 25 · minSize 20KB)이면 첫 화면에 청크 26~32개. 10 · 100KB로 15~20개, 용량은 +1~4% |
| 404 일러스트 `loading="lazy"` | `src/app/not-found.tsx` | not-found가 모든 페이지 RSC 트리에 실려 React가 모든 HTML에 이미지 preload를 넣었다 — 12시간 486회는 봇이 아니라 일반 방문 |
| `public/` 정적 파일 브라우저 캐시 | `next.config.ts` headers | 기본 `max-age=0`이라 파비콘·폰트·일러스트를 화면마다 다시 받았다. 폰트 1년, 나머지 7일. 내용을 바꾸면 파일 이름을 바꾼다 |
| KIMM TTF → woff2 | `public/fonts/*.woff2`, `globals.css` | 924KB(전송 약 276KB) → 210KB. TTF는 OG 카드(Satori, woff2 미지원)용으로 남긴다 |

- 확인: 운영 빌드(`next start`)에서 홈을 열었을 때 `/?_rsc`·`/map?_rsc`·`/feed?_rsc`·`/my?_rsc` 요청이 없어야 한다.
- 첫 방문 JS 요청(로컬 `next start`): `/` 26→15 · `/movie/[id]` 29→17 · `/films/theater/[id]` 26→16 · `/map` 32→20.
- 남은 것: 홈 첫 방문에 `/api/public/*` 16건 중 6건이 같은 주소 중복(movies·theaters·curation-cache·film-rankings·showtimes-window·active-showtimes). 영화제 바로가기 `router.prefetch` 한 번이 구간별 요청 약 11건으로 나간다(Next 16 segment prefetch).

**다음에 CPU가 다시 오르면:** Vercel Usage → Fluid Active CPU에서 Type·경로별로 먼저 나눠 본다. 코드만 봐서는
어느 경로가 큰지 확정할 수 없었다. 남은 후보는 OG 카드 렌더(카드당 수백 ms), 크롤러의 롱테일 상세 방문, 배포마다의 캐시 초기화다.
