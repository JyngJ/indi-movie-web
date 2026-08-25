-- 관심(favorites) — 계정 P2. Supabase SQL editor에서 실행. (docs/DB.md 초안 확정본)
--
-- 설계 메모
-- - item_type 'movie' | 'theater' | 'director'. item_id는 영화·극장은 UUID 문자열, 감독은 이름(별도 테이블 없음).
--   폴리모픽이라 FK는 못 걸고 CHECK로 타입만 제한. (v2에서 item_id UUID→TEXT, director 추가 — 이미 적용했다면 SUPABASE_FAVORITES_V2.sql)
--   삭제된 영화/극장은 조회 시 join에서 빠지므로 클라이언트가 자연스럽게 무시한다.
-- - RLS: 본인 행만 select/insert/delete. update 없음(토글은 insert/delete).
-- - P3 알림 매칭 스크립트는 service role로 전체를 읽는다.

CREATE TABLE IF NOT EXISTS public.favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_type  TEXT NOT NULL CHECK (item_type IN ('movie', 'theater', 'director')),
  item_id    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT favorites_unique_user_item UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_item ON public.favorites(item_type, item_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
CREATE POLICY "favorites_select_own" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
CREATE POLICY "favorites_insert_own" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
CREATE POLICY "favorites_delete_own" ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);
