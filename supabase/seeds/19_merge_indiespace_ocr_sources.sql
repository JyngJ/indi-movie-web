-- 인디스페이스 수동(OCR) 수집처 중복 정리 — Supabase SQL 에디터에서 1회 실행 (2026-11-26 작성, 미적용)
--
-- 상황(2026-11-26 운영 DB 조회):
--   theaters                 인디스페이스 1건 (8a7e985b-4630-4b38-9d3f-27448071a309)
--   crawl_sources            ocr-인디스페이스  (ocr://admin,   2026-05-25 생성) → matched_theater_id = 위 극장
--                            ocr-indie-space   (ocr://discord, 2026-06-13 생성) → matched_theater_id = 위 극장
--   showtimes                theater_id 기준이라 수집처와 무관 — 이 스크립트가 건드리지 않는다
--   showtime_candidates      두 수집처 모두 0건
--   crawl_runs               두 수집처 모두 있음(업로드 기록 + 매일 0건 기록) — FK(crawl_runs_source_id_fkey)
--
-- 원인: 수집처 id를 OCR이 읽은 극장명으로 만들어서, 이미지의 영문 로고("indie space")를 읽은 업로드가
--       같은 극장의 새 수집처를 만들었다. 코드 쪽은 src/lib/crawl/ocrSource.ts(극장 먼저 찾기)로 막았다.
--
-- 정리 방향: 먼저 만든 ocr-인디스페이스로 모은다. 지우지 않고 끈다(되돌리기 쉽게).
--   1) 두 수집처가 같은 극장을 가리키는지 확인 — 아니면 중단
--   2) FK가 걸린 crawl_runs · showtime_candidates의 source_id를 옮긴다 (회차·업로드 기록 유실 없음)
--      showtime_candidates.theater_id도 수집처 id를 그대로 담고 있어 함께 옮긴다
--   3) ocr-indie-space를 끈다(enabled=false) — 매일 리포트에서 빠진다
--
-- 되돌리기: UPDATE crawl_sources SET enabled = true WHERE id = 'ocr-indie-space';
--           (옮긴 기록은 source_name 컬럼에 원래 이름 'indie space'가 남아 있어 골라낼 수 있다)

BEGIN;

DO $$
DECLARE
  keep_theater UUID;
  drop_theater UUID;
BEGIN
  SELECT matched_theater_id INTO keep_theater FROM crawl_sources WHERE id = 'ocr-인디스페이스' AND parser = 'ocr';
  SELECT matched_theater_id INTO drop_theater FROM crawl_sources WHERE id = 'ocr-indie-space' AND parser = 'ocr';
  IF keep_theater IS NULL OR drop_theater IS NULL THEN
    RAISE EXCEPTION '수집처가 없거나 극장 연결이 비어 있어요 — 중단 (keep=%, drop=%)', keep_theater, drop_theater;
  END IF;
  IF keep_theater <> drop_theater THEN
    RAISE EXCEPTION '두 수집처가 다른 극장을 가리켜요 — 중단 (keep=%, drop=%)', keep_theater, drop_theater;
  END IF;
END $$;

-- 옮기기 전 건수 (실행 결과에서 확인)
SELECT 'before' AS step, source_id, COUNT(*) AS runs FROM crawl_runs
 WHERE source_id IN ('ocr-인디스페이스', 'ocr-indie-space') GROUP BY source_id;
SELECT 'before' AS step, source_id, COUNT(*) AS candidates FROM showtime_candidates
 WHERE source_id IN ('ocr-인디스페이스', 'ocr-indie-space') GROUP BY source_id;

UPDATE crawl_runs
   SET source_id = 'ocr-인디스페이스'
 WHERE source_id = 'ocr-indie-space';

-- fingerprint는 옛 수집처 id로 만든 값 그대로 둔다(유일성 유지). 2026-11-26 기준 0건이다.
UPDATE showtime_candidates
   SET source_id = 'ocr-인디스페이스',
       theater_id = CASE WHEN theater_id = 'ocr-indie-space' THEN 'ocr-인디스페이스' ELSE theater_id END
 WHERE source_id = 'ocr-indie-space';

UPDATE crawl_sources
   SET enabled = false,
       notes = COALESCE(notes, '') || ' · 2026-11-26 ocr-인디스페이스로 통합(중복 수집처)',
       updated_at = NOW()
 WHERE id = 'ocr-indie-space';

-- 옮긴 뒤: ocr-indie-space 쪽은 0이어야 한다
SELECT 'after' AS step, source_id, COUNT(*) AS runs FROM crawl_runs
 WHERE source_id IN ('ocr-인디스페이스', 'ocr-indie-space') GROUP BY source_id;
SELECT 'after' AS step, id, enabled FROM crawl_sources WHERE id IN ('ocr-인디스페이스', 'ocr-indie-space');

COMMIT;
