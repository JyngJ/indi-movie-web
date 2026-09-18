# 인수인계 — 광고 도입 준비 · 상세 화면 개편 (2026-09-18)

`AGENTS.md`의 브랜칭·아키텍처 규칙이 우선이다. 이 문서는 그 밖의 작업 맥락만 담는다. 앱 전환 계획은 `docs/PLAN-mobile-app.md`.

---

## 1. PR 현황

| PR | 상태 | 내용 |
| --- | --- | --- |
| #361 | 머지 | 상세 3종 핵심 정보 흰 패널(`DetailKeyPanel`), 상영 완료 회차 종료 시간 줄 제거 |
| #362 | 머지 | 영화·극장 상세 ISR, 회차 공유 `?showtime=` → `/s/[showtimeId]` |
| #363 | 머지 | 지도 핀·그리드 포스터 회색 덮개 버그(#361 회귀) |
| #364 | 머지 | 상세 뒤로가기 상영작 흐름 기준, 시놉시스 간격, 패널 테두리 PC 한정 |
| #365 | 열림 | 이 문서 |
| #366 | 열림 | `public/ads.txt` |
| #367 | 머지 | 크롤 요청 UA에 서비스 식별자·연락처, 브라우저 위장 헤더 제거 |
| #368 | 열림 | 공개 응답에서 씨네21 관객 별점 제외 |

### 기술 사실 (재발 방지)

- `force-dynamic`(영화·극장 상세)은 직진입 hydration 스톨 완화책이었다(#247, HANDOFF-design-refactor 3.9). 제거 전 로컬 프로덕션 빌드 직진입 45회(스로틀 포함) 스톨 0건. 프로브: `scripts/dev/hydration-probe.mjs`. **프로덕션 재측정 미실시.**
- `/films/area/[region]`의 `force-dynamic`은 유지. ISR에서 한글 경로 태그가 헤더에 실려 500(2026-07-25 Search Console 5xx 원인).
- `PosterThumb` `fade={false}` 경로(지도 핀, `AllMoviesGrid`)는 정적 마크업이라 `onLoad` 없음. 로드 상태 의존 오버레이 금지. 회귀 테스트 `posterMarkerMarkup.test.tsx`.
- 패널 테두리·모서리는 `globals.css`에서 관리. 인라인 스타일은 미디어 쿼리보다 우선한다.

---

## 2. 크롤러 (#367 반영 확인)

머지 03:42 KST → RPi 04시 `git pull` 반영(`HEAD e388818`).

| | 이전 | 새 UA |
| --- | --- | --- |
| showtimes (05시) | 97/97 성공, 후보 3,276 | 97/97 성공, 후보 3,158 |
| seats (08시) | ✅ 80 | ✅ 80 |
| dtryx 밴 | 마지막 7/23 | 없음 |

- 실제 crontab: showtimes 05시 1회, seats 00·08·16시, events 04시(여기서 `git pull`), health 4시간 간격. `RUNBOOK-crawler.md`의 crontab 절(2026-07-09 기준)은 갱신되지 않았다.
- 무비랜드 상품 페이지 404 재시도 8건/회는 9/16부터 계속 발생. UA 무관, 최종 갱신은 성공.
- 사전 비교에서 tinyticket이 "새 UA에서만 정상"으로 나왔으나 curl 기준이었다. 실제 파서는 Playwright 경로라 헤더 변경 영향이 없다.

---

## 3. 이미지 권리

### 실측

**포스터 1,501장** — KMDb 1,298 · 씨네21 145 · 위키미디어 24 · JustWatch 20 · 자체 6 · 기타 8

**감독 사진 463장** — 네이버 뉴스(`imgnews.naver.net`) 207 · 위키미디어 209 · 기타 47

### 확인한 1차 자료

- 한국영상자료원 저작권정책(`koreafilm.or.kr/pages/PC_00000096`): 기관 콘텐츠 기본 공공누리 제1유형. 단 **"영화 스틸/포스터 — 기관 외 저작물 — 사용 불가"** 로 명시 제외.
- 공공데이터포털 KMDb 영화정보: "이용허락범위 제한 없음"(정보 데이터 대상).
- 키노라이츠 이용약관: 포스터 권리 귀속 조항 없음(별도 고지 없이 사용).
- 한국저작권보호원 해설: 영화 소개·감상평 목적 포스터 사용은 위반 아님, 출처 명시 조건(블로그·리뷰 전제).

### 결정

- 포스터: 유지. 근거는 저작권법 28조(인용)·35조의5(공정이용)와 배급사 홍보 목적 공개 관행. 조건으로 출처 표기와 권리자 삭제 요청 절차를 화면에 둔다(미구현).
- 감독 사진: 근거 없는 254장 정리. 대체본은 위키미디어에서만.
- 씨네21 관객 별점: 공개 응답에서 제외(#368). 큐레이션 저평점 필터 내부 용도로만 유지.

### 감독 사진 정리 작업

- 브랜치 `chore/cleanup-unlicensed-images`, worktree `/tmp/claude-501/movie-img`, 미커밋
- `scripts/cleanup-unlicensed-director-photos.ts` — dry-run 기본, `--apply`, `--restore <백업>`
- 마지막 dry-run: 대체 23 / 비움 231. **`--apply` 미실행, DB 변경 없음.**
- 조회 제약: KMDb `kmdb_people2`는 빈 응답. 위키데이터 SPARQL 영화감독 직업 쿼리는 응답이 커서 JSON이 잘림 → LIMIT/OFFSET 페이징 필요. 위키백과 요약 API는 정확한 문서 제목 필요 → 검색 선행.

---

## 4. 법적 리스크 현황

| 항목 | 상태 |
| --- | --- |
| 크롤러 신원 위장 | 해소(#367) |
| IP 로테이션 | runbook상 최후 수단. 실행 기록 7/9 1회 |
| 개인정보처리방침 AdSense 항목 | 미반영. 초안 `docs/ADS-PRIVACY-RIGHTS-REVIEW.md`(codex 브랜치, 미커밋) |
| 감독 사진 254장 | 정리 대기(dry-run 완료) |
| 포스터 출처 표기·삭제 요청 절차 | 미구현 |
| 씨네21 별점 공개 노출 | #368로 해소 예정. anon 키 REST 직접 조회는 남음 |
| 씨네21 줄거리(최대 600자) | 수집·표시 중. 별점과 같은 성격이라 정리 대상 |
| KMDb 포스터 이미지 | 자료원 "사용 불가" 명시. 공정이용·관행으로 유지 |
| dtryx 상영 정보 | robots 전면 허용. 공식 경로 문의 미발송 |
| 이미지 최적화 캐시 30일 | 포스터 유지에 따르는 리스크로 감수 |

광고 게재 전 필수: 개인정보처리방침, 감독 사진, 포스터 출처 표기·삭제 절차, 씨네21 줄거리.

---

## 5. 광고

- 위치: 소식탭 상단 배너 · 상영작 피드 중간 · 예매 복귀 시(AdSense 자동 광고의 전면광고 형식 사용 예정)
- 게시자 ID `pub-9133958847616613`. 사이트 승인 · 광고 단위 슬롯 ID 발급 전
- 자동 광고 설정: 앵커 광고 끄기(하단 탭바와 겹침). 전면광고는 켠 뒤 Search Console 모바일 노출·클릭 2~3주 관찰
- 심사 리스크: "스크랩된 콘텐츠" 정책. 지도 재구성·큐레이션·랭킹이 방어 근거
- 피드 중간 슬롯은 고정 높이 필수(CLS), "광고" 라벨 필수
- 코덱스 작업물: `codex/adsense-feed`(worktree `/private/tmp/movie-adsense`) — 소식탭 배너 컴포넌트, 미커밋 6건

---

## 6. 사용자 작업

- KMDb 문의: 포스터·스틸 이미지의 광고 게재 서비스 표시·변환·캐시 허용 여부
- dtryx 문의: 공개 회차·잔여석 주기 조회 허용 여부, 공식 제공 경로
- AdSense: 사이트 승인 → 광고 단위 생성 → `data-ad-slot` 전달
- Vercel `id-412-class`(Node 20): 10/1부터 빌드 실패. 삭제 또는 Node 24
- 프로덕션 hydration 프로브 재측정(1절)

---

## 7. worktree

| 경로 | 브랜치 | 상태 |
| --- | --- | --- |
| `/Users/jungjaeyong/Documents/JyngJ/side/movie` | `feature/biff31` | 사용자 작업, PR #343 |
| `/tmp/claude-501/movie-img` | `chore/cleanup-unlicensed-images` | 감독 사진 스크립트, 미커밋 |
| `/tmp/claude-501/movie-ads` | `chore/adsense-prep` | PR #366 |
| `/tmp/claude-501/movie-rating` | `chore/hide-cine21-rating` | PR #368 |
| `/tmp/claude-501/movie-doc` | `docs/handoff-20260918` | PR #365 |
| `/private/tmp/movie-adsense` | `codex/adsense-feed` | 미커밋 6건 |
| `/Users/jungjaeyong/Documents/JyngJ/side/movie-favorites` | detached, +31 | 관심·알림 P3 작업. #315로 squash 머지된 것으로 보임 — 차이 확인 후 정리 |
| `.claude/worktrees/adoring-greider-92802e` | detached, +1 | 시놉시스 문장 경계 백필, PR 없음 |

worktree는 메인 체크아웃의 `node_modules`·`.env.local`을 심볼릭 링크로 사용한다.
