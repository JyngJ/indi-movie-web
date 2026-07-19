-- ============================================================
-- 정동진독립영화제(jiff28) — 임시 데이터 INSERT
-- 이름은 '정동진독립영화제'(제28회 안 붙임)로 통일 — scripts/update-jeongdongjin-festival-copy.ts가
-- theater_events.title도 이미 이 이름으로 바꿔놨음(지도/상영작 탭 표시 이름 단일화).
-- Supabase 대시보드 SQL 에디터에서 실행. docs/SUPABASE_FESTIVALS.sql이
-- 먼저 적용돼 있어야 함(festivals 등 4개 테이블 생성).
--
-- 확인된 출처: issueedico(8/7~10, 27편), 위키(정동초 야외/무료),
--   siff.kr(철들 무렵=정승오 감독), issueedico(장편 2편=철들 무렵·공순이),
--   scripts/add-jeongdongjin-festival.ts(상영관 2곳: 정동초등학교 운동장
--   8/7~8/9, 강릉독립예술극장 신영 8/8~8/10 — 원래 초안이 신영 연결을 빠뜨렸어서
--   여기서 보강함)
--
-- ⚠️ 실행 전 반드시 확인:
--   1) theaters 테이블에 "정동초등학교 운동장" / "강릉독립예술극장 신영"이
--      실제 어떤 이름으로 들어있는지 (아래 ILIKE 패턴을 실제 값에 맞출 것)
--   2) '철들 무렵'/'공순이'가 movies 테이블에 있는지
--      (없으면 movie_id는 NULL로 들어가고 제목 스냅샷만 남음 — 정상 동작)
-- ============================================================

-- 1) 영화제 본체 -------------------------------------------------
INSERT INTO festivals (name, slug, start_date, end_date, region, city, venue_text, banner_url, link_url, description, is_active)
VALUES (
  '정동진독립영화제',
  'jiff28',
  '2026-08-07',
  '2026-08-10',
  '강원',
  '강릉',
  '정동초등학교 운동장 · 강릉독립예술극장 신영',  -- festivals.venue_text (헤더 요약 표기, 두 곳 다 반영)
  NULL,                            -- banner_url: 공식 배너 이미지 URL 확보되면 채울 것 (인스타 @jiff_kr)
  'http://jiff.kr/',
  '강릉 정동초등학교 운동장과 강릉독립예술극장 신영에서 열리는 독립영화제. 야외 상영(정동초)은 전 작품 무료. 올해 단편 25편·장편 2편 등 27편을 선보인다.',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
  region = EXCLUDED.region, city = EXCLUDED.city, venue_text = EXCLUDED.venue_text,
  link_url = EXCLUDED.link_url, description = EXCLUDED.description, is_active = EXCLUDED.is_active,
  updated_at = NOW();
-- ON CONFLICT: slug가 이미 있으면 갱신(재실행 안전). banner_url은 일부러 덮지 않음(수동 입력 보존).
-- updated_at은 sitemap.ts의 lastModified가 이 컬럼을 쓰는데 자동 갱신 트리거가 없어
-- 재실행 시 직접 NOW()로 갱신해줘야 함(안 하면 값이 그대로 굳어서 sitemap이 안 갱신됨).


-- 2) 상영관 연결 — 정동초등학교 운동장 + 강릉독립예술극장 신영 (2곳 모두) --
-- 케이스 A: theaters 테이블에 이미 있는 경우 — theater_id 연결.
-- 아래 ILIKE 패턴을 실제 등록된 이름에 맞게 조정할 것. 두 INSERT를 각각 실행.

-- 2a) 정동초등학교 운동장
INSERT INTO festival_theaters (festival_id, theater_id, venue_text, sort_order)
SELECT f.id, t.id, NULL, 0
FROM festivals f
CROSS JOIN LATERAL (
  SELECT id FROM theaters WHERE name ILIKE '%정동초등학교%' LIMIT 1
) t
WHERE f.slug = 'jiff28'
ON CONFLICT DO NOTHING;

-- 2b) 강릉독립예술극장 신영
INSERT INTO festival_theaters (festival_id, theater_id, venue_text, sort_order)
SELECT f.id, t.id, NULL, 1
FROM festivals f
CROSS JOIN LATERAL (
  SELECT id FROM theaters WHERE name ILIKE '%신영%' LIMIT 1
) t
WHERE f.slug = 'jiff28'
ON CONFLICT DO NOTHING;

-- 케이스 B: 위 둘 중 하나(또는 둘 다)가 theaters에 없어 매칭 실패했다면,
-- 그 상영관만 임시 상영장으로 등록. 먼저 아래로 결과 확인:
--   SELECT * FROM festival_theaters WHERE festival_id = (SELECT id FROM festivals WHERE slug='jiff28');
-- 2행이 아니면(둘 중 하나만 들어갔으면) 빠진 쪽을 이렇게 직접 추가:
-- INSERT INTO festival_theaters (festival_id, theater_id, venue_text, sort_order)
-- SELECT f.id, NULL, '<빠진 상영관 이름>', 1 FROM festivals f WHERE f.slug = 'jiff28';


-- 3) 장편 상영작 2편 연결 ---------------------------------------
-- movie_id가 매번 NULL로 잡히면(movies에 title 매칭이 안 되면) 재실행할 때마다
-- 중복 행이 쌓인다 — partial unique index(festival_id, movie_id)는 movie_id가
-- NULL인 행엔 안 걸리므로, movie_title_snapshot 기준 NOT EXISTS로 직접 막는다.
INSERT INTO festival_movies (festival_id, movie_id, movie_title_snapshot, sort_order)
SELECT f.id, (SELECT id FROM movies WHERE title = '철들 무렵' LIMIT 1), '철들 무렵', 0
FROM festivals f
WHERE f.slug = 'jiff28'
  AND NOT EXISTS (
    SELECT 1 FROM festival_movies fm WHERE fm.festival_id = f.id AND fm.movie_title_snapshot = '철들 무렵'
  );

INSERT INTO festival_movies (festival_id, movie_id, movie_title_snapshot, sort_order)
SELECT f.id, (SELECT id FROM movies WHERE title = '공순이' LIMIT 1), '공순이', 1
FROM festivals f
WHERE f.slug = 'jiff28'
  AND NOT EXISTS (
    SELECT 1 FROM festival_movies fm WHERE fm.festival_id = f.id AND fm.movie_title_snapshot = '공순이'
  );

-- 단편 24편: 공식 사이트(JS 렌더링)에서 자동 추출 실패 — jiff.kr / 인스타 @jiff_kr에서
-- 제목 확인 후 위와 같은 NOT EXISTS 패턴으로 추가(재실행 안전하게). movie_id는 대부분
-- NULL(단편이라 movies에 없을 것):
-- INSERT INTO festival_movies (festival_id, movie_id, movie_title_snapshot, sort_order)
-- SELECT f.id, NULL, '<단편 제목>', <순번>
-- FROM festivals f WHERE f.slug='jiff28'
--   AND NOT EXISTS (SELECT 1 FROM festival_movies fm WHERE fm.festival_id=f.id AND fm.movie_title_snapshot='<단편 제목>');


-- 4) 시간표 이미지 (선택) ---------------------------------------
-- 공식 타임테이블 이미지 URL 확보되면 추가. day_date별 여러 장 가능.
-- INSERT INTO festival_timetables (festival_id, image_url, day_date, label, sort_order)
-- SELECT f.id, '<이미지 URL>', '2026-08-07', NULL, 0 FROM festivals f WHERE f.slug='jiff28';


-- ============================================================
-- 실행 후 검증 쿼리:
--   SELECT slug, name, start_date, end_date, is_active FROM festivals WHERE slug='jiff28';
--   SELECT * FROM festival_theaters WHERE festival_id=(SELECT id FROM festivals WHERE slug='jiff28');
--     -- 2행이어야 함(정동초 + 신영)
--   SELECT movie_id, movie_title_snapshot FROM festival_movies WHERE festival_id=(SELECT id FROM festivals WHERE slug='jiff28');
-- 그 후 브라우저에서 /festival/jiff28 접속 → 상태 배지 확인. "D-N"은 시작일까지 7일
--   이내일 때만 뜨고, 그보다 멀면 "8월 7일 시작" 식으로 표시됨(src/lib/festival/status.ts).
-- ============================================================
