-- ============================================================
-- 인스타그램 추천 카드 4개 — 임시 데이터 INSERT
-- Supabase 대시보드 SQL 에디터에서 실행. docs/SUPABASE_INSTAGRAM_RECS.sql이
-- 먼저 적용돼 있어야 함(instagram_recommendations + instagram_recommendation_movies 생성).
--
-- card_image_url 4개는 scripts/upload-instagram-card-images.ts로 Supabase Storage
-- "instagram-cards" 버킷(신규 생성, public)에 업로드 완료 — 실제 URL로 채워져 있음.
--
-- 각 INSERT는 title_snapshot을 키로 NOT EXISTS 가드를 걸어 재실행해도 중복 안 생김.
-- movie_id는 movies.title 정확매칭 — 안 맞으면 NULL로 들어가고 title_snapshot만
-- 남는다(정상 동작, festival_movies와 같은 원칙). 나중에
--   SELECT id, title FROM movies WHERE title ILIKE '%키워드%';
-- 로 실제 제목 확인 후 인스타그램_recommendation_movies.movie_id를 UPDATE하면 됨.
-- ============================================================

-- ── 1) 해피엔드 (1편, sort_order 0) ─────────────────────────────
INSERT INTO instagram_recommendations
  (target_type, title_snapshot, card_image_url, instagram_url, sort_order)
SELECT 'movie', '해피엔드', 'https://pkmgloiixwvhitqpcfyc.supabase.co/storage/v1/object/public/instagram-cards/happy-end.jpg',
  'https://www.instagram.com/p/DafBZSek0uz/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==', 0
WHERE NOT EXISTS (SELECT 1 FROM instagram_recommendations WHERE title_snapshot = '해피엔드');

INSERT INTO instagram_recommendation_movies (instagram_recommendation_id, movie_id, title_snapshot, sort_order)
SELECT r.id, (SELECT id FROM movies WHERE title = '해피엔드' LIMIT 1), '해피엔드', 0
FROM instagram_recommendations r
WHERE r.title_snapshot = '해피엔드'
  AND NOT EXISTS (
    SELECT 1 FROM instagram_recommendation_movies m
    WHERE m.instagram_recommendation_id = r.id AND m.title_snapshot = '해피엔드'
  );

-- ── 2) 백룸 (1편, sort_order 1) ──────────────────────────────────
INSERT INTO instagram_recommendations
  (target_type, title_snapshot, card_image_url, instagram_url, sort_order)
SELECT 'movie', '백룸', 'https://pkmgloiixwvhitqpcfyc.supabase.co/storage/v1/object/public/instagram-cards/the-back-room.jpg',
  'https://www.instagram.com/p/DaxBgqmk9q1/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==', 1
WHERE NOT EXISTS (SELECT 1 FROM instagram_recommendations WHERE title_snapshot = '백룸');

INSERT INTO instagram_recommendation_movies (instagram_recommendation_id, movie_id, title_snapshot, sort_order)
SELECT r.id, (SELECT id FROM movies WHERE title = '백룸' LIMIT 1), '백룸', 0
FROM instagram_recommendations r
WHERE r.title_snapshot = '백룸'
  AND NOT EXISTS (
    SELECT 1 FROM instagram_recommendation_movies m
    WHERE m.instagram_recommendation_id = r.id AND m.title_snapshot = '백룸'
  );

-- ── 3) 자려고 누웠는데 특별 상영전 (14편, sort_order 2, 8월까지만 노출) ──
-- "얜 해도 8월까지만 보여줘" → display_until = 2026-08-31. 인스타 링크는 안 받아서
-- NULL(클릭 시 자동으로 프로필 https://www.instagram.com/indi.movie.map/ 로 폴백).
INSERT INTO instagram_recommendations
  (target_type, title_snapshot, card_image_url, instagram_url, display_until, sort_order)
SELECT 'movie', '자려고 누웠는데 특별 상영전', 'https://pkmgloiixwvhitqpcfyc.supabase.co/storage/v1/object/public/instagram-cards/bacurau-and-more.jpg', NULL, '2026-08-31', 2
WHERE NOT EXISTS (SELECT 1 FROM instagram_recommendations WHERE title_snapshot = '자려고 누웠는데 특별 상영전');

INSERT INTO instagram_recommendation_movies (instagram_recommendation_id, movie_id, title_snapshot, sort_order)
SELECT r.id, (SELECT id FROM movies WHERE title = t.title LIMIT 1), t.title, t.ord
FROM instagram_recommendations r
CROSS JOIN (VALUES
  ('바쿠라우', 0), ('콜드워', 1), ('믹의 지름길', 2), ('러브라이프', 3),
  ('R.M.N.', 4), ('레네트와 미라벨의 네가지 모험', 5), ('봄 이야기', 6), ('여름 이야기', 7),
  ('싸이보그지만 괜찮아', 8), ('신경쇠약 직전의 여자', 9), ('그녀에게', 10), ('나쁜 교육', 11),
  ('귀향', 12), ('브로큰 임브레이스', 13)
) AS t(title, ord)
WHERE r.title_snapshot = '자려고 누웠는데 특별 상영전'
  AND NOT EXISTS (
    SELECT 1 FROM instagram_recommendation_movies m
    WHERE m.instagram_recommendation_id = r.id AND m.title_snapshot = t.title
  );

-- ── 4) 탁구장에서 누가 돌아왔게? — 2026년 7월 상영작 모음 (7편, sort_order 3) ──
-- display_until 언급 없어서 무기한(NULL)으로 둠 — 필요하면 UPDATE로 나중에 채울 것.
INSERT INTO instagram_recommendations
  (target_type, title_snapshot, card_image_url, instagram_url, sort_order)
SELECT 'movie', '2026년 7월 상영작 모음(마티 슈프림 외 6편)', 'https://pkmgloiixwvhitqpcfyc.supabase.co/storage/v1/object/public/instagram-cards/marty-supreme-and-more.jpg',
  'https://www.instagram.com/p/DamfN_lk67Y/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==', 3
WHERE NOT EXISTS (SELECT 1 FROM instagram_recommendations WHERE title_snapshot = '2026년 7월 상영작 모음(마티 슈프림 외 6편)');

INSERT INTO instagram_recommendation_movies (instagram_recommendation_id, movie_id, title_snapshot, sort_order)
SELECT r.id, (SELECT id FROM movies WHERE title = t.title LIMIT 1), t.title, t.ord
FROM instagram_recommendations r
CROSS JOIN (VALUES
  ('마티 슈프림', 0), ('피아노', 1), ('퍼시픽션', 2), ('하나코리아', 3),
  ('시크릿에이전트', 4), ('경멸', 5), ('지느러미', 6)
) AS t(title, ord)
WHERE r.title_snapshot = '2026년 7월 상영작 모음(마티 슈프림 외 6편)'
  AND NOT EXISTS (
    SELECT 1 FROM instagram_recommendation_movies m
    WHERE m.instagram_recommendation_id = r.id AND m.title_snapshot = t.title
  );

-- ============================================================
-- 실행 후 검증 쿼리:
--   SELECT title_snapshot, display_until, sort_order FROM instagram_recommendations ORDER BY sort_order;
--   SELECT r.title_snapshot AS card, m.title_snapshot AS movie, m.movie_id
--   FROM instagram_recommendation_movies m JOIN instagram_recommendations r ON r.id = m.instagram_recommendation_id
--   ORDER BY r.sort_order, m.sort_order;
--   -- movie_id가 NULL인 행이 있으면 movies.title과 정확히 안 맞은 것 — ILIKE로 실제 제목 확인 후
--   -- UPDATE instagram_recommendation_movies SET movie_id = '<실제 id>' WHERE id = '<이 행 id>';
-- ============================================================
