-- 계정 시스템 P1 — public.users + auth.users 동기화 트리거 + RLS.
-- Supabase SQL editor에서 실행. (docs/DB.md "users" 초안을 실제 스키마로 확정한 것)
--
-- 설계 메모
-- - id = auth.users.id. 로그인 제공자(카카오/구글) 정보는 auth.users.raw_app_meta_data / identities에 있고
--   여기엔 앱이 쓰는 표시용 프로필만 둔다.
-- - email은 nullable: 카카오는 비즈앱이 아니면 이메일 동의항목을 못 켜서 이메일 없이 가입된다.
--   알림용 이메일은 P3에서 별도 컬럼(notification_email)로 받는다.
-- - 회원탈퇴는 auth.users를 지우면 ON DELETE CASCADE로 같이 지워진다.

CREATE TABLE IF NOT EXISTS public.users (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT,
  display_name   TEXT,
  avatar_url     TEXT,
  preferred_city TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_display_name_length_check CHECK (
    display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 30
  )
);

-- auth.users insert 시 public.users 자동 생성.
-- 카카오: raw_user_meta_data.name / nickname / preferred_username, avatar_url / picture 중 있는 것.
-- 구글:   raw_user_meta_data.name / full_name, avatar_url / picture.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'nickname',
      NEW.raw_user_meta_data ->> 'preferred_username',
      NEW.raw_user_meta_data ->> 'full_name'
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: 본인 행만 읽기/수정. insert는 트리거(SECURITY DEFINER)가 하므로 정책 불필요. delete는 auth cascade.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 회원탈퇴: 클라이언트는 auth.users를 못 지우므로 본인 삭제 RPC.
-- SECURITY DEFINER로 auth.users에서 본인 행 삭제 → public.users는 cascade.
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
