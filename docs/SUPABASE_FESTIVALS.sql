-- Festivals schema
-- Step 1: Run this in the Supabase SQL editor.
-- Creates: festivals, festival_theaters, festival_movies, festival_timetables
--
-- 지도의 영화제 표시는 지금 theater_events.title 문자열 매칭(isFestivalTitle,
-- src/lib/gv/adapter.ts)으로만 판별한다 — event_type CHECK 제약에 'festival' 값이 없어서
-- 생긴 임시방편이다. 이 테이블들은 영화제 회기·라인업·상영관을 구조화된 데이터로 다룬다.
-- 상태(진행중/예정/종료)는 저장하지 않는다 — start_date/end_date vs 오늘로 런타임 계산
-- (src/lib/festival/status.ts).

-- ── festivals ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS festivals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  region       TEXT NOT NULL,
  city         TEXT NOT NULL,
  venue_text   TEXT,  -- 영화제 전체 요약 장소 표기(헤더용), 예: "정동초등학교 운동장 · 강릉독립예술극장 신영"
  banner_url   TEXT,
  link_url     TEXT,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_festivals_slug ON festivals(slug);
CREATE INDEX IF NOT EXISTS idx_festivals_active_end ON festivals(is_active, end_date);

-- ── festival_theaters ────────────────────────────────────────────────────────
-- 영화제가 열리는 상영관. theater_id가 NULL이면 DB에 없는 임시 상영장(야외 상영 등).
--
-- surrogate id를 PK로 쓴다 — theater_id가 NULL인 행이 festival당 여러 개 있을 수 있어
-- (festival_id, theater_id) 복합 PK는 쓸 수 없다. Postgres PK 컬럼은 전부 NOT NULL이
-- 강제되므로, theater_id가 NULL인 행 자체가 복합 PK 하에서는 INSERT가 거부된다.

CREATE TABLE IF NOT EXISTS festival_theaters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  theater_id  UUID REFERENCES theaters(id) ON DELETE SET NULL,
  venue_text  TEXT,  -- theater_id가 NULL일 때 이 행 하나의 임시 상영장 이름(festivals.venue_text와 별개 용도)
  sort_order  INT NOT NULL DEFAULT 0
);

-- theater_id가 있는 행끼리만 (festival, theater) 중복 방지 — NULL 행은 partial index 대상에서 자동 제외
CREATE UNIQUE INDEX IF NOT EXISTS idx_festival_theater_uniq
  ON festival_theaters(festival_id, theater_id) WHERE theater_id IS NOT NULL;

-- ── festival_movies ──────────────────────────────────────────────────────────
-- 영화제 라인업. 라인업은 영화제의 역사적 기록이라, movies에서 크롤 데이터가 빠져도
-- 연결이 소리 없이 사라지지 않도록 ON DELETE CASCADE 대신 SET NULL + 제목 스냅샷으로
-- 보존한다(의식적 선택 — CASCADE였다면 movie row 삭제 시 라인업에서도 조용히 사라짐).

CREATE TABLE IF NOT EXISTS festival_movies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id           UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  movie_id              UUID REFERENCES movies(id) ON DELETE SET NULL,
  movie_title_snapshot  TEXT NOT NULL,  -- movie_id가 NULL이 돼도 "제목만이라도" 남기기 위한 스냅샷
  sort_order            INT NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_festival_movie_uniq
  ON festival_movies(festival_id, movie_id) WHERE movie_id IS NOT NULL;

-- ── festival_timetables ──────────────────────────────────────────────────────
-- 영화제가 배포하는 타임테이블 이미지. 날짜별/상영관별로 여러 장일 수 있다.
-- 수동 데이터라 영화제 측이 갱신해도 자동 동기화 안 됨 — 정확한 회차는 극장 상세
-- (실시간 크롤 데이터)를 참조하도록 상세 페이지에서 유도할 것.

CREATE TABLE IF NOT EXISTS festival_timetables (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id  UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  image_url    TEXT NOT NULL,
  day_date     DATE,   -- 없으면 "전체" 취급
  label        TEXT,   -- 한 날 여러 장일 때 구분("신영 상영관" 등)
  sort_order   INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_festival_timetables_festival ON festival_timetables(festival_id, sort_order);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- 하위 테이블도 festivals.is_active로 게이트한다 — festivals만 게이트하면 상세 페이지는
-- 조인이 먼저라 안 새지만, 하위 테이블을 직접 쿼리하면 비활성 영화제 데이터가 새어나간다.

ALTER TABLE festivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE festival_theaters ENABLE ROW LEVEL SECURITY;
ALTER TABLE festival_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE festival_timetables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active festivals" ON festivals
  FOR SELECT USING (is_active = true);
CREATE POLICY "Public read festival_theaters of active festivals" ON festival_theaters
  FOR SELECT USING (festival_id IN (SELECT id FROM festivals WHERE is_active = true));
CREATE POLICY "Public read festival_movies of active festivals" ON festival_movies
  FOR SELECT USING (festival_id IN (SELECT id FROM festivals WHERE is_active = true));
CREATE POLICY "Public read festival_timetables of active festivals" ON festival_timetables
  FOR SELECT USING (festival_id IN (SELECT id FROM festivals WHERE is_active = true));
