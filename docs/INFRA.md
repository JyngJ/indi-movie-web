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
