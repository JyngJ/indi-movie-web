-- Theater Events schema
-- Step 1: Run this in the Supabase SQL editor.
-- Creates: event_sources, event_candidates, theater_events

-- ── event_sources ─────────────────────────────────────────────────────────────
-- Per-theater event page sources (GV notices, event boards, etc.)
-- Mirrors crawl_sources structure.

CREATE TABLE IF NOT EXISTS event_sources (
  id                 TEXT PRIMARY KEY,
  theater_id         TEXT NOT NULL,
  theater_name       TEXT NOT NULL,
  matched_theater_id UUID REFERENCES theaters(id) ON DELETE SET NULL,
  homepage_url       TEXT,
  listing_url        TEXT NOT NULL,
  parser             TEXT NOT NULL,
  enabled            BOOLEAN NOT NULL DEFAULT true,
  cadence            TEXT NOT NULL DEFAULT 'manual',
  health             TEXT NOT NULL DEFAULT 'healthy',
  notes              TEXT,
  last_crawled_at    TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT event_sources_cadence_check CHECK (cadence IN ('manual', 'daily', 'twice_daily')),
  CONSTRAINT event_sources_health_check  CHECK (health  IN ('healthy', 'degraded', 'broken'))
  -- parser: no CHECK — new parsers added frequently
);

CREATE INDEX IF NOT EXISTS idx_event_sources_matched_theater
  ON event_sources(matched_theater_id);

DROP TRIGGER IF EXISTS trg_event_sources_updated_at ON event_sources;
CREATE TRIGGER trg_event_sources_updated_at
  BEFORE UPDATE ON event_sources
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ── event_candidates ──────────────────────────────────────────────────────────
-- Crawled events awaiting admin review/approval.
-- Mirrors showtime_candidates structure.

CREATE TABLE IF NOT EXISTS event_candidates (
  id                 TEXT PRIMARY KEY,
  source_id          TEXT NOT NULL REFERENCES event_sources(id) ON DELETE CASCADE,
  theater_id         TEXT NOT NULL,
  theater_name       TEXT NOT NULL,
  event_type         TEXT NOT NULL DEFAULT 'gv',
  -- event_type: 'gv' | 'talk' | 'overnight' | 'special' | 'masterclass'
  title              TEXT NOT NULL,
  movie_title        TEXT,                    -- nullable: overnight / multi-film events
  event_date         DATE NOT NULL,
  event_time         TIME,                    -- nullable: date-only announcements
  end_time           TIME,
  guests             TEXT[] NOT NULL DEFAULT '{}',
  description        TEXT,
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

  CONSTRAINT event_candidates_status_check CHECK (
    status IN ('draft', 'needs_review', 'approved', 'rejected')
  ),
  CONSTRAINT event_candidates_event_type_check CHECK (
    event_type IN ('gv', 'talk', 'overnight', 'special', 'masterclass')
  )
);

CREATE INDEX IF NOT EXISTS idx_event_candidates_status
  ON event_candidates(status);
CREATE INDEX IF NOT EXISTS idx_event_candidates_date
  ON event_candidates(event_date);
CREATE INDEX IF NOT EXISTS idx_event_candidates_matched_theater
  ON event_candidates(matched_theater_id);
CREATE INDEX IF NOT EXISTS idx_event_candidates_matched_movie
  ON event_candidates(matched_movie_id);

DROP TRIGGER IF EXISTS trg_event_candidates_updated_at ON event_candidates;
CREATE TRIGGER trg_event_candidates_updated_at
  BEFORE UPDATE ON event_candidates
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ── theater_events ────────────────────────────────────────────────────────────
-- Approved events — the public-facing table.

CREATE TABLE IF NOT EXISTS theater_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theater_id  UUID NOT NULL REFERENCES theaters(id) ON DELETE CASCADE,
  movie_id    UUID REFERENCES movies(id) ON DELETE SET NULL,  -- nullable
  event_type  TEXT NOT NULL,
  title       TEXT NOT NULL,
  event_date  DATE NOT NULL,
  event_time  TIME,
  end_time    TIME,
  guests      TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  booking_url TEXT,
  source_url  TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT theater_events_event_type_check CHECK (
    event_type IN ('gv', 'talk', 'overnight', 'special', 'masterclass')
  )
);

CREATE INDEX IF NOT EXISTS idx_theater_events_theater_date
  ON theater_events(theater_id, event_date);
CREATE INDEX IF NOT EXISTS idx_theater_events_movie_date
  ON theater_events(movie_id, event_date)
  WHERE movie_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_theater_events_date
  ON theater_events(event_date)
  WHERE is_active = true;

ALTER TABLE theater_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active theater_events" ON theater_events;
CREATE POLICY "Public read active theater_events" ON theater_events
  FOR SELECT USING (is_active = true);

DROP TRIGGER IF EXISTS trg_theater_events_updated_at ON theater_events;
CREATE TRIGGER trg_theater_events_updated_at
  BEFORE UPDATE ON theater_events
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
