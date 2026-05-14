-- ============================================================
-- Migration: movie_details 테이블 분리
-- movies 테이블에서 무거운 상세 필드를 분리해 목록 쿼리 경량화
--
-- 실행 순서:
--   1. CREATE TABLE movie_details
--   2. 기존 movies 데이터 복사
--   3. movies 테이블에서 분리된 컬럼 제거 (선택)
-- ============================================================

/* ── 1. movie_details 테이블 ── */
CREATE TABLE IF NOT EXISTS movie_details (
  movie_id        UUID PRIMARY KEY REFERENCES movies(id) ON DELETE CASCADE,

  /* 상세 페이지에서만 쓰는 텍스트/데이터 */
  synopsis        TEXT,
  runtime_minutes INTEGER,
  certification   TEXT,

  /* 출연진 — [{name, character, profile_url}] */
  cast            JSONB NOT NULL DEFAULT '[]'::jsonb,

  /* 예고편 URL, 수상 이력 등 향후 확장용 */
  trailer_url     TEXT,
  awards          TEXT[] NOT NULL DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movie_details_movie_id ON movie_details(movie_id);

DROP TRIGGER IF EXISTS trg_movie_details_updated_at ON movie_details;
CREATE TRIGGER trg_movie_details_updated_at
  BEFORE UPDATE ON movie_details
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

/* RLS */
ALTER TABLE movie_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read movie_details" ON movie_details;
CREATE POLICY "Public read movie_details" ON movie_details
  FOR SELECT USING (true);

/* ── 2. 기존 movies 데이터 복사 ── */
-- movies에 행이 있으나 movie_details에 없는 경우만 INSERT (멱등)
INSERT INTO movie_details (movie_id, synopsis, runtime_minutes, certification)
SELECT
  id,
  synopsis,
  runtime_minutes,
  certification
FROM movies
WHERE
  (synopsis IS NOT NULL OR runtime_minutes IS NOT NULL OR certification IS NOT NULL)
  AND id NOT IN (SELECT movie_id FROM movie_details)
ON CONFLICT (movie_id) DO NOTHING;

/* ── 3. movies 테이블 컬럼 제거 (데이터 확인 후 실행) ── */
-- 아래 주석을 해제해서 실행하기 전에
-- SELECT COUNT(*) FROM movie_details; 로 데이터 복사 여부 먼저 확인할 것

-- ALTER TABLE movies
--   DROP COLUMN IF EXISTS synopsis,
--   DROP COLUMN IF EXISTS runtime_minutes,
--   DROP COLUMN IF EXISTS certification;
