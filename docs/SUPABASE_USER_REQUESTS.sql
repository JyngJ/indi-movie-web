-- User requests table for "추가 요청하기" (검색 결과 없음 → 영화/영화관/감독/기타 추가 요청).
-- Run in Supabase SQL editor before enabling /api/user-requests.

CREATE TABLE IF NOT EXISTS user_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind               TEXT NOT NULL,
  name               TEXT NOT NULL,
  note               TEXT,
  query              TEXT,
  status             TEXT NOT NULL DEFAULT 'pending',
  discord_message_id TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_requests_kind_check CHECK (kind IN ('movie', 'theater', 'director', 'etc')),
  CONSTRAINT user_requests_status_check CHECK (status IN ('pending', 'saved', 'deleted')),
  CONSTRAINT user_requests_name_length_check CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT user_requests_note_length_check CHECK (note IS NULL OR char_length(note) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_user_requests_status_created_at ON user_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_requests_kind ON user_requests(kind);

ALTER TABLE user_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_requests_no_client_select" ON user_requests;
DROP POLICY IF EXISTS "user_requests_no_client_insert" ON user_requests;
DROP POLICY IF EXISTS "user_requests_no_client_update" ON user_requests;
DROP POLICY IF EXISTS "user_requests_no_client_delete" ON user_requests;

CREATE POLICY "user_requests_no_client_select" ON user_requests
  FOR SELECT
  USING (false);

CREATE POLICY "user_requests_no_client_insert" ON user_requests
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "user_requests_no_client_update" ON user_requests
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "user_requests_no_client_delete" ON user_requests
  FOR DELETE
  USING (false);

DROP TRIGGER IF EXISTS trg_user_requests_updated_at ON user_requests;
CREATE TRIGGER trg_user_requests_updated_at
  BEFORE UPDATE ON user_requests
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
