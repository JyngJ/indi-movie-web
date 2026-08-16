-- favorites v2 — 감독 즐겨찾기 추가 (2026-08-16). SUPABASE_FAVORITES.sql 적용 후 실행.
-- 감독은 별도 테이블/UUID가 없고 이름이 키(/director/[name])라 item_id를 TEXT로 완화한다.
-- 영화·극장은 UUID 문자열을 그대로 넣는다.

ALTER TABLE public.favorites ALTER COLUMN item_id TYPE TEXT USING item_id::text;

ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_item_type_check;
ALTER TABLE public.favorites ADD CONSTRAINT favorites_item_type_check
  CHECK (item_type IN ('movie', 'theater', 'director'));
