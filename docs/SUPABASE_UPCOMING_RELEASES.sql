-- ═════════════════════════════════════════════════════════════
-- 개봉 예정 수집 (2026-11-17)
-- Supabase SQL Editor에서 위에서부터 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 왜: 크롤러는 극장 시간표에 회차가 올라온 뒤에야 영화를 안다. 개봉 1~3주 전 영화와
--     개봉일 값이 비어 있다. 설계는 docs/PLAN-indieground-releases.md.
--
-- 어떻게:
--   1) upcoming_releases — 소스(인디그라운드)에서 읽은 원본 + 매칭 결과. movies와 분리해서
--      매칭이 틀려도 movies를 건드리지 않고, 개봉일 변경 기록을 남긴다.
--   2) movies.release_date — 화면·알림이 읽는 값 하나. 매칭된 행에서만 채운다.
-- 사실 정보(제목·개봉일·제작연도·소스 id)만 담는다. 포스터·시놉시스는 저장하지 않는다.
-- ═════════════════════════════════════════════════════════════

-- 1. 수집 원본
CREATE TABLE IF NOT EXISTS upcoming_releases (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source               TEXT        NOT NULL,
  source_movie_id      TEXT        NOT NULL,
  title                TEXT        NOT NULL,
  production_year      INTEGER,
  release_date         DATE        NOT NULL,
  movie_id             UUID        REFERENCES movies(id) ON DELETE SET NULL,
  match_status         TEXT        NOT NULL DEFAULT 'pending'
                                   CHECK (match_status IN ('pending', 'matched', 'needs_review', 'rejected')),
  match_note           TEXT,
  first_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  release_date_history JSONB       NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (source, source_movie_id)
);

CREATE INDEX IF NOT EXISTS idx_upcoming_releases_movie ON upcoming_releases(movie_id);
CREATE INDEX IF NOT EXISTS idx_upcoming_releases_date  ON upcoming_releases(release_date);

-- 1단계는 수집 스크립트(service role)만 읽고 쓴다. 공개 읽기 정책은 화면에 쓸 때 추가한다.
ALTER TABLE upcoming_releases ENABLE ROW LEVEL SECURITY;

-- 2. 개봉일
ALTER TABLE movies ADD COLUMN IF NOT EXISTS release_date DATE;
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON movies(release_date) WHERE release_date IS NOT NULL;
