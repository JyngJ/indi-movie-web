-- 큐레이션 컨펌 대기 테이블 — compute-curation 스크립트가 쓰고, Discord 버튼 컨펌 후 curation_cache로 이동
CREATE TABLE IF NOT EXISTS curation_pending (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  returning_films JSONB NOT NULL DEFAULT '[]'::jsonb,
  new_indie_films JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO curation_pending (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE curation_pending ENABLE ROW LEVEL SECURITY;
-- 읽기는 서비스 롤(admin)만 허용 — 일반 클라이언트는 접근 불가
