-- Instagram recommendations schema
-- Step 1: Run this in the Supabase SQL editor.
-- Creates: instagram_recommendations
--
-- 인스타그램 카드뉴스로 소개한 영화/영화제를 상영작 탭 섹션("인스타그램에서
-- 추천한 그 영화")에 연결하기 위한 다형(polymorphic) 테이블. 상태(상영중/진행중
-- 등)는 저장하지 않고 movies/festivals를 조인해 런타임 조회한다(festivals와
-- 같은 원칙 — docs/SUPABASE_FESTIVALS.sql 참고).

CREATE TABLE IF NOT EXISTS instagram_recommendations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type    TEXT NOT NULL CHECK (target_type IN ('movie', 'festival')),
  movie_id       UUID REFERENCES movies(id) ON DELETE SET NULL,       -- target_type='movie'일 때만 사용
  festival_id    UUID REFERENCES festivals(id) ON DELETE SET NULL,    -- target_type='festival'일 때만 사용
  title_snapshot TEXT NOT NULL,        -- 영화/영화제 이름 폴백 — movie_id/festival_id가 SET NULL 돼도 제목은 남긴다
  card_image_url TEXT NOT NULL,        -- 카드뉴스 첫 장 이미지(왼쪽 배경, 오른쪽으로 opacity fade 대상)
  instagram_url  TEXT,                 -- 원본 게시물 링크(선택) — 연결 끊김 폴백 CTA로 사용
  published_at   DATE,                 -- 인스타 게시일(정렬 보조 — sort_order 다음 우선순위)
  is_active      BOOLEAN NOT NULL DEFAULT true,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insta_recs_active ON instagram_recommendations(is_active, sort_order);

-- target_type과 실제 FK 정합성 보장 — movie면 festival_id는 반드시 NULL, festival이면 movie_id는 반드시 NULL.
-- (movie_id/festival_id 둘 다 NULL인 건 허용 — SET NULL로 연결이 끊긴 이후의 정상 상태, title_snapshot으로 폴백)
ALTER TABLE instagram_recommendations
  ADD CONSTRAINT chk_insta_target CHECK (
    (target_type = 'movie'    AND festival_id IS NULL) OR
    (target_type = 'festival' AND movie_id    IS NULL)
  );

ALTER TABLE instagram_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active insta recs" ON instagram_recommendations
  FOR SELECT USING (is_active = true);
