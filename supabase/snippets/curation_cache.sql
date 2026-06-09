-- 큐레이션 캐시 테이블 — 최초 1회 Supabase SQL 에디터에서 실행
-- compute-curation.ts 스크립트(crawl:curation)가 매일 여기에 결과를 씁니다.

CREATE TABLE IF NOT EXISTS curation_cache (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  returning_films JSONB NOT NULL DEFAULT '[]'::jsonb,
  new_indie_films JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 초기 행 삽입 (upsert 대상이 존재해야 함)
INSERT INTO curation_cache (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS 활성화 + 공개 읽기 정책 (anon 키로 클라이언트가 읽을 수 있도록)
ALTER TABLE curation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read curation cache"
  ON curation_cache
  FOR SELECT
  USING (true);
