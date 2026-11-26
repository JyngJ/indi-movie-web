-- 동구영상미디어센터 수집처를 전용 파서(donggumcBoard)로 바꾼다 — Supabase SQL 에디터에서 1회 실행 (2026-11-26 작성, 미적용)
--
-- 상황(2026-11-26):
--   crawl_sources 9a697308-5c91-4c24-bc47-fb599e0631ed  parser = 'tableText'(범용)
--     listing_url = http://www.donggumc.kr/bbs/board.php?bo_table=6_1&me_code=60
--   crawl_runs  290회 중 수집 19회 — 전부 5월(마지막 2026-05-31), 그 뒤 매일 "완료 · 0건"
--     5월 수집은 수동 스크립트 scripts/crawl-gwangju.ts의 전용 정규식이 넣은 것. 매일 도는 크롤(run-all-sources)은
--     범용 파서라 게시판 3칸 표(상영일/상영시간/상영장소)를 한 건도 못 읽었다.
--   사이트는 정상: 한국 IP 브라우저에서 200, 11월 27일 "파이어하트"까지 올라와 있음(사용자 확인).
--
-- 코드: src/lib/admin/crawler/donggumc.ts (실제 마크업 픽스처 테스트 포함) — 이 PR이 배포된 뒤에 실행할 것.
--       배포 전에 실행하면 크롤러가 donggumcBoard를 몰라 범용 파서로 떨어진다(0건 유지, 오류는 아님).
--
-- 되돌리기: UPDATE crawl_sources SET parser = 'tableText' WHERE id = '9a697308-5c91-4c24-bc47-fb599e0631ed';

BEGIN;

-- 1) parser CHECK 제약에 donggumcBoard 추가 (2026-11-26 운영 제약 목록 + 새 값)
ALTER TABLE crawl_sources DROP CONSTRAINT IF EXISTS crawl_sources_parser_check;
ALTER TABLE crawl_sources ADD CONSTRAINT crawl_sources_parser_check CHECK (parser IN (
  'jsonLdEvent', 'tableText', 'timelineCard', 'dtryxReservationApi', 'movieeTicketApi', 'movielandProductOptions',
  'seoulArtTimetable', 'csv', 'selfHosted', 'ocr', 'tinyticketEventManager', 'petitecine', 'drfa', 'screenshotOcr',
  'boardImageOcr', 'kofaCinematheque', 'cineQApi', 'hdArtsCenter', 'donggumcBoard'
));

-- 2) 수집처 전환 — 지금 값이 예상과 같을 때만 바꾼다
UPDATE crawl_sources
   SET parser = 'donggumcBoard',
       notes = COALESCE(notes, '') || ' · 2026-11-26 전용 파서(donggumcBoard)로 전환',
       updated_at = NOW()
 WHERE id = '9a697308-5c91-4c24-bc47-fb599e0631ed'
   AND parser = 'tableText'
   AND listing_url = 'http://www.donggumc.kr/bbs/board.php?bo_table=6_1&me_code=60';

SELECT id, theater_name, parser, listing_url FROM crawl_sources WHERE id = '9a697308-5c91-4c24-bc47-fb599e0631ed';

COMMIT;
