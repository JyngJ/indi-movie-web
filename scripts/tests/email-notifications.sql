-- 분리된 테스트 DB에서만 실행. public.users 테이블과 anon/authenticated/service_role 역할 필요.
-- 먼저 docs/SUPABASE_EMAIL_NOTIFICATIONS.sql을 적용한다. 모든 테스트 변경은 롤백한다.
BEGIN;
INSERT INTO public.users(id) VALUES ('00000000-0000-0000-0000-000000000001');
DO $$
DECLARE uid uuid := '00000000-0000-0000-0000-000000000001'; rid uuid; did uuid := gen_random_uuid(); ok boolean;
BEGIN
  ok := public.request_email_notification_verification(uid, 'reader@example.com', 'hash1', 'test');
  IF NOT ok THEN RAISE EXCEPTION 'first registration rejected'; END IF;
  IF public.request_email_notification_verification(uid, 'other@example.com', 'hash2', 'test') THEN RAISE EXCEPTION 'cooldown bypassed'; END IF;
  IF public.verify_email_notification('wrong') THEN RAISE EXCEPTION 'invalid token accepted'; END IF;
  IF NOT public.verify_email_notification('hash1') THEN RAISE EXCEPTION 'verification failed'; END IF;
  UPDATE public.email_notification_subscriptions SET frequency_feedback='same' WHERE user_id=uid;
  IF public.verify_email_notification('hash1') THEN RAISE EXCEPTION 'token reused'; END IF;
  SELECT revision INTO rid FROM public.email_notification_subscriptions WHERE user_id=uid;
  INSERT INTO public.email_notification_deliveries(id,user_id,revision,slot,event_ids,message)
    VALUES(did,uid,rid,'2026-10-19','{}','{}');
  IF NOT public.claim_email_notification_delivery(did) THEN RAISE EXCEPTION 'claim failed'; END IF;
  IF public.claim_email_notification_delivery(did) THEN RAISE EXCEPTION 'double claim'; END IF;
  IF NOT public.complete_email_notification_delivery(did,'provider1') THEN RAISE EXCEPTION 'completion failed'; END IF;
  IF public.complete_email_notification_delivery(did,'provider1') THEN RAISE EXCEPTION 'double completion'; END IF;
  IF (SELECT sent_count FROM public.email_notification_subscriptions WHERE user_id=uid) <> 1 THEN RAISE EXCEPTION 'incorrect count'; END IF;
  -- 다른 배치에서도 불확실한 전송이 있는 사용자에게 다시 보내지 않는다.
  INSERT INTO public.email_notification_deliveries(user_id,revision,slot,event_ids,message,status)
    VALUES(uid,rid,'2026-10-23','{}','{}','unknown');
  did := gen_random_uuid();
  INSERT INTO public.email_notification_deliveries(id,user_id,revision,slot,event_ids,message)
    VALUES(did,uid,rid,'2026-10-26','{}','{}');
  IF public.claim_email_notification_delivery(did) THEN RAISE EXCEPTION 'unknown send did not block'; END IF;
  UPDATE public.email_notification_deliveries SET status='skipped' WHERE status='unknown';
  UPDATE public.email_notification_subscriptions SET status='unsubscribed', revision=gen_random_uuid() WHERE user_id=uid;
  IF public.claim_email_notification_delivery(did) THEN RAISE EXCEPTION 'revoked subscription sent'; END IF;
  UPDATE public.email_notification_subscriptions SET verification_requested_at=now()-interval '10 minutes' WHERE user_id=uid;
  IF NOT public.request_email_notification_verification(uid, 'new@example.com', 'expired', 'test') THEN RAISE EXCEPTION 'address change failed'; END IF;
  UPDATE public.email_notification_subscriptions SET verification_expires_at=now()-interval '1 second' WHERE user_id=uid;
  IF public.verify_email_notification('expired') THEN RAISE EXCEPTION 'expired verification accepted'; END IF;
  IF has_table_privilege('authenticated','public.email_notification_subscriptions','UPDATE') THEN RAISE EXCEPTION 'client can modify verification'; END IF;
  IF has_function_privilege('anon','public.verify_email_notification(text)','EXECUTE') THEN RAISE EXCEPTION 'anonymous verification rpc exposed'; END IF;
END $$;
ROLLBACK;
