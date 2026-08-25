-- 외부 이미지 URL http:// → https:// 일괄 승격 (2026-08-16)
--
-- 배경: movies.poster_url 1186/1255, directors.photo_url 212/441이 http:// 였다.
-- 사이트는 https라 브라우저가 mixed content로 차단 → 지도 포스터가 통째로 빈칸.
-- next/image를 타는 화면은 서버가 대신 받아와 안 깨져서 증상이 화면마다 달랐다.
-- 원본 호스트(file.koreafilm.or.kr)는 https로 같은 경로를 200으로 서빙한다.
--
-- 코드 쪽에도 읽기 시점 정규화(src/lib/media/imageUrl.ts)를 넣었으므로,
-- 이 마이그레이션은 재적용해도 안전하고(idempotent) 새 http 유입이 있어도 화면은 버틴다.

BEGIN;

UPDATE movies
   SET poster_url = 'https://' || substring(poster_url from 8)
 WHERE poster_url LIKE 'http://%';

UPDATE directors
   SET photo_url = 'https://' || substring(photo_url from 8)
 WHERE photo_url LIKE 'http://%';

-- 큐레이션/영화제 이미지 — 2026-08-16 기준 http 행 0건이지만, 같은 규칙을 걸어 둔다
UPDATE festivals
   SET banner_url = 'https://' || substring(banner_url from 8)
 WHERE banner_url LIKE 'http://%';

UPDATE festival_timetables
   SET image_url = 'https://' || substring(image_url from 8)
 WHERE image_url LIKE 'http://%';

UPDATE instagram_recommendations
   SET card_image_url = 'https://' || substring(card_image_url from 8)
 WHERE card_image_url LIKE 'http://%';

COMMIT;

-- 확인
-- SELECT count(*) FROM movies    WHERE poster_url    LIKE 'http://%';  -- 0이어야 함
-- SELECT count(*) FROM directors WHERE photo_url     LIKE 'http://%';  -- 0이어야 함
