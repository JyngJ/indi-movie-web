-- 카카오 사용자 토큰 보관 — 카카오톡 "나에게 보내기"(talk_message) 알림 채널용 (P3 선행 실험, 2026-08-16).
-- Supabase SQL editor에서 실행.
--
-- 설계 메모
-- - 로그인 콜백(/auth/kakao/callback)에서 access/refresh 토큰을 service role로 upsert.
-- - 발송 시 서버가 refresh_token으로 access token을 갱신해서 카카오 API 호출.
--   카카오 refresh token은 약 2개월, 갱신 응답에 새 refresh_token이 오면 교체(만료 1개월 미만일 때 재발급).
-- - RLS: 클라이언트(anon/authenticated) 접근 전면 차단. service role만 읽고 쓴다.
-- - users 삭제(회원탈퇴) 시 cascade.

CREATE TABLE IF NOT EXISTS public.user_kakao_tokens (
  user_id                   UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  kakao_user_id             TEXT,                       -- 카카오 회원번호(id_token sub)
  access_token              TEXT NOT NULL,
  access_token_expires_at   TIMESTAMPTZ NOT NULL,
  refresh_token             TEXT NOT NULL,
  refresh_token_expires_at  TIMESTAMPTZ,
  scopes                    TEXT[] NOT NULL DEFAULT '{}',   -- 사용자가 실제 동의한 스코프 (talk_message 포함 여부 확인용)
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS user_kakao_tokens_set_updated_at ON public.user_kakao_tokens;
CREATE TRIGGER user_kakao_tokens_set_updated_at
  BEFORE UPDATE ON public.user_kakao_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_kakao_tokens ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = anon/authenticated 전부 거부. service role은 RLS를 우회한다.
