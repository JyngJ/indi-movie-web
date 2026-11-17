# 개봉 예정 독립영화 수집 (인디그라운드) — 설계

2026-11-17 작성. 구현 전 설계 문서.

## 1. 왜 하는가

크롤러는 극장 시간표에 회차가 올라온 뒤에야 영화를 안다. 그래서 다음이 안 된다.

- 개봉 전 영화에 관심 표시 → 상영이 잡히면 알림 (이메일 P3의 `new_screening`이 개봉 전 영화에는 걸 대상이 없다)
- "곧 개봉" · "이번 주 개봉" 묶음
- 개봉일 기준 판단(개봉 N주차, 신작 여부). `movies`에 개봉일 컬럼이 없다(`year`만 있음)

### 실측 (2026-11-17)

인디그라운드 개봉 목록 28편을 `movies`와 제목(공백 제거)으로 대조:

| 상태 | 편수 | 예 |
|---|---|---|
| DB에 있고 회차 있음 | 23 | 흐르는 여정 354회 · 눈 둘 데가 없네 456회 |
| DB에 있지만 회차 1회(시사회 추정) | 2 | 왼손 피아니스트(11-30) · 레이오버 호텔(11-25) |
| DB에 없음 | 5 | 내일의 민재(12-02) · 포킴스(11-25) · 인간 초거대 알고리즘(11-25) · 더 버스 · 가족은 아니고 |

이미 개봉한 영화는 크롤러가 거의 다 잡는다. 이 수집이 메우는 빈자리는 **개봉 1~3주 전 구간**과 **개봉일 값** 두 가지다.

## 2. 소스

### 엔드포인트

```
POST https://indieground.kr/indie/releaseListMore.do
Content-Type: application/x-www-form-urlencoded
mode=list&start=0&end=100&setYear=
```

- JSON `{ list: [...] }`. 한 번 요청으로 전부(현재 62편, 2026-06-17 ~ 2026-12-02).
- `setYear`는 서버에서 무시된다(2025를 넣어도 같은 62편).
- 행 필드: `korSubject` · `releaseDateString`(yyyy-mm-dd) · `productionYear` · `movieSeq`(인디그라운드 DB id) · `seq`(개봉 소식 글 id) · `pathname`(포스터).
- 홈의 `indexRelease.do`는 같은 데이터의 최근 30편이라 쓰지 않는다.

### 상세 (선택, 2단계)

`GET /indie/movieLibraryView.do?seq={movieSeq}` — HTML. 영문 제목 · 장르 · 러닝타임 · 등급 · 제작사 · 배급사 · 감독 · 출연 · 키워드 · 영화제 이력. 개봉일은 없다.

### 권리 범위

이용약관 저작권정책: 공공누리 표시가 붙은 자료만 자유이용. 개봉 목록·상세에는 표시가 없다.

- **저장한다:** 제목, 개봉일, 제작연도, `movieSeq`(출처 링크용). 사실 정보라 저작물성이 약하다.
- **저장하지 않는다:** 포스터(`pathname`, 배급사 저작물 — AGENTS.md 허용 호스트 아님), 시놉시스 · 연출의도 원문.
- 화면에 개봉일을 보이면 출처 표기 페이지(`SettingsAttributionPage`)에 인디그라운드를 추가한다.
- 운영 전에 indieground@indieground.kr 로 이용 협의 메일을 한 번 보낸다(사용자가 보냄).

### 교차 확인 소스: KOBIS

`movies.kobis_movie_cd`가 이미 있다. KOBIS 영화목록 API(`openStartDt`/`openEndDt`)는 공공데이터 이용허락이 명확하고 상업영화까지 덮는다. 인디그라운드는 "독립·예술영화로 개봉 지원·홍보되는 목록"이라는 **선별 신호**와 **조기 등재**가 강점이고, 개봉일 값은 KOBIS와 엇갈리면 KOBIS를 우선한다(배급 일정 변경 반영이 KOBIS가 빠르다는 가정 — 1단계 운영 2주 동안 차이를 기록해서 확인).

## 3. 데이터 모델

### 새 테이블 `upcoming_releases`

수집 원본과 매칭 결과를 `movies`와 분리한다. 매칭이 틀려도 `movies`를 오염시키지 않고, 같은 영화가 개봉일을 바꿔 다시 올라와도 행 하나로 추적한다.

```sql
create table upcoming_releases (
  id uuid primary key default gen_random_uuid(),
  source text not null,                 -- 'indieground'
  source_movie_id text not null,        -- movieSeq
  title text not null,                  -- korSubject 원문
  production_year int,
  release_date date not null,
  movie_id uuid references movies(id) on delete set null,
  match_status text not null default 'pending', -- pending | matched | needs_review | rejected
  match_note text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  release_date_history jsonb not null default '[]', -- [{date, seenAt}] 개봉일 변경 기록
  unique (source, source_movie_id)
);
```

### `movies.release_date date` 추가

화면·알림이 읽는 값은 여기 하나. `upcoming_releases`에서 `matched` 행이 생기거나 바뀔 때만 갱신한다. 소스가 여러 개가 되면 우선순위(KOBIS > 인디그라운드 > KMDb `repRlsDate`)로 고른다.

## 4. 흐름

```
fetch (infra)  →  parse (pure)  →  upsert upcoming_releases  →  match (pure + KMDb)  →  apply release_date
```

| 단계 | 위치 | 성격 |
|---|---|---|
| 요청 | `src/lib/releases/indiegroundClient.ts` | 인프라. UA `CRAWLER_UA`, 동시 1, 타임아웃 10초 |
| 파싱 | `src/lib/releases/parseIndiegroundReleases.ts` | 순수. JSON → `UpcomingReleaseInput[]`. 날짜 형식 검증, 제목 trim |
| 저장 | `src/lib/releases/repository.ts` (+ supabase 구현) | 인터페이스 + 어댑터. `(source, source_movie_id)` upsert, 개봉일 바뀌면 history 추가 |
| 매칭 | `src/lib/releases/matchRelease.ts` | 순수 판정 + KMDb 검색은 주입 |
| 실행 | `scripts/crawl-releases.ts` | 얇은 진입점. Discord 시작·오류 알림은 `notify-discord` 재사용 |

### 매칭 규칙

기존 `candidateMovieTitleCandidates`(제목 변형)와 `pickRereleaseExternalMovie`를 재사용한다. 새 규칙을 따로 만들지 않는다.

1. 로컬 `movies`에서 제목 변형으로 찾는다. 후보가 하나이고 `|year - production_year| ≤ 1` → `matched`.
2. 없으면 KMDb 검색(`searchKmdbMovies`). 같은 조건으로 하나면 `importAdminExternalMovie`로 `movies`에 넣고 `matched`. 포스터는 KMDb 것이 들어간다.
3. 후보가 여럿이거나 연도 차이가 크면 `needs_review` — 연도 앵커 매칭 사고(메모리: 영화 매칭 소스) 때문에 자동 승인하지 않는다. Discord `matchReviewDiscord`로 알린다.
4. KMDb에도 없으면 `pending` 유지, 다음 실행에서 재시도. 개봉일이 7일 이상 지났는데 계속 `pending`이면 Discord 경고 한 번.

### 스케줄

RPi crontab에 하루 1회(04:30 — events 04시 · 04시 pull 뒤). 요청 1건이라 부하는 무시할 수준.

## 5. 쓰는 곳 (단계별)

| 단계 | 내용 | 비고 |
|---|---|---|
| 1 | 수집 · 매칭 · `movies.release_date` 채우기. 화면 변화 없음 | 2주 운영하며 KOBIS 개봉일과 차이 기록 |
| 2 | 영화 상세에 "12월 2일 (화) 개봉" 표기. 개봉 전 영화 상세 페이지가 회차 0이어도 열리게 | 빈 상태 문구: "아직 잡힌 회차가 없어요" X → "상영 시간표가 아직 없어요" + 관심 영화 버튼 |
| 3 | 알림: 관심 영화가 개봉 전이면 첫 회차가 잡힐 때 `new_screening`이 이미 나간다 — 새 kind는 만들지 않는다. 다이제스트에 "이번 주 개봉" 묶음만 추가 | `selectDigestItems` 입력에 `upcoming` 추가 |
| 4 | "곧 개봉" 큐레이션 섹션 | 포스터 없는 영화는 넣지 않는다 |
| 보류 | 상세 키워드·영화제 이력 파싱 | 큐레이션 태그 설계가 먼저 |

## 6. 테스트

- `parseIndiegroundReleases.test.ts`: 실제 응답 fixture(`__fixtures__/indieground-releases.json`, 포스터 경로 필드는 남겨도 저장 안 함 검증), 잘못된 날짜, 빈 목록.
- `matchRelease.test.ts`: 단일 일치 · 연도 ±1 · 동명 2편 → needs_review · KMDb 없음 → pending.
- 저장소 upsert: 개봉일 변경 시 history 누적.

## 7. 실패 시 동작

- 응답이 JSON이 아니거나 `list`가 없으면 아무것도 쓰지 않고 Discord 오류. 이전 데이터 유지.
- 목록에서 사라진 영화는 지우지 않는다(`last_seen_at`만 멈춘다). 인디그라운드는 지난 개봉작을 목록에서 내리는데, 그건 취소가 아니다.

## 8. 열린 쟁점

1. KOBIS 개봉일을 1단계부터 같이 받을지, 인디그라운드만 먼저 볼지.
2. 개봉 전 영화를 지도·상영작 그리드에 노출할지 — 지금 화면은 전부 "상영 중" 전제라 2단계 이후 별도 결정.
3. 인디그라운드 이용 협의 회신 전에 운영 반영할지.
