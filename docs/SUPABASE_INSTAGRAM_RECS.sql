-- Instagram recommendations schema
-- Step 1: Run this in the Supabase SQL editor.
-- Creates: instagram_recommendations, instagram_recommendation_movies
--
-- 인스타그램 카드뉴스로 소개한 영화(1편 또는 여러 편)/영화제를 상영작 탭 섹션
-- ("인스타그램에서 추천한 그 영화")에 연결하기 위한 다형(polymorphic) 테이블.
-- 상태(상영중/진행중 등)는 저장하지 않고 movies/festivals를 조인해 런타임
-- 조회한다(festivals와 같은 원칙 — docs/SUPABASE_FESTIVALS.sql 참고).
--
-- movie_id를 이 테이블에 직접 안 두고 별도 조인 테이블로 뺀 이유: 한 카드뉴스가
-- 여러 편을 소개하는 경우(특별전 포스트 등)가 실제로 있어서 — 1편이든 N편이든
-- instagram_recommendation_movies에 행이 1개 이상 있는 형태로 통일한다.

CREATE TABLE IF NOT EXISTS instagram_recommendations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type    TEXT NOT NULL CHECK (target_type IN ('movie', 'festival')),
  festival_id    UUID REFERENCES festivals(id) ON DELETE SET NULL,    -- target_type='festival'일 때만 사용
  title_snapshot TEXT NOT NULL,        -- 카드 대표 타이틀(영화 1편이면 그 제목, 여러 편이면 상영전 이름 등)
  card_image_url TEXT NOT NULL,        -- 카드뉴스 첫 장 이미지(왼쪽 배경, 오른쪽으로 opacity fade 대상)
  instagram_url  TEXT,                 -- 원본 게시물 링크(선택) — 여러 편 카드 클릭 시 기본 목적지로도 씀
  published_at   DATE,                 -- 인스타 게시일(정렬 보조 — sort_order 다음 우선순위)
  display_until  DATE,                 -- 노출 종료일(포함). NULL이면 무기한 — is_active를 안 건드려도 지나면 자동으로 숨김
  is_active      BOOLEAN NOT NULL DEFAULT true,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insta_recs_active ON instagram_recommendations(is_active, sort_order);

-- movie 타입 행에 festival_id가 잘못 딸려있는 것만 막는다(festival_id는 festival 전용).
-- festival_id를 NOT NULL로 강제하진 않음 — festivals 행이 나중에 삭제(SET NULL)돼도
-- 이 행 자체는 title_snapshot으로 계속 표시돼야 하기 때문(festival_movies와 같은 원칙).
ALTER TABLE instagram_recommendations
  ADD CONSTRAINT chk_insta_target CHECK (
    target_type <> 'movie' OR festival_id IS NULL
  );

ALTER TABLE instagram_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active insta recs" ON instagram_recommendations
  FOR SELECT USING (is_active = true);

-- ── instagram_recommendation_movies ────────────────────────────────────────
-- target_type='movie'인 카드가 참조하는 영화 목록(1편 이상). festival 카드는 이 테이블에
-- 행을 안 둔다.

CREATE TABLE IF NOT EXISTS instagram_recommendation_movies (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_recommendation_id  UUID NOT NULL REFERENCES instagram_recommendations(id) ON DELETE CASCADE,
  movie_id                     UUID REFERENCES movies(id) ON DELETE SET NULL,  -- 크롤 데이터 삭제 시 SET NULL
  title_snapshot               TEXT NOT NULL,  -- movie_id가 NULL이 돼도 제목은 남긴다
  sort_order                   INT NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_insta_rec_movie_uniq
  ON instagram_recommendation_movies(instagram_recommendation_id, movie_id) WHERE movie_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insta_rec_movie_rec ON instagram_recommendation_movies(instagram_recommendation_id, sort_order);

ALTER TABLE instagram_recommendation_movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read insta rec movies of active recs" ON instagram_recommendation_movies
  FOR SELECT USING (
    instagram_recommendation_id IN (SELECT id FROM instagram_recommendations WHERE is_active = true)
  );
