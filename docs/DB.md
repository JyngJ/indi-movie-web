# DB 스키마

> 예술영화관 상영 통합 조회 서비스 — 데이터 모델 정의서

**⚠️ TBD**: 아래는 **논리적 데이터 모델**입니다.  
DB 선택 후 백엔드 팀이 실제 마이그레이션 스크립트 작성합니다.

| DB 선택지 | 비고 |
|-----------|------|
| **Supabase** | PostgreSQL SQL 그대로 실행 가능 |
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

## movies (영화)

```sql
CREATE TABLE movies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(500)  NOT NULL,
  original_title   VARCHAR(500),
  year             INTEGER       NOT NULL,
  kmdb_id          VARCHAR(50)   UNIQUE,
  tmdb_id          INTEGER       UNIQUE,
  poster_url       VARCHAR(500),
  genre            TEXT[],
  director         TEXT[],
  synopsis         TEXT,
  runtime_minutes  INTEGER,
  certification    VARCHAR(10),      -- '전체', '12세', '15세', '청불'
  rating           NUMERIC(3,2),
  created_at       TIMESTAMP     DEFAULT NOW(),
  updated_at       TIMESTAMP     DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_movies_title_trgm ON movies USING GIN(title gin_trgm_ops);
CREATE INDEX idx_movies_year       ON movies(year DESC);
CREATE INDEX idx_movies_genre      ON movies USING GIN(genre);
```

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
