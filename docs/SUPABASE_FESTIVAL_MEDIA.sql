-- 영화제 이미지 컬럼 추가 — docs/SUPABASE_FESTIVALS.sql 이후 단계.
-- Supabase SQL 편집기에서 실행한다. 여러 번 실행해도 안전하다.
--
-- banner_url 하나로는 모양이 다른 이미지를 구분하지 못했다. 부산국제영화제 공식 포스터(세로 2:3)를
-- banner_url에 넣자 가로 배너 자리(상영작 탭 카드·상세 상단 띠·공유 이미지)에 세로 이미지가 들어갔고,
-- 화면 코드가 slug === 'biff31'로 예외를 처리했다. 모양별로 컬럼을 나눠 데이터가 레이아웃을 정하게 한다.
--
--   banner_url          가로 배너 (기존)
--   poster_url          세로 공식 포스터 — 있으면 상세 상단을 포스터 + 흰 패널로 그린다
--   shortcut_image_url  상영작 탭 바로가기 줄에 칩 대신 까는 가로 이미지
--
-- 값은 절대 URL 또는 사이트 루트 경로(/images/festivals/...)다.

ALTER TABLE festivals ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE festivals ADD COLUMN IF NOT EXISTS shortcut_image_url TEXT;
