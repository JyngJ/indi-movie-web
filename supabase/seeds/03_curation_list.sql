-- 영화 탭 큐레이션 리스트 — 최초 1회 Supabase SQL 에디터에서 실행
-- docs/FILMS_TAB_PLAN.md §4, §6 참고. 구현 2: Phase 1 dynamic 리스트 seed.

CREATE TABLE IF NOT EXISTS curation_list (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id        TEXT UNIQUE NOT NULL,
  name_ko        TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('dynamic', 'static')),
  query          JSONB,
  member_ids     JSONB,
  priority_tier  SMALLINT NOT NULL CHECK (priority_tier IN (1, 2, 3)),
  season_trigger JSONB,
  min_n          SMALLINT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 활성화 + 공개 읽기 정책 (anon 키로 클라이언트가 읽을 수 있도록)
ALTER TABLE curation_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read curation list"
  ON curation_list
  FOR SELECT
  USING (true);

-- Phase 1 dynamic 리스트 (genre/year 기반, 노동 0)
-- query.genre: movies.genre[]와 하나 이상 겹치면 매치
-- query.yearRange: [start, end] (movies.year 포함 범위)
INSERT INTO curation_list (list_id, name_ko, type, query, priority_tier, season_trigger, min_n)
VALUES
  (
    'summer_horror', '여름엔 역시 공포', 'dynamic',
    '{"genre": ["공포", "공포(호러)"]}'::jsonb,
    3, '{"start": "07-01", "end": "08-31"}'::jsonb, NULL
  ),
  (
    'valentine_romance', '발렌타인엔 멜로', 'dynamic',
    '{"genre": ["멜로/로맨스", "멜로드라마"]}'::jsonb,
    3, '{"start": "02-01", "end": "02-28"}'::jsonb, NULL
  ),
  (
    'decade_90s', '90년대 영화', 'dynamic',
    '{"yearRange": [1990, 1999]}'::jsonb,
    1, NULL, NULL
  ),
  (
    'decade_00s', '00년대 영화', 'dynamic',
    '{"yearRange": [2000, 2009]}'::jsonb,
    1, NULL, NULL
  )
ON CONFLICT (list_id) DO NOTHING;
