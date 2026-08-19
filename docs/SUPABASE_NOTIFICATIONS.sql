-- 알림(P3) — 관심 대상에 새 상영·막바지가 생기면 소식 탭에 쌓고, 나중에 카톡으로 보낸다.
-- Supabase SQL editor에서 실행. SUPABASE_FAVORITES.sql / _V2.sql 적용 후.
--
-- 설계 메모
-- - 테이블 3개: 설정(prefs) / 이벤트(events) / 발송이력(deliveries).
-- - events가 소식 탭의 데이터 소스이자 중복 방지 키다. 크론이 하루 3번 도는데
--   dedupe_key UNIQUE가 없으면 같은 소식이 3번 쌓인다.
-- - 발송은 아직 껐다(P3-b는 UI·파이프라인까지, 실제 카톡 전송은 뒤로).
--   그래서 deliveries.status에 'skipped'와 사유가 남는다.
-- - 생성·발송은 service role 스크립트가 한다. RLS는 사용자 읽기/설정 변경만 연다.

/* ── 1. 알림 설정 ─────────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id        UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  -- 종류별 on/off
  new_screening  BOOLEAN NOT NULL DEFAULT TRUE,   -- 관심 영화·감독·극장에 새 상영
  last_week      BOOLEAN NOT NULL DEFAULT TRUE,   -- 관심 작품 막바지 상영
  weekly_digest  BOOLEAN NOT NULL DEFAULT FALSE,  -- 주간 다이제스트 (P3-c)
  -- 수신 시간대 — 이 구간에는 발송하지 않고 다음 허용 시각으로 미룬다 (KST 기준)
  quiet_start    TIME NOT NULL DEFAULT '21:00',
  quiet_end      TIME NOT NULL DEFAULT '09:00',
  channel        TEXT NOT NULL DEFAULT 'kakao' CHECK (channel IN ('kakao', 'none')),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_prefs_select_own" ON public.notification_prefs;
CREATE POLICY "notification_prefs_select_own" ON public.notification_prefs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_prefs_upsert_own" ON public.notification_prefs;
CREATE POLICY "notification_prefs_upsert_own" ON public.notification_prefs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_prefs_update_own" ON public.notification_prefs;
CREATE POLICY "notification_prefs_update_own" ON public.notification_prefs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

/* ── 2. 알림 이벤트 (소식 탭 소스) ──────────────────────────────── */
CREATE TABLE IF NOT EXISTS public.notification_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('new_screening', 'last_week', 'weekly_digest')),
  -- 어떤 관심 때문에 걸렸는지 (영화 하트 / 감독 하트 / 극장 하트)
  subject_type TEXT NOT NULL CHECK (subject_type IN ('movie', 'director', 'theater')),
  subject_id   TEXT NOT NULL,
  movie_id     UUID REFERENCES public.movies(id) ON DELETE CASCADE,
  theater_id   UUID REFERENCES public.theaters(id) ON DELETE CASCADE,
  -- 카드 렌더용 스냅샷(제목·감독·포스터·극장명·상영일). 원본이 지워져도 소식은 남는다.
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- user:kind:movie:theater:주차 — 크론 재실행/다음 회차에 같은 소식이 또 쌓이는 걸 막는다
  dedupe_key   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at      TIMESTAMPTZ,

  CONSTRAINT notification_events_dedupe UNIQUE (user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_events_user_created
  ON public.notification_events(user_id, created_at DESC);
-- 발송 대기분 조회 — 아직 delivery가 없는 이벤트를 찾을 때
CREATE INDEX IF NOT EXISTS idx_notification_events_kind ON public.notification_events(kind);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_events_select_own" ON public.notification_events;
CREATE POLICY "notification_events_select_own" ON public.notification_events
  FOR SELECT USING (auth.uid() = user_id);

-- 읽음 표시만 사용자에게 연다. 생성/삭제는 service role 전용.
DROP POLICY IF EXISTS "notification_events_update_own" ON public.notification_events;
CREATE POLICY "notification_events_update_own" ON public.notification_events
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

/* ── 3. 발송 이력 ──────────────────────────────────────────────── */
-- 한 번의 발송이 이벤트 여러 개를 묶는다(사용자당 1건으로 묶어 보내야 카톡이 도배되지 않음).
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_ids  UUID[] NOT NULL DEFAULT '{}',
  channel    TEXT NOT NULL DEFAULT 'kakao',
  status     TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  -- skipped 사유: 'sending_disabled' | 'quiet_hours' | 'no_kakao_token' | 'scope_missing' | 'prefs_off'
  skip_reason TEXT,
  attempts   SMALLINT NOT NULL DEFAULT 0,
  error      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user
  ON public.notification_deliveries(user_id, created_at DESC);
-- 재시도 대상 조회
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_retry
  ON public.notification_deliveries(status, attempts) WHERE status IN ('pending', 'failed');

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
-- 사용자 노출 없음 — service role만. (정책 없이 RLS만 켜면 익명·인증 모두 차단된다)
