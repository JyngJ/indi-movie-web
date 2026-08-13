-- movies.runtime(분) 컬럼 추가 — Supabase SQL 에디터에서 실행
-- 실행 후 `npx tsx --env-file=.env.local scripts/backfill-runtime.ts` 로 KMDB 백필.
-- 러닝타임 기반 큐레이션 섹션(100분 이내 / 3시간 이상)의 선행 작업.

ALTER TABLE movies ADD COLUMN IF NOT EXISTS runtime integer;

COMMENT ON COLUMN movies.runtime IS '러닝타임(분) — KMDB 백필, 신규 임포트 시 함께 저장';
