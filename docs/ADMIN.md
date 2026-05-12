# 관리자 기능 설계

> 독립·예술영화관 상영시간표를 운영자가 수집, 검수, 승인, 업로드하는 흐름.

## 목표

- 극장별 홈페이지, 운영자 CSV, HTML 붙여넣기에서 상영시간표 후보를 빠르게 수집한다.
- 수집 결과를 바로 서비스 데이터로 넣지 않고 `draft` 또는 `needs_review` 상태로 보관한다.
- 운영자는 신뢰도, 경고, 원문을 보고 승인/반려한다.
- Supabase 테이블에 크롤링 소스, 실행 이력, 후보 상태를 저장한다.

## 운영 흐름

```
크롤링 소스 선택
  ↓
URL / HTML / CSV / 샘플 fixture 입력
  ↓
서버 Route Handler가 원본 수집
  ↓
파서가 표준 후보 레코드로 정규화
  ↓
fingerprint 기준 중복 제거
  ↓
신뢰도와 warnings 부여
  ↓
운영자 검수
  ↓
승인된 후보만 실제 showtimes 업로드 대상으로 이동
```

## 구현 위치

| 파일 | 역할 |
|------|------|
| `src/app/admin/page.tsx` | 관리자 페이지 진입점 |
| `src/app/admin/AdminShowtimeConsole.tsx` | 수집 실행, 검수, 승인 UI |
| `src/app/api/admin/crawl/route.ts` | 크롤링 실행 API |
| `src/app/api/admin/sources/route.ts` | 크롤링 소스 조회/추가/삭제 API |
| `src/app/api/admin/showtimes/route.ts` | 검수 대기열 조회/상태 변경 API |
| `src/app/api/admin/showtimes/matches/route.ts` | 후보 극장/영화 매칭 저장, 새 영화 후보 생성 API |
| `src/app/api/admin/showtimes/auto-match/route.ts` | 후보 극장/영화 자동 매칭 API |
| `src/app/api/admin/showtimes/approve/route.ts` | 승인 후보를 실제 `showtimes`로 upsert하는 API |
| `src/app/api/admin/movies/route.ts` | 내부 영화 DB 조회/수정 API |
| `src/app/api/admin/movies/search/route.ts` | KMDB 영화 검색 API |
| `src/app/api/admin/movies/import/route.ts` | KMDB 영화를 내부 `movies` 테이블로 가져오는 API |
| `src/app/api/admin/theaters/route.ts` | 실제 극장 조회/생성/수정 API |
| `src/app/api/admin/theaters/[id]/showtimes/route.ts` | 실제 극장별 승인 시간표 조회/수정 API |
| `src/lib/admin/sources.ts` | 극장별 크롤링 소스 설정과 샘플 원본 |
| `src/lib/admin/crawler.ts` | HTML/JSON-LD/CSV 파서와 정규화 로직 |
| `src/lib/admin/store.ts` | Supabase 기반 크롤링 소스, 실행 이력, 후보 상태 저장소 |
| `src/lib/supabase/admin.ts` | 서버 전용 Supabase service role 클라이언트 |
| `src/types/admin.ts` | 관리자 도메인 타입 |

## 크롤링 소스 관리

운영자는 `/admin`의 왼쪽 패널에서 새 크롤링 소스를 추가할 수 있다.

필수 입력값은 아래와 같다.

- 극장명
- 상영시간표 URL
- 파서 유형: `tableText`, `timelineCard`, `dtryxReservationApi`, `movielandProductOptions`, `jsonLdEvent`, `csv`
- 수집 주기: `manual`, `daily`, `twice_daily`

홈페이지 URL은 비워두면 상영시간표 URL의 origin으로 대체한다. 새 소스를 저장하면 즉시 선택 상태가 되고 입력 방식은 `URL 크롤링`으로 전환된다.

## 크롤링 파서 전략

현재 파서는 세 가지 입력을 지원한다.

- `fixture`: 개발/시연용 샘플 HTML
- `url`: 서버에서 URL을 fetch한 뒤 파싱
- `html`: 운영자가 복사한 HTML 조각 파싱
- `csv`: 운영자 CSV 업로드용 텍스트 파싱

HTML 파서는 우선 JSON-LD `Event` 블록을 읽고, 없거나 부족하면 `showtime`, `schedule`, `time` 관련 HTML 조각을 텍스트로 정규화한다. 각 후보에는 아래 품질 정보를 붙인다.

인디스페이스처럼 표가 아니라 날짜 라벨과 시간축 카드로 렌더링되는 페이지는 `timelineCard` 패턴으로 처리한다. 이 파서는 `dateLabel` 아래의 `cardContainer`를 순회하며 `nameBox`, `schedule`, `salingInfo`, `venue` 텍스트에서 제목, 상영시간, 잔여석, 상영관 힌트를 추출한다.

디트릭스 계열 예매 페이지는 `dtryxReservationApi`로 처리한다. 이 어댑터는 예매 페이지 URL의 `cgid`를 추출하고 `/reserve/main_list.do`에서 영화관, 영화, 날짜 목록을 받은 뒤 `/reserve/showseq_list.do`를 조합 호출하여 `Showseqlist`를 후보 레코드로 정규화한다.

무비랜드는 `movielandProductOptions`로 처리한다. 이 어댑터는 Now Showing 목록에서 상품 상세 URL을 수집하고, Cafe24 상품 상세 HTML의 `option_stock_data`에 들어있는 `Date / Time / Seat` 조합을 날짜·시간별로 그룹핑해 잔여 좌석과 총 좌석을 계산한다.

기존 DB에 `movielandProductOptions` 파서가 저장되지 않으면 `docs/SUPABASE.sql`의 `crawl_sources_parser_check` 갱신 SQL을 먼저 적용해야 한다.

- `confidence`: 날짜, 시간, 제목, 상영관 추출 품질 기준의 0-1 점수
- `warnings`: 상영관/제목/시간 누락 등 운영자 확인이 필요한 항목
- `fingerprint`: `theaterId|movieTitle|showDate|showTime|screenName` 기반 중복 제거 키

## DB 연동 시 교체 지점

현재 `src/lib/admin/store.ts`는 Supabase 테이블에 직접 연결되어 있다. 필요한 테이블은 아래와 같다.

- `crawl_sources`: 극장별 source URL, parser, cadence, health
- `crawl_runs`: 실행 이력, 상태, 오류, 카운트
- `showtime_candidates`: 후보 레코드, raw text, warnings, confidence, status
- `showtimes`: 승인 후 서비스에 노출되는 최종 상영시간표
- `admin_users`: Supabase Auth 사용자 중 관리자 권한을 가진 계정 목록

전체 초기 스키마는 `docs/SUPABASE.sql`에 있다. 새 Supabase 프로젝트에서는 SQL Editor에서 이 파일 내용을 먼저 실행한다.

## 실제 서비스 데이터 관계

실제 사용자 화면에 노출되는 시간표는 후보 테이블이 아니라 `showtimes` 테이블을 읽는다.

관계는 아래처럼 고정된다.

```text
theaters.id  ← showtimes.theater_id
movies.id    ← showtimes.movie_id
```

영화 DB도 상영시간표와 연결되어야 한다. 후보에는 `movie_title` 텍스트만 들어오지만, 서비스 화면에서는 같은 영화를 하나로 묶고 포스터, 감독, 러닝타임, 장르 같은 메타데이터를 붙여야 하기 때문이다. 승인 파이프라인은 후보의 `movie_title`을 `movies.title` 또는 운영자 지정 `matched_movie_id`와 연결한 뒤 `showtimes.movie_id`로 저장한다.

극장도 같은 방식이다. 후보의 `theater_name`은 크롤링 원문 텍스트이고, 실제 서비스 극장은 좌표, 주소, 도시, 웹사이트를 가진 `theaters` 레코드다. 승인 시 후보는 `matched_theater_id`를 통해 실제 극장과 연결된다.

## KMDB 영화 DB 연동

영화 DB는 수동으로 전부 입력하지 않는다. KMDB를 메인 소스로 사용하고, 운영자가 필요한 영화만 내부 `movies` 테이블에 가져온다.

필요 환경변수:

```env
KMDB_SERVICE_KEY=...
```

운영 흐름:

```text
후보 movie_title
  ↓
관리자 KMDB 검색
  ↓
KMDB 결과 선택
  ↓
movies 테이블에 kmdb_id, kmdb_movie_seq 기준 저장
  ↓
candidate.matched_movie_id 저장
  ↓
승인 시 showtimes.movie_id로 연결
```

KMDB는 한국 영화 코드, 제목, 제작연도, 개봉일, 장르, 감독, 줄거리, 러닝타임, 관람등급과 포스터 URL을 함께 제공한다. 가져온 포스터는 `movies.poster_url`에 저장한다.

## 관리자 인증

`/admin`은 Supabase Auth 로그인 후 서버가 발급한 httpOnly 쿠키가 있어야 접근할 수 있다. 로그인 흐름은 아래와 같다.

1. `/admin/login`에서 Supabase email/password 인증을 수행한다.
2. 클라이언트가 받은 access token을 `/api/admin/session`으로 보낸다.
3. 서버는 service role 클라이언트로 토큰을 검증하고 `admin_users`에서 활성 관리자 여부를 확인한다.
4. 통과하면 httpOnly `indi_admin_access_token` 쿠키를 설정한다.

`/api/admin/crawl`, `/api/admin/sources`, `/api/admin/showtimes`, `/api/admin/showtimes/approve`는 요청마다 같은 관리자 검사를 수행한다. `SUPABASE_SERVICE_ROLE_KEY`는 `src/lib/supabase/admin.ts`에서만 사용하며 클라이언트로 전달하지 않는다.

필요 SQL:

```sql
CREATE TABLE IF NOT EXISTS admin_users (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'admin',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT admin_users_role_check CHECK (role = 'admin')
);

CREATE INDEX IF NOT EXISTS idx_admin_users_active
  ON admin_users(user_id)
  WHERE is_active = true;

-- Supabase Auth에서 만든 관리자 계정의 auth.users.id를 넣는다.
INSERT INTO admin_users (user_id, role, is_active)
VALUES ('00000000-0000-0000-0000-000000000000', 'admin', true)
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
```

## 승인 업로드

`POST /api/admin/showtimes/approve`는 선택 후보를 검증한 뒤 실제 서비스 테이블에 반영한다.

- 후보의 `matched_theater_id`가 있으면 우선 사용하고, 없으면 `theaters.name` exact match 후 정규화 match를 시도한다.
- 후보의 `matched_movie_id`가 있으면 우선 사용하고, 없으면 `movies.title` exact match 후 정규화 match를 시도한다.
- 매칭이 모두 성공한 후보만 `showtimes`에 upsert한다.
- 후보는 `status = 'approved'`, `approved_at`, `approved_by`, `matched_theater_id`, `matched_movie_id`로 갱신한다.
- 매칭 실패나 upsert 실패는 항목별 부분 실패로 반환한다.

필요 SQL:

```sql
ALTER TABLE showtime_candidates
  ADD COLUMN IF NOT EXISTS matched_theater_id UUID REFERENCES theaters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_movie_id UUID REFERENCES movies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_showtime_candidates_matched_theater
  ON showtime_candidates(matched_theater_id);

CREATE INDEX IF NOT EXISTS idx_showtime_candidates_matched_movie
  ON showtime_candidates(matched_movie_id);

ALTER TABLE showtimes
  ADD CONSTRAINT showtimes_unique_screening
  UNIQUE (theater_id, movie_id, show_date, show_time, screen_name);
```

`theaters`, `movies`, `showtimes`가 아직 없는 환경에서는 `docs/DB.md`의 기본 스키마를 먼저 적용한다. `movies.year`가 `NOT NULL`이므로 승인 파이프라인은 새 영화를 자동 생성하지 않고, 기존 `movies` 레코드와 매칭되는 후보만 업로드한다.

## 후보 매칭 UI

관리자 검수 테이블의 `매칭` 열에서 후보별 실제 극장/영화를 지정할 수 있다.

- `자동 매칭`은 선택 후보가 있으면 선택 후보만, 없으면 승인/반려되지 않은 후보 전체를 대상으로 실행한다.
- 자동 매칭은 `theaters.name`, `movies.title` exact match 후 공백/구두점 제거 정규화 match를 시도한다.
- 자동 매칭 실패 사유는 후보 `warnings`에 저장되고, 실패한 항목만 운영자가 select로 보정한다.
- 극장 select는 `theaters`의 `id`, `name`, `city`를 사용한다.
- 영화 select는 `movies`의 `id`, `title`, `year`를 사용한다.
- `저장`은 `PATCH /api/admin/showtimes/matches`로 `matched_theater_id`, `matched_movie_id`를 저장한다.
- `KMDB 영화`는 `GET /api/admin/movies/search`로 KMDB를 검색하고, `POST /api/admin/movies/import`로 내부 `movies`에 가져온다.

이 UI는 위 SQL의 `showtime_candidates.matched_theater_id`, `showtime_candidates.matched_movie_id` 컬럼이 적용된 뒤 저장까지 동작한다. SQL 적용 전에는 화면 빌드는 가능하지만 매칭 저장 API는 DB 컬럼 오류를 반환한다.

## 실제 극장/시간표 관리 UI

`/admin` 하단의 `실제 서비스 DB` 패널에서 운영자가 서비스 데이터를 직접 관리할 수 있다.

- `새 극장`: `theaters`에 극장명, 도시, 좌표, 주소, 연락처, 웹사이트, 상영관 수, 좌석 수를 생성한다.
- `극장 수정`: 선택한 실제 극장 레코드를 수정한다.
- 크롤링 소스: 새 소스 생성 시 실제 극장을 선택하면 `crawl_sources.matched_theater_id`에 저장되고, 해당 소스에서 수집한 후보는 처음부터 그 극장으로 매칭된다.
- 크롤링 소스 삭제: 선택한 소스와 연결된 후보, 실행 로그를 함께 삭제한다.
- 극장 선택: 해당 극장의 `showtimes`를 `movies`와 조인해 조회한다.
- 시간표 수정: 영화 연결, 날짜, 시작/종료 시간, 상영관, 좌석, 가격, 노출 여부를 수정한다.
- 영화 DB: KMDB로 가져온 내부 영화 레코드를 조회하고 제목, 연도, 원제, KMDB ID/Seq, 포스터, 줄거리, 러닝타임, 관람등급, 장르, 감독을 수정한다.

새 상영시간표 생성은 아직 승인 파이프라인을 기본 경로로 둔다. 운영자가 수동 생성까지 필요해지면 같은 API에 `POST`를 추가하면 된다.

## 다음 확장

- 극장별 전용 parser adapter 추가
- Playwright 기반 동적 페이지 수집 worker 분리
- 예약된 daily crawl job 추가
- 관리자 인증과 role 검사
- 후보 diff 화면과 영화/극장 매칭 보정 UI
