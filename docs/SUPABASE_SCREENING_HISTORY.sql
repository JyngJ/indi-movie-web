-- ═════════════════════════════════════════════════════════════
-- 상영 기록 보관 (2026-10-16)
-- Supabase SQL Editor에서 위에서부터 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 왜: pg_cron이 3일 지난 회차를 지우고 있었다.
--   DELETE FROM showtimes WHERE show_date < CURRENT_DATE - INTERVAL '3 days'
-- 그래서 "오랜만에 돌아온 영화" 큐레이션(12개월 전 상영 기록이 필요)이 늘 비었고,
-- 상영이 끝난 영화의 상영 이력도 보여 줄 수 없었다.
--
-- 어떻게:
--   1) showtimes(원본 회차) 보관을 3일 → 30일로 늘린다. 하루 약 560줄, 30일 약 1.7만 줄
--   2) screening_days(영화 × 극장 × 날짜별 회차 수)를 영구 보관한다. 하루 약 300줄,
--      1년 약 10만 줄(수십 MB 이하). 상영 이력·오랜만 상영은 날짜만 있으면 계산된다
--   3) 매일 지난 날짜를 screening_days로 옮긴 뒤(upsert) 원본을 지운다
-- showtime_candidates(수집 후보)의 3일 삭제는 그대로 둔다 — autoMatch 쿼리 속도 때문이다.
-- ═════════════════════════════════════════════════════════════

-- 1. 요약 테이블
CREATE TABLE IF NOT EXISTS screening_days (
  movie_id    UUID    NOT NULL REFERENCES movies(id)   ON DELETE CASCADE,
  theater_id  UUID    NOT NULL REFERENCES theaters(id) ON DELETE CASCADE,
  show_date   DATE    NOT NULL,
  show_count  INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (movie_id, theater_id, show_date)
);

CREATE INDEX IF NOT EXISTS idx_screening_days_movie_date   ON screening_days(movie_id, show_date);
CREATE INDEX IF NOT EXISTS idx_screening_days_theater_date ON screening_days(theater_id, show_date);

-- 공개 사실(어느 극장에서 언제 상영했나)이라 읽기는 누구나, 쓰기는 서버(service role)만
ALTER TABLE screening_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "screening_days_public_read" ON screening_days;
CREATE POLICY "screening_days_public_read" ON screening_days FOR SELECT USING (true);

-- 2. 옮기기 — before 이전 날짜의 회차를 날짜별로 세어 upsert. 같은 날을 여러 번 옮겨도 결과가 같다
CREATE OR REPLACE FUNCTION archive_screening_days(before DATE)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH moved AS (
    INSERT INTO screening_days (movie_id, theater_id, show_date, show_count)
    SELECT movie_id, theater_id, show_date, COUNT(*)::INTEGER
    FROM showtimes
    WHERE show_date < before
    GROUP BY movie_id, theater_id, show_date
    ON CONFLICT (movie_id, theater_id, show_date)
    DO UPDATE SET show_count = EXCLUDED.show_count, archived_at = NOW()
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER FROM moved
$$;

REVOKE ALL ON FUNCTION archive_screening_days(DATE) FROM PUBLIC, anon, authenticated;

-- 3. 지금 남아 있는 지난 회차(최근 3일치)를 바로 옮긴다 — 그 이전 기록은 이미 지워져 되살릴 수 없다
SELECT archive_screening_days(CURRENT_DATE);

-- 4. 정기 작업 교체
--    기존 "3일 지난 showtimes 삭제" 작업을 지우고, 옮기기 → 30일 지난 원본 삭제 순서로 다시 건다.
--    작업 이름을 모르므로 명령 내용으로 찾는다.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE command ILIKE '%DELETE FROM showtimes%';

SELECT cron.schedule(
  'archive-screening-days',
  '10 3 * * *',
  $$SELECT archive_screening_days(CURRENT_DATE)$$
);

SELECT cron.schedule(
  'cleanup-old-showtimes',
  '40 3 * * *',
  $$DELETE FROM showtimes WHERE show_date < CURRENT_DATE - INTERVAL '30 days'$$
);

-- 확인: 아래 셋이 보이면 된다 — cleanup-old-candidates(3일) · archive-screening-days · cleanup-old-showtimes(30일)
-- SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;
