-- Festival screenings schema
-- Supabase SQL 편집기에서 실행한다. docs/SUPABASE_FESTIVALS.sql 이후 단계.
--
-- 왜 festival_timetables로 안 되는가:
-- festival_timetables는 영화제가 배포한 타임테이블 "이미지" 한 장을 그대로 보여주는 테이블이다.
-- 이미지는 검색도 필터도 정렬도 안 되고, 모바일에서 확대하지 않으면 읽을 수 없다.
-- 이 테이블은 회차 한 줄을 구조화된 행으로 들고 있어서 날짜/상영관/섹션으로 추려 표로 그린다.
-- 둘은 대체 관계가 아니라 공존한다 — 이미지가 먼저 나오는 영화제도 있어서, 회차 행이 0개면
-- 상세 페이지가 이미지 캐러셀로 폴백한다.
--
-- 회차는 영화제 회기가 끝나도 지우지 않는다(역대 상영 기록). 노출은 festivals.is_active로 끊는다.

CREATE TABLE IF NOT EXISTS festival_screenings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id           UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,

  screening_date        DATE NOT NULL,
  start_time            TIME NOT NULL,
  runtime_min           INT,              -- 상영 시간(분). 종료 시각은 저장하지 않고 start_time + runtime으로 계산한다.

  -- 상영 장소. festival_theater_id는 지도/극장 상세로 이어지는 링크용이고,
  -- venue_label은 그 링크가 끊겨도(SET NULL) 표에 남아야 하는 표기용 스냅샷이다.
  festival_theater_id   UUID REFERENCES festival_theaters(id) ON DELETE SET NULL,
  venue_label           TEXT NOT NULL,    -- 극장 이름, 예: "영화의전당"
  screen_label          TEXT,             -- 관 이름, 예: "중극장" — 멀티스크린 극장에서만 채운다

  -- 상영작. festival_movies와 같은 이유로 SET NULL + 제목 스냅샷을 쓴다
  -- (movies 행이 지워져도 상영 기록에서 영화가 조용히 사라지지 않게).
  movie_id              UUID REFERENCES movies(id) ON DELETE SET NULL,
  movie_title_snapshot  TEXT NOT NULL,

  section               TEXT,             -- 영화제 섹션, 예: "아이콘", "한국영화의 오늘"
  screening_code        TEXT,             -- 영화제 상영코드, 예: "K01" — 관객이 이 코드로 대화한다
  has_gv                BOOLEAN NOT NULL DEFAULT false,
  booking_url           TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 표는 항상 "이 영화제의 이 날짜"로 들어가서 시간순으로 읽는다
CREATE INDEX IF NOT EXISTS idx_festival_screenings_day
  ON festival_screenings(festival_id, screening_date, start_time);

-- 상영코드는 영화제 안에서 유일하다. 재수집이 중복 행을 쌓지 않게 upsert 키로 쓴다.
CREATE UNIQUE INDEX IF NOT EXISTS idx_festival_screenings_code_uniq
  ON festival_screenings(festival_id, screening_code) WHERE screening_code IS NOT NULL;

CREATE TRIGGER trg_festival_screenings_updated_at
  BEFORE UPDATE ON festival_screenings
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- 상위 테이블과 같은 원칙: 하위 테이블도 festivals.is_active로 직접 게이트한다.

ALTER TABLE festival_screenings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read festival_screenings of active festivals" ON festival_screenings
  FOR SELECT USING (festival_id IN (SELECT id FROM festivals WHERE is_active = true));
