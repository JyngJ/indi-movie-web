-- ═════════════════════════════════════════════════════════════
-- 크롤러 DB 쓰기 묶기 (2026-10-16)
-- Supabase SQL Editor에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 왜: Supabase 로그(하루 약 1.5만 요청) 중 크롤러가 약 7천 건이었다.
--   - 자동매칭: 후보마다 후보 갱신 1회 + showtimes upsert 1회
--   - 좌석 갱신: 좌석 값이 같은 회차끼리 묶었지만 값이 회차마다 달라 사실상 회차당 1회
-- 코드(src/lib/admin/store.ts · src/lib/crawl/run-seat-checks.ts)는 아래 두 함수를 부르고,
-- 함수가 없으면 예전 방식으로 돌아간다. 그래서 코드가 먼저 배포돼도 깨지지 않는다.
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
    FROM jsonb_to_recordset(updates)
      AS u(id TEXT, matched_theater_id UUID, matched_movie_id UUID, warnings TEXT[], status TEXT)
    WHERE c.id = u.id
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER FROM done
$$;

-- 2. 좌석 수 묶어 쓰기 — [{fingerprint, seat_available, seat_total}, …]
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
    FROM jsonb_to_recordset(updates)
      AS u(fingerprint TEXT, seat_available INTEGER, seat_total INTEGER)
    WHERE c.fingerprint = u.fingerprint
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
