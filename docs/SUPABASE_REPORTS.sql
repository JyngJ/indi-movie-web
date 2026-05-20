-- Reports table for in-app feedback.
-- Run in Supabase SQL editor before enabling /api/reports.

CREATE TABLE IF NOT EXISTS reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category              TEXT NOT NULL,
  detail                TEXT NOT NULL,
  email                 TEXT,
  consent               BOOLEAN NOT NULL DEFAULT false,
  files                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  page_url              TEXT,
  selected_theater_id   UUID REFERENCES theaters(id) ON DELETE SET NULL,
  selected_theater_name TEXT,
  selected_movie_id     UUID REFERENCES movies(id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'pending',
  discord_message_id    TEXT,
  status_updated_at     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT reports_category_check CHECK (
    category IN ('영화관 추가 요청', '버그 제보', '데이터 수정', '불만 및 제안', '기타')
  ),
  CONSTRAINT reports_status_check CHECK (status IN ('pending', 'saved', 'deleted')),
  CONSTRAINT reports_detail_length_check CHECK (char_length(detail) BETWEEN 1 AND 500),
  CONSTRAINT reports_consent_check CHECK (consent = true)
);

CREATE INDEX IF NOT EXISTS idx_reports_status_created_at ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_selected_theater_id ON reports(selected_theater_id);
CREATE INDEX IF NOT EXISTS idx_reports_selected_movie_id ON reports(selected_movie_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_no_client_select" ON reports;
DROP POLICY IF EXISTS "reports_no_client_insert" ON reports;
DROP POLICY IF EXISTS "reports_no_client_update" ON reports;
DROP POLICY IF EXISTS "reports_no_client_delete" ON reports;

CREATE POLICY "reports_no_client_select" ON reports
  FOR SELECT
  USING (false);

CREATE POLICY "reports_no_client_insert" ON reports
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "reports_no_client_update" ON reports
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "reports_no_client_delete" ON reports
  FOR DELETE
  USING (false);

DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
