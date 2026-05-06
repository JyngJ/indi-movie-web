-- Indi Movie Web Supabase schema
-- Run this in the Supabase SQL editor before using the admin approval flow.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS theaters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  lat           NUMERIC(10,8) NOT NULL DEFAULT 0,
  lng           NUMERIC(11,8) NOT NULL DEFAULT 0,
  address       TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL DEFAULT '',
  phone         TEXT,
  website       TEXT,
  screen_count  INTEGER NOT NULL DEFAULT 0,
  seat_count    INTEGER,
  parking       BOOLEAN NOT NULL DEFAULT false,
  restaurant    BOOLEAN NOT NULL DEFAULT false,
  accessibility BOOLEAN NOT NULL DEFAULT false,
  rating        NUMERIC(3,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_theaters_city ON theaters(city);
CREATE INDEX IF NOT EXISTS idx_theaters_name_trgm ON theaters USING GIN(name gin_trgm_ops);

DROP TRIGGER IF EXISTS trg_theaters_updated_at ON theaters;
CREATE TRIGGER trg_theaters_updated_at
  BEFORE UPDATE ON theaters
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TABLE IF NOT EXISTS movies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  original_title   TEXT,
  year             INTEGER NOT NULL,
  kobis_movie_cd   TEXT UNIQUE,
  kmdb_id          TEXT UNIQUE,
  tmdb_id          INTEGER UNIQUE,
  poster_url       TEXT,
  genre            TEXT[] NOT NULL DEFAULT '{}',
  director         TEXT[] NOT NULL DEFAULT '{}',
  synopsis         TEXT,
  runtime_minutes  INTEGER,
  certification    TEXT,
  rating           NUMERIC(3,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movies_title_trgm ON movies USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year DESC);

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS kobis_movie_cd TEXT UNIQUE;

DROP TRIGGER IF EXISTS trg_movies_updated_at ON movies;
CREATE TRIGGER trg_movies_updated_at
  BEFORE UPDATE ON movies
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TABLE IF NOT EXISTS showtimes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theater_id      UUID NOT NULL REFERENCES theaters(id) ON DELETE CASCADE,
  movie_id        UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  screen_name     TEXT NOT NULL,
  show_date       DATE NOT NULL,
  show_time       TIME NOT NULL,
  end_time        TIME,
  format_type     TEXT NOT NULL DEFAULT 'standard',
  language        TEXT NOT NULL DEFAULT 'korean',
  seat_total      INTEGER NOT NULL DEFAULT 0,
  seat_available  INTEGER NOT NULL DEFAULT 0,
  price           INTEGER NOT NULL DEFAULT 0,
  booking_url     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT showtimes_format_type_check CHECK (format_type IN ('standard', '2k', '4k', 'imax', 'dolby')),
  CONSTRAINT showtimes_language_check CHECK (language IN ('korean', 'english', 'original')),
  CONSTRAINT showtimes_unique_screening UNIQUE (theater_id, movie_id, show_date, show_time, screen_name)
);

CREATE INDEX IF NOT EXISTS idx_showtimes_theater_date ON showtimes(theater_id, show_date);
CREATE INDEX IF NOT EXISTS idx_showtimes_movie_date ON showtimes(movie_id, show_date);
CREATE INDEX IF NOT EXISTS idx_showtimes_datetime ON showtimes(show_date, show_time);

DROP TRIGGER IF EXISTS trg_showtimes_updated_at ON showtimes;
CREATE TRIGGER trg_showtimes_updated_at
  BEFORE UPDATE ON showtimes
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

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

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON admin_users;
CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TABLE IF NOT EXISTS crawl_sources (
  id              TEXT PRIMARY KEY,
  theater_id      TEXT NOT NULL,
  theater_name    TEXT NOT NULL,
  matched_theater_id UUID REFERENCES theaters(id) ON DELETE SET NULL,
  homepage_url    TEXT,
  listing_url     TEXT NOT NULL,
  parser          TEXT NOT NULL,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  cadence         TEXT NOT NULL DEFAULT 'manual',
  health          TEXT NOT NULL DEFAULT 'healthy',
  notes           TEXT,
  last_crawled_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT crawl_sources_parser_check CHECK (parser IN ('jsonLdEvent', 'tableText', 'timelineCard', 'dtryxReservationApi', 'csv')),
  CONSTRAINT crawl_sources_cadence_check CHECK (cadence IN ('manual', 'daily', 'twice_daily')),
  CONSTRAINT crawl_sources_health_check CHECK (health IN ('healthy', 'degraded', 'broken'))
);

DROP TRIGGER IF EXISTS trg_crawl_sources_updated_at ON crawl_sources;
CREATE TRIGGER trg_crawl_sources_updated_at
  BEFORE UPDATE ON crawl_sources
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

ALTER TABLE crawl_sources
  ADD COLUMN IF NOT EXISTS matched_theater_id UUID REFERENCES theaters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crawl_sources_matched_theater
  ON crawl_sources(matched_theater_id);

CREATE TABLE IF NOT EXISTS crawl_runs (
  id            TEXT PRIMARY KEY,
  source_id     TEXT NOT NULL REFERENCES crawl_sources(id) ON DELETE CASCADE,
  source_name   TEXT NOT NULL,
  status        TEXT NOT NULL,
  input_kind    TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL,
  finished_at   TIMESTAMPTZ,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT crawl_runs_status_check CHECK (status IN ('idle', 'running', 'completed', 'failed')),
  CONSTRAINT crawl_runs_input_kind_check CHECK (input_kind IN ('fixture', 'url', 'html', 'csv'))
);

CREATE INDEX IF NOT EXISTS idx_crawl_runs_source_started ON crawl_runs(source_id, started_at DESC);

CREATE TABLE IF NOT EXISTS showtime_candidates (
  id                 TEXT PRIMARY KEY,
  source_id          TEXT NOT NULL REFERENCES crawl_sources(id) ON DELETE CASCADE,
  theater_id         TEXT NOT NULL,
  theater_name       TEXT NOT NULL,
  movie_title        TEXT NOT NULL,
  screen_name        TEXT NOT NULL,
  show_date          DATE NOT NULL,
  show_time          TIME NOT NULL,
  end_time           TIME,
  format_type        TEXT NOT NULL DEFAULT 'standard',
  language           TEXT NOT NULL DEFAULT 'korean',
  seat_available     INTEGER NOT NULL DEFAULT 0,
  seat_total         INTEGER NOT NULL DEFAULT 0,
  price              INTEGER NOT NULL DEFAULT 0,
  booking_url        TEXT,
  source_url         TEXT,
  raw_text           TEXT NOT NULL DEFAULT '',
  confidence         NUMERIC(4,3) NOT NULL DEFAULT 0,
  warnings           TEXT[] NOT NULL DEFAULT '{}',
  status             TEXT NOT NULL DEFAULT 'draft',
  fingerprint        TEXT NOT NULL UNIQUE,
  matched_theater_id UUID REFERENCES theaters(id) ON DELETE SET NULL,
  matched_movie_id   UUID REFERENCES movies(id) ON DELETE SET NULL,
  approved_at        TIMESTAMPTZ,
  approved_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT showtime_candidates_status_check CHECK (status IN ('draft', 'needs_review', 'approved', 'rejected')),
  CONSTRAINT showtime_candidates_format_type_check CHECK (format_type IN ('standard', '2k', '4k', 'imax', 'dolby')),
  CONSTRAINT showtime_candidates_language_check CHECK (language IN ('korean', 'english', 'original'))
);

CREATE INDEX IF NOT EXISTS idx_showtime_candidates_status ON showtime_candidates(status);
CREATE INDEX IF NOT EXISTS idx_showtime_candidates_date_time ON showtime_candidates(show_date, show_time);
CREATE INDEX IF NOT EXISTS idx_showtime_candidates_matched_theater ON showtime_candidates(matched_theater_id);
CREATE INDEX IF NOT EXISTS idx_showtime_candidates_matched_movie ON showtime_candidates(matched_movie_id);

DROP TRIGGER IF EXISTS trg_showtime_candidates_updated_at ON showtime_candidates;
CREATE TRIGGER trg_showtime_candidates_updated_at
  BEFORE UPDATE ON showtime_candidates
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Existing projects may already have showtime_candidates from the crawler-only phase.
-- CREATE TABLE IF NOT EXISTS does not add newly introduced columns, so keep these ALTERs.
ALTER TABLE showtime_candidates
  ADD COLUMN IF NOT EXISTS matched_theater_id UUID REFERENCES theaters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_movie_id UUID REFERENCES movies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'showtimes_unique_screening'
      AND conrelid = 'showtimes'::regclass
  ) THEN
    ALTER TABLE showtimes
      ADD CONSTRAINT showtimes_unique_screening
      UNIQUE (theater_id, movie_id, show_date, show_time, screen_name);
  END IF;
END $$;

ALTER TABLE theaters ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE showtimes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read theaters" ON theaters;
CREATE POLICY "Public read theaters" ON theaters
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read movies" ON movies;
CREATE POLICY "Public read movies" ON movies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read active showtimes" ON showtimes;
CREATE POLICY "Public read active showtimes" ON showtimes
  FOR SELECT USING (is_active = true);

-- Admin writes are performed by the server-only Supabase service role client.
