-- ═════════════════════════════════════════════════════════════
-- 크롤러 DB 쓰기 묶기 (2026-10-16)
-- Supabase SQL Editor에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 왜: Supabase 로그(하루 약 1.5만 요청) 중 크롤러가 약 7천 건이었다.
--   - 자동매칭: 후보마다 후보 갱신 1회 + showtimes upsert 1회
--   - 좌석 갱신: 좌석 값이 같은 회차끼리 묶었지만 값이 회차마다 달라 사실상 회차당 1회
-- 코드(src/lib/admin/store.ts · src/lib/crawl/run-seat-checks.ts)는 아래 두 함수를 부르고,
-- 함수가 없으면 예전 방식으로 돌아간다. 그래서 코드가 먼저 배포돼도 깨지지 않는다.
-- 입력은 테이블 자체의 행 타입으로 푼다(jsonb_populate_recordset). 운영 DB의 warnings는
-- docs/SUPABASE.sql의 TEXT[]가 아니라 JSONB라, 타입을 손으로 적었다가 42804로 막혔다.
-- ═════════════════════════════════════════════════════════════

-- 1. 자동매칭 결과 묶어 쓰기 — [{id, matched_theater_id, matched_movie_id, warnings, status}, …]
CREATE OR REPLACE FUNCTION apply_candidate_matches(updates JSONB)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH done AS (
    UPDATE showtime_candidates c
    SET matched_theater_id = u.matched_theater_id,
        matched_movie_id   = u.matched_movie_id,
        warnings           = u.warnings,
        status             = u.status
    FROM jsonb_populate_recordset(NULL::showtime_candidates, updates) AS u
    WHERE c.id = u.id
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER FROM done
$$;

-- 2. 좌석 수 묶어 쓰기 — [{fingerprint, seat_available, seat_total}, …]
--
-- 2026-10-24 개정: 사이트에 실린 회차(showtimes)의 좌석도 같이 바꾼다.
--   사이트는 잔여석·매진을 showtimes에서 읽는데, 좌석 갱신(3시간마다)은 후보만 바꾸고 있었다.
--   showtimes의 좌석은 승인 순간 후보 값을 복사한 뒤로 상영 시간표 크롤(01·07·13시)이
--   다시 승인할 때까지 그대로라, 13시 이후 좌석 변화가 다음날 01시까지 안 보였다.
--   승인된 회차는 showtimes 충돌 키(theater_id·movie_id·show_date·show_time·screen_name)가
--   후보의 matched_* 와 같은 값이라 그 키로 잇는다. 후보 status는 보지 않는다 — 크롤이 같은
--   회차를 다시 넣을 때 status를 덮어써, 이미 실린 회차도 잠깐 approved가 아닐 수 있다.
--   showtimes에 같은 키의 행이 있다는 것 자체가 한 번 승인됐다는 뜻이다.
--   반환값은 예전처럼 갱신된 후보 수(run-seat-checks의 updatedCount).
CREATE OR REPLACE FUNCTION apply_candidate_seats(updates JSONB)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH done AS (
    UPDATE showtime_candidates c
    SET seat_available = u.seat_available,
        seat_total     = u.seat_total
    FROM jsonb_populate_recordset(NULL::showtime_candidates, updates) AS u
    WHERE c.fingerprint = u.fingerprint
    RETURNING c.matched_theater_id, c.matched_movie_id, c.show_date, c.show_time, c.screen_name,
              c.seat_available, c.seat_total
  ),
  -- 쓰기 CTE는 본 쿼리가 읽지 않아도 끝까지 실행된다
  synced AS (
    UPDATE showtimes s
    SET seat_available = d.seat_available,
        seat_total     = d.seat_total
    FROM done d
    WHERE d.matched_theater_id IS NOT NULL
      AND d.matched_movie_id   IS NOT NULL
      AND s.theater_id  = d.matched_theater_id
      AND s.movie_id    = d.matched_movie_id
      AND s.show_date   = d.show_date
      AND s.show_time   = d.show_time
      AND s.screen_name = d.screen_name
      AND (s.seat_available IS DISTINCT FROM d.seat_available OR s.seat_total IS DISTINCT FROM d.seat_total)
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER FROM done
$$;

-- 서버(service role)만 부른다
REVOKE ALL ON FUNCTION apply_candidate_matches(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION apply_candidate_seats(JSONB)   FROM PUBLIC, anon, authenticated;

-- PostgREST가 새 함수를 바로 알아보게 스키마 캐시를 다시 읽힌다
NOTIFY pgrst, 'reload schema';

-- 확인: 둘 다 0이 나오면 된다(빈 배열이라 아무것도 바꾸지 않는다)
-- SELECT apply_candidate_matches('[]'::jsonb), apply_candidate_seats('[]'::jsonb);
