-- 독립영화 주간 랭킹 — 매주 월요일 6시 compute-weekly-ranking 스크립트가 upsert
-- 최초 1회 Supabase SQL 에디터에서 실행

CREATE TABLE IF NOT EXISTS film_rankings (
  week_start   DATE PRIMARY KEY,   -- 집계 대상 주 월요일 (ISO, e.g. 2026-06-09)
  rankings     JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{movie_id, rank, prev_rank, score, theater_count, showtime_count, view_count}]
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE film_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read film rankings"
  ON film_rankings FOR SELECT USING (true);
