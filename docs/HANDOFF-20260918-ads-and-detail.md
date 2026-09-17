# 인수인계 — 광고 도입 준비 · 상세 화면 개편 (2026-09-18)

새 세션은 이 문서부터 읽는다. `AGENTS.md`의 브랜칭·아키텍처 규칙이 우선이고, 여기엔 그 문서에 없는 이 작업 흐름의 맥락만 적는다.

---

## 1. 오늘 머지된 것

| PR | 내용 |
| --- | --- |
| #361 | 상세 3종(영화·감독·극장) 핵심 정보에 흰 패널(`DetailKeyPanel`) · 상영 완료 회차에서 종료 시간 줄 제거 |
| #362 | 영화·극장 상세를 ISR로 · 회차 공유를 `?showtime=`에서 `/s/[showtimeId]` 경로로 |
| #363 | 지도 핀·그리드 포스터가 회색 칸으로 덮이던 버그(=#361이 만든 회귀) |
| #364 | 상세 뒤로가기를 상영작 흐름 기준으로 · 시놉시스 위 간격 · 패널 테두리(PC만) |

### 이 과정에서 얻은 사실 (다시 밟지 말 것)

- **`force-dynamic`은 성능 무지가 아니라 hydration 스톨 완화책이었다.** #247/HANDOFF-design-refactor 3.9 참고. 걷어내기 전에 재현을 다시 쟀고(로컬 프로덕션 빌드, 정상 25회 + CPU 6배·400kbps 스로틀 20회, 영화·극장 각 45회) **스톨 0건**이었다. 프로브는 `scripts/dev/hydration-probe.mjs`. **배포된 프로덕션에서 한 번 더 돌려야 한다 — 아직 안 했다.**
- **`/films/area/[region]`의 `force-dynamic`은 건드리지 말 것.** ISR이면 한글 경로 태그가 헤더에 실려 500이 난다(2026-07-25 Search Console 5xx의 실제 원인).
- **`PosterThumb`에 `fade={false}`인 경로(지도 핀·`AllMoviesGrid`)는 정적 마크업이라 `onLoad`가 안 붙는다.** 로드 상태에 의존하는 오버레이를 걸면 포스터가 영구히 가려진다. 회귀 테스트가 `posterMarkerMarkup.test.tsx`에 있다.
- **패널 테두리·모서리는 `globals.css`가 갖는다.** 인라인 스타일이면 "모바일에서 빼기" 미디어 쿼리가 못 이긴다.

---

## 2. 지금 하던 일 — 광고 도입 전 이미지 권리 정리

### 왜

Vercel Hobby **Fluid Active CPU 한도 초과**(4h23m / 4h)로 광고·수익화 논의가 시작됐다. 광고를 붙이면 영리 이용이 분명해지므로, 그 전에 이용허락 근거가 없는 이미지를 걷어내기로 했다.

### 실측 (2026-09-18)

**영화 포스터 1,501장**

| 출처 | 수 | 판단 |
| --- | --- | --- |
| `file.koreafilm.or.kr` (KMDb) | 1,298 | 공공데이터포털 "이용허락범위 제한 없음" — 근거 있음 |
| `image.cine21.com` | 145 | 허락 근거 없음 |
| 위키미디어 | 24 | CC 계열 |
| `images.justwatch.com` | 20 | 근거 없음 |
| 자체 Supabase | 6 | 문제없음 |
| mania.kr · Pinterest · artinsight | 8 | 출처 불명 |

**감독 사진 463장**

| 출처 | 수 | 판단 |
| --- | --- | --- |
| `imgnews.naver.net` | 207 | 언론사 보도사진 — 리스크 최상위 |
| 위키미디어(upload·commons·thumb) | 209 | CC 계열 |
| 나무위키·알라딘·YES24·네이버쇼핑·더쿠·익스트림무비 등 | 47 | 출처 불명 |

### 작업물

- 브랜치 `chore/cleanup-unlicensed-images`, worktree `/tmp/claude-501/movie-img` (**아직 커밋 안 함**)
- `scripts/cleanup-unlicensed-images.ts` — dry-run 기본, `--apply`로 적용, `--restore <백업파일>`로 원복. 적용 전 값은 `.backup/unlicensed-images-<시각>.json`에 남는다
- 허용 호스트: `file.koreafilm.or.kr`, 위키미디어 3종, `*.supabase.co`

### 대체본 조회에서 물린 것

- **KMDb 인물 컬렉션(`kmdb_people2`)은 이 서비스키로 빈 응답만 온다.** 기존 `scripts/fetch-director-photos-kmdb.ts`도 지금은 아무것도 못 가져온다
- **위키데이터 SPARQL은 직업 `VALUES` + `skos:altLabel UNION`을 한 쿼리에 몰면 에러 HTML을 돌려준다.** 직업별·라벨별로 쪼개서 여러 번 돌려야 한다
- **위키백과 요약 API는 정확한 문서 제목이 필요하다.** 이름만 넣으면 적중률이 4%였다. `list=search`로 문서를 먼저 찾아야 한다

### 마지막 상태

포스터는 KMDb 대체 20장 / 비움 153장으로 계산이 끝났다. 감독 사진은 4단계 조회(위키데이터 일괄 → 한국어 위키백과 → 위키백과 검색 → 위키데이터 검색 → 영어 위키백과)로 **dry-run을 다시 돌리던 중 세션이 끊겼다.** 개선 전 수치는 23/254였다. **아직 `--apply`는 한 번도 실행하지 않았다 — DB는 그대로다.**

---

## 3. 다음에 할 일

1. **감독 사진 dry-run 재실행** → 대체본 수를 보고 사용자 확인 후 `--apply`
2. **광고 3종** — 사용자가 확정한 위치
   - 소식탭 상단 배너
   - 상영작 피드 중간(섹션 사이 한두 줄)
   - 예매 사이트에서 복귀했을 때
   코덱스가 `codex/adsense-feed` 브랜치(worktree `/private/tmp/movie-adsense`)에 **소식탭 배너만** 만들어 뒀고 **6건이 커밋되지 않은 상태**다(`src/components/ads/`, `src/lib/ads/`, `providers.tsx`, `FeedContent.tsx`, `docs/ADSENSE-ROLLOUT.md`, `docs/ADS-PRIVACY-RIGHTS-REVIEW.md`). 게시자 ID `pub-9133958847616613`, 광고 단위 슬롯 ID는 아직 발급 전이라 송출은 비활성
3. **개인정보처리방침 개정** — 현재 방침에 AdSense가 없다. 초안이 `docs/ADS-PRIVACY-RIGHTS-REVIEW.md`(미커밋)에 있다
4. **프로덕션에서 hydration 프로브 재확인** (위 1절)
5. **PostHog `capture_pageview` 설정 점검** — GA 28일 18,560뷰 대 PostHog 8,685뷰로 2배 차이가 난다. 내부 경로 이동을 놓치는 설정으로 의심되나 **아직 코드에서 확인하지 못했다**

### 사용자만 할 수 있는 것

- **KMDb에 문의** — "공공데이터포털 이용허락범위 제한 없음으로 제공되는 영화정보 API의 포스터·스틸 이미지를, 광고가 있는 무료 서비스에서 표시하고 크기 변환·서버 캐시하는 것이 허용 범위인가"
- **dtryx에 문의** — 공개 회차·잔여석의 주기적 조회와 재표시가 허용되는지, 공식 제공 경로가 있는지
- **AdSense** — 사이트 승인 확인 후 디스플레이 광고 단위를 만들어 `data-ad-slot` 숫자 받기
- **Vercel `id-412-class` 프로젝트**(Node 20) — 10/1부터 새 빌드 실패. 삭제하거나 Node 24로 올리기

---

## 4. 법적 검토 — 확인된 것과 아닌 것

코덱스 세션(사용자 공유)에서 정리된 내용을 이 레포 실측과 대조한 결과다. **위법으로 확인된 것은 없고, 확인하지 않은 쟁점이 남았다**가 정확한 상태다.

- **대법원 2021도1533(야놀자·여기어때)** — 반복 수집 자체나 IP 변경 자체로 위법이 되지 않는다. "상당한 부분의 복제와 같은 결과"에 이르렀는지, 객관적 접근 보호조치가 있었는지가 쟁점
- **robots.txt 실측** — dtryx는 `User-Agent: * / Disallow:`(전면 허용, 단 브라우저 UA가 아니면 403), 씨네21은 SemrushBot만 차단, KMDb 웹사이트는 대부분 차단이지만 **우리는 공공데이터 API를 쓰므로 대상이 아니다**
- **남은 쟁점** — KMDb 이미지 재사용 범위, 씨네21 이용허락, 출처 불명 이미지 254장, dtryx 차단의 성격(IP 로테이션 기록은 `docs/RUNBOOK-crawler.md`에 있다), 부정경쟁방지법 2조 파목·카목(민사)

---

## 5. 열려 있는 작업 공간

| worktree | 브랜치 | 상태 |
| --- | --- | --- |
| `/Users/jungjaeyong/Documents/JyngJ/side/movie` | `feature/biff31` | 사용자 작업 (PR #343) |
| `/tmp/claude-501/movie-img` | `chore/cleanup-unlicensed-images` | 이미지 정리 스크립트, 미커밋 |
| `/private/tmp/movie-adsense` | `codex/adsense-feed` | 코덱스 애드센스 작업, 미커밋 6건 |
| `/Users/jungjaeyong/Documents/JyngJ/side/movie-favorites` | detached, main 대비 +31 | 관심 알림 P3 작업, PR 없음 |
| `.claude/worktrees/adoring-greider-92802e` | detached, +1 | 시놉시스 문장 경계 백필 커밋, PR 없음 |

뒤 둘은 PR 없이 커밋만 쌓여 있다. 살릴지 버릴지 사용자에게 확인할 것.

모든 worktree는 `node_modules`·`.env.local`을 메인 체크아웃에서 심볼릭 링크로 가져다 쓴다. dev 서버는 `.claude/launch.json`에 포트별로 등록해 두고 `preview_start`로 띄운다(Bash로 직접 띄우지 말 것).
