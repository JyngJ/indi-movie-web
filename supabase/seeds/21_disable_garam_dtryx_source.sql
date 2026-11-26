-- 가람영화관(삼척영화관) dtryx 수집처 끄기 — Supabase SQL 에디터에서 1회 실행 (2026-11-26 작성, 미적용)
--
-- 근거:
--   crawl_runs  270회 중 수집 90회, 마지막 2026-06-30 04:00 UTC. 2026-06-30 16:00 UTC부터 매일 "완료 · 0건"
--   2026-11-26 한국 IP 브라우저 확인(사용자):
--     · samcheok.scinema.kr / samcheok.scinema.org 둘 다 200이지만 본문은 "현재 시스템 점검중 입니다" 페이지
--       (같은 브랜드 yanggu.scinema.kr 000034는 정상 — 브랜드 전체 장애 아님)
--     · samcheok.scinema.kr/reserve/main_list.do(BrandCd=scinema) CinemaList에 000026 없음,
--       이름에 '삼척'·'가람'이 든 항목도 0건 (MovieList 44편 · PlaySdtList 정상)
--     · 삼척시청 블로그(2026-02-24) · 스포츠경향(2026-07-09): 2026-07-01 삼척영화관이 빅브라더스 자체 발권 시스템으로 이전
--     · 극장은 정상 운영 중(11/26 6편 상영). 안내 홈페이지: https://www.samcheok.go.kr/00902.web
--   dtryx 크롤러는 목록에 없는 CinemaCd도 "가상 극장"으로 회차를 조회하므로(crawlDtryxReservationApi의 synthetic fallback)
--   오류 없이 0건으로 끝나 왔다. 파서를 고쳐도 회차가 나오지 않는다 — 예매처가 바뀐 것.
--
-- 처리: 수집처만 끈다(극장 theaters 행·지난 기록은 그대로). 꺼진 수집처는 소스 점검 리포트에서 빠진다.
-- 후속: 빅브라더스 예매 / 삼척시 홈페이지에서 시간표를 받는 새 수집처를 만든다(docs/RUNBOOK-crawler.md "예매처 이전").
-- 되돌리기: UPDATE crawl_sources SET enabled = true, health = 'healthy' WHERE id = 'f7da1d01-a4c1-4229-a963-a60e324f9393';

BEGIN;

UPDATE crawl_sources
   SET enabled = false,
       health = 'broken',
       notes = COALESCE(notes, '') || ' · 2026-11-26 끔: 2026-07-01 빅브라더스 자체 발권으로 예매처 이전(dtryx CinemaList에서 000026 빠짐)',
       updated_at = NOW()
 WHERE id = 'f7da1d01-a4c1-4229-a963-a60e324f9393'
   AND parser = 'dtryxReservationApi';

SELECT id, theater_name, parser, enabled, health FROM crawl_sources WHERE id = 'f7da1d01-a4c1-4229-a963-a60e324f9393';

COMMIT;
