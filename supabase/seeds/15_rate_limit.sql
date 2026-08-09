-- API 남용 방지용 IP 레이트리밋 카운터 (2026-08-10)
-- 실행: Supabase SQL Editor에서 실행.
--
-- Hobby/무료 플랜이라 Vercel WAF rate_limit 액션(Pro 전용)을 못 쓴다.
-- 요금 폭탄보다 "무료 한도(Vercel 함수 실행·Supabase egress) 소진 → 서비스 정지"가
-- 실질 위험이라, 무인증 쓰기 라우트와 캐시 미스가 비싼 공개 라우트만 앱 레벨에서 막는다.
--
-- 고정 윈도(fixed window) 방식: 버킷 하나당 행 하나, 윈도가 지나면 카운터를 리셋한다.
-- 슬라이딩 윈도보다 경계에서 최대 2배까지 통과하지만, 목적이 "봇이 분당 수천 번"을
-- 끊는 것이라 이 정도 오차는 무의미하다. 대신 행/쿼리 비용이 최소다.

CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket_key   TEXT PRIMARY KEY,          -- '<policy>:<ip>'
  window_start TIMESTAMPTZ NOT NULL,
  hit_count    INT NOT NULL
);

-- 만료 버킷 청소용. 봇넷이면 IP 수만큼 행이 늘기 때문에 인덱스 없이 두면 청소가 풀스캔이 된다.
CREATE INDEX IF NOT EXISTS api_rate_limits_window_start_idx ON api_rate_limits (window_start);

-- 서비스 롤로만 접근한다(라우트 핸들러 전용). anon/authenticated에는 정책을 주지 않아
-- RLS 활성화만으로 브라우저 직접 접근을 차단한다.
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- 카운터 1 증가시키고 허용 여부를 돌려준다.
-- INSERT ... ON CONFLICT 한 방이라 읽고-쓰는 사이의 경합(race)이 없다.
CREATE OR REPLACE FUNCTION consume_rate_limit(
  p_key            TEXT,
  p_window_seconds INT,
  p_limit          INT
)
RETURNS TABLE(allowed BOOLEAN, hit_count INT, retry_after_seconds INT) AS $$
DECLARE
  v_now    TIMESTAMPTZ := now();
  v_expiry TIMESTAMPTZ := now() - make_interval(secs => p_window_seconds);
  v_count  INT;
  v_start  TIMESTAMPTZ;
BEGIN
  INSERT INTO api_rate_limits AS r (bucket_key, window_start, hit_count)
  VALUES (p_key, v_now, 1)
  ON CONFLICT (bucket_key) DO UPDATE
    SET hit_count    = CASE WHEN r.window_start < v_expiry THEN 1     ELSE r.hit_count + 1 END,
        window_start = CASE WHEN r.window_start < v_expiry THEN v_now ELSE r.window_start  END
  RETURNING r.hit_count, r.window_start INTO v_count, v_start;

  -- 만료 버킷 청소. 매 호출마다 DELETE를 돌리면 그게 더 비싸므로 1% 확률로만 수행한다.
  IF random() < 0.01 THEN
    DELETE FROM api_rate_limits WHERE window_start < v_now - INTERVAL '1 day';
  END IF;

  RETURN QUERY SELECT
    v_count <= p_limit,
    v_count,
    GREATEST(CEIL(EXTRACT(EPOCH FROM (v_start + make_interval(secs => p_window_seconds) - v_now)))::int, 1);
END;
$$ LANGUAGE plpgsql VOLATILE;
