# DB 스키마

> 예술영화관 상영 통합 조회 서비스 — 데이터 모델 정의서

현재 구현은 Supabase PostgreSQL 기준입니다. 아래는 논리 모델이며, 실제 적용용 SQL은 `docs/SUPABASE.sql`을 우선 확인합니다.

| DB 선택지 | 비고 |
|-----------|------|
| **Supabase** | 현재 사용 중 |
| **자체 PostgreSQL** | 동일 |
| **MySQL** | 문법 변환 필요 (`TEXT[]` → JSON 등) |
| **MongoDB** | 컬렉션 구조로 재설계 필요 |

---

## theaters (극장)

```sql
CREATE TABLE theaters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255)     NOT NULL,
  lat           NUMERIC(10,8)    NOT NULL,
  lng           NUMERIC(10,8)    NOT NULL,
  address       VARCHAR(500)     NOT NULL,
  city          VARCHAR(50)      NOT NULL,
  phone         VARCHAR(20),
  website       VARCHAR(500),
  screen_count  INTEGER          DEFAULT 0,
  seat_count    INTEGER,
  parking       BOOLEAN          DEFAULT false,
  restaurant    BOOLEAN          DEFAULT false,
  accessibility BOOLEAN          DEFAULT false,
  rating        NUMERIC(3,2),
  created_at    TIMESTAMP        DEFAULT NOW(),
  updated_at    TIMESTAMP        DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_theaters_city       ON theaters(city);
CREATE INDEX idx_theaters_created_at ON theaters(created_at DESC);
-- 한글 전문검색 (pg_trgm extension 필요)
CREATE INDEX idx_theaters_name_trgm  ON theaters USING GIN(name gin_trgm_ops);
```

**RLS (Supabase 사용 시)**
- 모든 사용자: `SELECT` 허용
- 관리자(`role = 'admin'`): 모든 권한

---

## movies (영화 — 경량 목록용)

> 지도/검색 성능을 위해 목록 쿼리에 필요한 필드만 유지합니다.  
> 상세 정보(`synopsis`, `runtime_minutes`, `certification`, `cast_members`)는 `movie_details` 테이블로 분리되었습니다.

```sql
CREATE TABLE movies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(500)  NOT NULL,
  original_title   VARCHAR(500),
  year             INTEGER       NOT NULL,
  kmdb_id          VARCHAR(50),
  kmdb_movie_seq   VARCHAR(50),
  tmdb_id          INTEGER       UNIQUE,
  poster_url       VARCHAR(500),
  genre            TEXT[]        NOT NULL DEFAULT '{}',
  director         TEXT[]        NOT NULL DEFAULT '{}',
  nation           VARCHAR(100),
  rating           NUMERIC(3,2),
  created_at       TIMESTAMP     DEFAULT NOW(),
  updated_at       TIMESTAMP     DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_movies_title_trgm ON movies USING GIN(title gin_trgm_ops);
CREATE INDEX idx_movies_year       ON movies(year DESC);
CREATE INDEX idx_movies_genre      ON movies USING GIN(genre);
CREATE UNIQUE INDEX idx_movies_kmdb_identity
  ON movies(kmdb_id, kmdb_movie_seq)
  WHERE kmdb_id IS NOT NULL AND kmdb_movie_seq IS NOT NULL;
```

KMDB import는 `kmdb_id + kmdb_movie_seq` 조합을 내부 영화 식별자로 사용한다. 가져오기 시 같은 조합의 레코드가 있으면 갱신하고, 없으면 새로 추가한다.

현재 코드가 KMDB에서 받아 `movies`에 저장하는 값은 `title`, `original_title`, `year`, `kmdb_id`, `kmdb_movie_seq`, `poster_url`, `genre`, `director`, `nation`이다. `synopsis`, `runtime_minutes`, `certification`은 `movie_details`로 분리되었다. KMDB 응답의 개봉일(`openDate`)과 스틸컷(`stillUrl`)은 관리자 후보 데이터에는 남지만 현재 테이블에는 저장하지 않는다. `tmdb_id`와 숫자 평점 `rating`도 KMDB import 경로에서는 채우지 않는다.

---

## movie_details (영화 상세 — 온디맨드)

> 영화 상세 페이지 진입 시에만 join해서 가져옵니다. (`useMovieDetail(id)`)  
> 적용 SQL: `docs/SUPABASE_MOVIE_DETAILS.sql`

```sql
CREATE TABLE movie_details (
  movie_id        UUID PRIMARY KEY REFERENCES movies(id) ON DELETE CASCADE,

  synopsis        TEXT,
  runtime_minutes INTEGER,
  certification   VARCHAR(10),       -- '전체', '12세', '15세', '청불'

  -- [{name, character, profile_url}]
  cast_members    JSONB NOT NULL DEFAULT '[]'::jsonb,

  trailer_url     TEXT,
  awards          TEXT[] NOT NULL DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movie_details_movie_id ON movie_details(movie_id);
```

**쿼리 패턴**:
- 목록/지도: `movies` 테이블만 select → 경량
- 상세 페이지: `movies` + `movie_details(synopsis, runtime_minutes, certification, cast_members)` join → `useMovieDetail(id)`

---

## showtimes (상영시간표)

```sql
CREATE TABLE showtimes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theater_id      UUID         NOT NULL REFERENCES theaters(id) ON DELETE CASCADE,
  movie_id        UUID         NOT NULL REFERENCES movies(id)   ON DELETE CASCADE,
  screen_name     VARCHAR(100) NOT NULL,
  show_date       DATE         NOT NULL,
  show_time       TIME         NOT NULL,
  end_time        TIME,
  format_type     VARCHAR(50)  DEFAULT 'standard',  -- standard|2k|4k|imax|dolby
  language        VARCHAR(50)  DEFAULT 'korean',    -- korean|english|original
  seat_total      INTEGER      NOT NULL,
  seat_available  INTEGER      NOT NULL,
  price           INTEGER      NOT NULL,            -- 원 단위
  booking_url     VARCHAR(500),
  is_active       BOOLEAN      DEFAULT true,
  created_at      TIMESTAMP    DEFAULT NOW(),
  updated_at      TIMESTAMP    DEFAULT NOW()
);

-- 복합 인덱스 (자주 사용하는 쿼리 패턴)
CREATE INDEX idx_showtimes_theater_date ON showtimes(theater_id, show_date);
CREATE INDEX idx_showtimes_movie_date   ON showtimes(movie_id,   show_date);
CREATE INDEX idx_showtimes_datetime     ON showtimes(show_date,  show_time);
```

현재 `상영중` UI 태그는 `is_active = true`만 보지 않고 `show_date >= 오늘` 조건까지 만족하는 영화에만 표시합니다.

---

## stations (지하철역)

```sql
CREATE TABLE stations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     VARCHAR(100),
  name          VARCHAR(255) NOT NULL,
  lines         TEXT[]       DEFAULT '{}',
  lat           NUMERIC(10,8) NOT NULL,
  lng           NUMERIC(11,8) NOT NULL,
  city          VARCHAR(50)  NOT NULL,
  district      VARCHAR(50),
  neighborhood  VARCHAR(100),
  aliases       TEXT[]       DEFAULT '{}',
  created_at    TIMESTAMP    DEFAULT NOW(),
  updated_at    TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_stations_name_trgm ON stations USING GIN(name gin_trgm_ops);
CREATE INDEX idx_stations_lines     ON stations USING GIN(lines);
```

용도:
- 검색 오버레이의 `지하철역` 섹션
- 역 선택 시 지도 `flyTo`
- 지도 줌 15 이상에서 역 핀/라벨 표시

---

## areas (지역/동네)

```sql
CREATE TABLE areas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id   VARCHAR(100),
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(50)  NOT NULL, -- city|district|neighborhood
  city        VARCHAR(50)  NOT NULL,
  district    VARCHAR(50),
  lat         NUMERIC(10,8) NOT NULL,
  lng         NUMERIC(11,8) NOT NULL,
  aliases     TEXT[]       DEFAULT '{}',
  created_at  TIMESTAMP    DEFAULT NOW(),
  updated_at  TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_areas_name_trgm ON areas USING GIN(name gin_trgm_ops);
CREATE INDEX idx_areas_type      ON areas(type);
```

현재 스키마 초안은 있으나 앱 검색 연결은 아직 남아 있습니다.

---

## subway_lines (지하철 노선 geometry)

```sql
CREATE TABLE subway_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id   VARCHAR(100),
  name        VARCHAR(255) NOT NULL,
  line_code   VARCHAR(50)  NOT NULL,
  geometry    JSONB        NOT NULL,
  created_at  TIMESTAMP    DEFAULT NOW(),
  updated_at  TIMESTAMP    DEFAULT NOW()
);
```

현재 지도 노선 오버레이는 DB에서 geometry를 읽지 않고 `src/data/subway-lines.json` 정적 파일을 import합니다. Turbopack이 `.geojson` import를 기본 처리하지 않으므로 앱 번들 파일 확장자는 `.json`으로 유지합니다.

---

## users (사용자)

Supabase Auth 사용 시 `auth.users`와 연결.  
자체 서버 사용 시 별도 auth 컬럼 추가 필요.

```sql
CREATE TABLE users (
  id             UUID PRIMARY KEY,  -- auth.users(id) 또는 자체 생성
  email          VARCHAR(255) NOT NULL,
  display_name   VARCHAR(255),
  avatar_url     VARCHAR(500),
  preferred_city VARCHAR(50),
  created_at     TIMESTAMP    DEFAULT NOW(),
  updated_at     TIMESTAMP    DEFAULT NOW()
);
```

**RLS**: 사용자는 자신의 레코드만 접근 (`WHERE id = auth.uid()`)

---

## favorites (즐겨찾기)

```sql
CREATE TABLE favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type  VARCHAR(50) NOT NULL,  -- 'theater' | 'movie'
  item_id    UUID        NOT NULL,
  notes      TEXT,
  created_at TIMESTAMP   DEFAULT NOW(),

  CONSTRAINT unique_user_item UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
```

**RLS**: 사용자는 자신의 즐겨찾기만 CRUD

---

## notifications (알림, Phase 4+)

```sql
CREATE TABLE notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                VARCHAR(50) NOT NULL,
  title               VARCHAR(255) NOT NULL,
  content             TEXT,
  related_theater_id  UUID        REFERENCES theaters(id),
  related_movie_id    UUID        REFERENCES movies(id),
  is_read             BOOLEAN     DEFAULT false,
  created_at          TIMESTAMP   DEFAULT NOW()
);
```

---

## notification_preferences (알림 설정, Phase 4+)

```sql
CREATE TABLE notification_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                  VARCHAR(50) NOT NULL,
  enabled               BOOLEAN     DEFAULT true,
  theater_id            UUID        REFERENCES theaters(id),
  movie_id              UUID        REFERENCES movies(id),
  days_before_showtime  INTEGER,    -- D-N 알림
  created_at            TIMESTAMP   DEFAULT NOW()
);
```

---

## 공통 트리거 (updated_at 자동 갱신)

```sql
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_theaters_updated_at
  BEFORE UPDATE ON theaters
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_movies_updated_at
  BEFORE UPDATE ON movies
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_showtimes_updated_at
  BEFORE UPDATE ON showtimes
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
```
