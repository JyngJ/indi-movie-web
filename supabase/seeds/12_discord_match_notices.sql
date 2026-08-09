-- 동명 영화 매칭 검수 Discord 알림 dedup (2026-08-09)
-- 문제: 자동매칭이 애매(동명) 그룹을 감지하면 Discord로 검수 요청을 보내는데,
--       "이미 알림" 판정을 후보 행의 '동명 영화' 경고로 하고 있어 크롤마다
--       새 후보 행(새 fingerprint)이 생기면 같은 제목이 반복 게시됐다.
-- 해결: 제목 해시 단위 영구 기록. 한 번 알린 제목은 다시 보내지 않는다.
--       (버튼으로 매칭을 확정하면 이후엔 애매 판정 자체가 사라짐.
--        재알림이 필요하면 이 테이블에서 해당 행을 지우면 된다.)
-- 실행: Supabase SQL Editor에서 이 파일 내용 실행.

CREATE TABLE IF NOT EXISTS discord_match_notices (
  title_hash TEXT PRIMARY KEY,   -- matchReviewDiscord.titleHash(제목) — sha1 12자
  title      TEXT NOT NULL,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE discord_match_notices ENABLE ROW LEVEL SECURITY;
-- service role만 접근 (클라이언트 노출 불필요) — 정책 없음 = anon 차단
