-- 최근 7일 인기 랭킹 스냅샷 (예매 클릭 · 상세 조회) — 최초 1회 Supabase SQL 에디터에서 실행
-- 쓰는 곳: scripts/compute-click-rankings.ts(RPi 크론, curate:click-rankings)
--          /api/public/click-rankings(실시간 집계가 성공했을 때 응답 뒤에 덮어씀)
-- 읽는 곳: /api/public/click-rankings — 3시간보다 젊으면 PostHog를 부르지 않는다.
-- 이 시드를 적용하기 전에도 API는 동작한다(테이블이 없으면 PostHog로만 간다).

CREATE TABLE IF NOT EXISTS click_rankings (
  id           SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- 한 행만 둔다
  booking      JSONB NOT NULL DEFAULT '[]'::jsonb,              -- [{movieId, count}] 예매 클릭 상위 20
  views        JSONB NOT NULL DEFAULT '[]'::jsonb,              -- [{movieId, count}] 상세 조회 상위 20
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 읽기·쓰기 모두 서버(service role)만 한다 — 공개 정책을 두지 않는다
ALTER TABLE click_rankings ENABLE ROW LEVEL SECURITY;
