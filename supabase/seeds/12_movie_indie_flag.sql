-- 독립영화 여부 + Cine21 ID 컬럼 추가
-- is_indie: true=독립, false=비독립, null=미분류(랭킹 제외)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS is_indie BOOLEAN;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS cine21_id TEXT;

-- 명확히 비독립인 영화 수동 마킹 (토이스토리 등 멀티플렉스 블록버스터)
UPDATE movies SET is_indie = false WHERE title IN (
  '토이 스토리 5',
  '토이스토리 5'
);
