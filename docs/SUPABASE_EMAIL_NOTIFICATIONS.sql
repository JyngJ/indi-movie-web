-- 기존 SUPABASE_AUTH.sql·SUPABASE_NOTIFICATIONS.sql 적용 후 실행.
-- 모든 쓰기는 세션을 검증한 서버 또는 배치만 수행. 브라우저 직접 접근 금지.
CREATE TABLE IF NOT EXISTS public.email_notification_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email text,
  status text NOT NULL DEFAULT 'declined' CHECK (status IN ('declined','pending','active','unsubscribed','suppressed')),
  prompt_dismissed boolean NOT NULL DEFAULT false,
  revision uuid NOT NULL DEFAULT gen_random_uuid(),
  verification_hash text,
  verification_expires_at timestamptz,
  verification_requested_at timestamptz,
  consent_version text,
  subscribed_at timestamptz,
  revoked_at timestamptz,
  sent_count integer NOT NULL DEFAULT 0,
  frequency_feedback text CHECK (frequency_feedback IN ('more','same','less')),
  frequency_feedback_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status NOT IN ('active','pending') OR email IS NOT NULL)
);
-- 기존 스키마를 재적용할 때도 중립 응답을 허용한다.
ALTER TABLE public.email_notification_subscriptions DROP CONSTRAINT IF EXISTS email_notification_subscriptions_frequency_feedback_check;
ALTER TABLE public.email_notification_subscriptions ADD CONSTRAINT email_notification_subscriptions_frequency_feedback_check CHECK (frequency_feedback IN ('more','same','less'));
CREATE UNIQUE INDEX IF NOT EXISTS email_notification_verification_hash ON public.email_notification_subscriptions(verification_hash) WHERE verification_hash IS NOT NULL;
ALTER TABLE public.email_notification_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_notification_subscriptions FROM anon, authenticated;
GRANT ALL ON public.email_notification_subscriptions TO service_role;

CREATE TABLE IF NOT EXISTS public.email_notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  revision uuid NOT NULL,
  slot date NOT NULL,
  event_ids uuid[] NOT NULL,
  message jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','unknown','skipped')),
  attempts integer NOT NULL DEFAULT 0,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  UNIQUE(user_id, revision, slot)
);
ALTER TABLE public.email_notification_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_notification_deliveries FROM anon, authenticated;
GRANT ALL ON public.email_notification_deliveries TO service_role;

-- 행 잠금으로 사용자별 인증 메일 재요청 제한과 주소 변경을 함께 처리한다.
CREATE OR REPLACE FUNCTION public.request_email_notification_verification(p_user uuid, p_email text, p_hash text, p_consent text)
RETURNS boolean LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE s public.email_notification_subscriptions;
BEGIN
  INSERT INTO public.email_notification_subscriptions(user_id) VALUES(p_user) ON CONFLICT DO NOTHING;
  SELECT * INTO s FROM public.email_notification_subscriptions WHERE user_id=p_user FOR UPDATE;
  IF s.verification_requested_at > now() - interval '5 minutes' THEN RETURN false; END IF;
  UPDATE public.email_notification_subscriptions SET email=p_email, status='pending', prompt_dismissed=true,
    revision=gen_random_uuid(), verification_hash=p_hash, verification_expires_at=now()+interval '1 hour',
    verification_requested_at=now(), consent_version=p_consent, subscribed_at=NULL, sent_count=0,
    frequency_feedback=NULL, frequency_feedback_at=NULL, updated_at=now() WHERE user_id=p_user;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.verify_email_notification(p_hash text)
RETURNS boolean LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  UPDATE public.email_notification_subscriptions SET status='active', subscribed_at=now(), revoked_at=NULL,
    verification_hash=NULL, verification_expires_at=NULL, updated_at=now()
    WHERE verification_hash=p_hash AND status='pending' AND verification_expires_at > now();
  RETURN FOUND;
END $$;

-- 중복 실행 시 한 작업만 전송한다. sending 중 프로세스가 죽으면 자동 재전송하지 않는다.
CREATE OR REPLACE FUNCTION public.claim_email_notification_delivery(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  UPDATE public.email_notification_deliveries d SET status='sending', claimed_at=now(), attempts=attempts+1
  WHERE d.id=p_id AND d.status IN ('pending','failed') AND d.attempts<3
    AND d.created_at > now()-interval '12 hours'
    AND NOT EXISTS (SELECT 1 FROM public.email_notification_deliveries other WHERE other.user_id=d.user_id AND other.id<>d.id AND other.status IN ('sending','unknown'))
    AND EXISTS (SELECT 1 FROM public.email_notification_subscriptions s WHERE s.user_id=d.user_id AND s.revision=d.revision AND s.status='active');
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.complete_email_notification_delivery(p_id uuid, p_message_id text)
RETURNS boolean LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE d public.email_notification_deliveries;
BEGIN
  UPDATE public.email_notification_deliveries SET status='sent', provider_message_id=p_message_id, sent_at=now()
    WHERE id=p_id AND status='sending' RETURNING * INTO d;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.email_notification_subscriptions SET sent_count=sent_count+1, updated_at=now() WHERE user_id=d.user_id AND revision=d.revision;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.request_email_notification_verification(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_email_notification(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_email_notification_delivery(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_email_notification_delivery(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_email_notification_verification(uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_email_notification(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_email_notification_delivery(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_email_notification_delivery(uuid,text) TO service_role;
