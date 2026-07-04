-- 극장별 "이번 주가 마지막" 오탐 방지용 공개 리드타임(p25, 일) 집계 RPC.
-- showtimes 테이블을 통째로 select하면 PostgREST 기본 상한(1000행)에 걸려
-- 임의로 잘린 표본만 보게 되므로, DB에서 직접 집계해서 극장별 결과만 반환한다.
--
-- (theater_id, 크롤일) 그룹별 "그날 본 것 중 가장 먼 미래 show_date"만 표본으로 센다.
-- 한 크롤에서 나온 여러 show_date를 전부 개별 표본으로 세면 서로 독립적인 관측이
-- 아닌데도 표본 수만 부풀리고, 대부분 diff가 작은 값에 몰려 p25가 실제 공개
-- 지평보다 훨씬 짧게(과소추정) 나온다.
CREATE OR REPLACE FUNCTION theater_leadtime_p25(min_samples INT DEFAULT 10)
RETURNS TABLE(theater_id UUID, leadtime_days INT) AS $$
  WITH daily_max AS (
    SELECT
      s.theater_id,
      s.created_at::date AS crawl_day,
      MAX((s.show_date - s.created_at::date))::int AS max_diff
    FROM showtimes s
    WHERE s.show_date >= s.created_at::date
    GROUP BY s.theater_id, s.created_at::date
  )
  SELECT
    d.theater_id,
    percentile_disc(0.25) WITHIN GROUP (ORDER BY d.max_diff)::int AS leadtime_days
  FROM daily_max d
  GROUP BY d.theater_id
  HAVING count(*) >= min_samples;
$$ LANGUAGE sql STABLE;
