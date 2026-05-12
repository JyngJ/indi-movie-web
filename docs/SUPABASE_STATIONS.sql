-- Subway/area tables for map search.
-- Run this once in the Supabase SQL editor, then run:
--   npx tsx --env-file=.env.local scripts/seed-subway-data.ts

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS stations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id    TEXT UNIQUE,
  name         TEXT NOT NULL,
  lines        TEXT[] NOT NULL DEFAULT '{}',
  lat          NUMERIC(10,8) NOT NULL,
  lng          NUMERIC(11,8) NOT NULL,
  city         TEXT NOT NULL DEFAULT '',
  district     TEXT,
  neighborhood TEXT,
  aliases      TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stations_name_trgm ON stations USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stations_lines ON stations USING GIN(lines);
CREATE INDEX IF NOT EXISTS idx_stations_aliases ON stations USING GIN(aliases);

DROP TRIGGER IF EXISTS trg_stations_updated_at ON stations;
CREATE TRIGGER trg_stations_updated_at
  BEFORE UPDATE ON stations
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TABLE IF NOT EXISTS areas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id  TEXT UNIQUE,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL,
  city       TEXT NOT NULL DEFAULT '',
  district   TEXT,
  lat        NUMERIC(10,8) NOT NULL,
  lng        NUMERIC(11,8) NOT NULL,
  aliases    TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT areas_type_check CHECK (type IN ('city', 'district', 'neighborhood'))
);

CREATE INDEX IF NOT EXISTS idx_areas_name_trgm ON areas USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_areas_type ON areas(type);
CREATE INDEX IF NOT EXISTS idx_areas_aliases ON areas USING GIN(aliases);

DROP TRIGGER IF EXISTS trg_areas_updated_at ON areas;
CREATE TRIGGER trg_areas_updated_at
  BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TABLE IF NOT EXISTS subway_lines (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id  TEXT UNIQUE,
  name       TEXT NOT NULL,
  line_code  TEXT NOT NULL DEFAULT '',
  color      TEXT,
  geometry   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subway_lines_name_trgm ON subway_lines USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_subway_lines_line_code ON subway_lines(line_code);

DROP TRIGGER IF EXISTS trg_subway_lines_updated_at ON subway_lines;
CREATE TRIGGER trg_subway_lines_updated_at
  BEFORE UPDATE ON subway_lines
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE subway_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read stations" ON stations;
CREATE POLICY "Public read stations" ON stations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read areas" ON areas;
CREATE POLICY "Public read areas" ON areas
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read subway lines" ON subway_lines;
CREATE POLICY "Public read subway lines" ON subway_lines
  FOR SELECT USING (true);
