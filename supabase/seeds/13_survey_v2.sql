-- 재방문 설문 v2 (2026-08-09) — 플로우 개편: 잘 쓰고 계세요?(verdict) → 좋은 점 | 아쉬운 점
-- 주관식(improvement) 단계는 제거됐지만 컬럼은 과거 응답 보존을 위해 유지.
-- 실행: Supabase SQL Editor에서 실행 (12_discord_match_notices.sql과 함께).

ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS verdict TEXT;             -- 'good' | 'bad'
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS bad_point TEXT;           -- csv (good_point와 동일 형식)
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS movie_missing_text TEXT;  -- '찾는 영화가 없어요' 후속 입력
