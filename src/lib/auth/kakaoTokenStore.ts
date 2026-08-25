import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { kakaoEnv, refreshKakaoToken, type KakaoTokenResponse } from './kakao'

/**
 * user_kakao_tokens 저장소 — service role 전용 (RLS로 클라이언트 접근 차단됨). 서버에서만 import할 것.
 * 스키마: docs/SUPABASE_KAKAO_TOKENS.sql
 */

export interface KakaoTokenRow {
  user_id: string
  kakao_user_id: string | null
  access_token: string
  access_token_expires_at: string
  refresh_token: string
  refresh_token_expires_at: string | null
  scopes: string[]
}

const TABLE = 'user_kakao_tokens'

/** 로그인 콜백에서 호출 — 토큰 upsert. refresh_token이 안 왔으면(재로그인) 기존 값 유지 */
export async function saveKakaoTokens(userId: string, kakaoUserId: string | null, tok: KakaoTokenResponse) {
  const sb = createSupabaseAdminClient()
  const now = Date.now()
  const row: Partial<KakaoTokenRow> & { user_id: string } = {
    user_id: userId,
    kakao_user_id: kakaoUserId,
    access_token: tok.access_token,
    access_token_expires_at: new Date(now + tok.expires_in * 1000).toISOString(),
    scopes: (tok.scope ?? '').split(' ').filter(Boolean),
  }
  if (tok.refresh_token) {
    row.refresh_token = tok.refresh_token
    row.refresh_token_expires_at = tok.refresh_token_expires_in
      ? new Date(now + tok.refresh_token_expires_in * 1000).toISOString()
      : null
  }
  // refresh_token NOT NULL — 신규 행인데 refresh 없으면 insert 실패하므로 upsert 대신 분기
  if (!tok.refresh_token) {
    const { error } = await sb.from(TABLE).update(row).eq('user_id', userId)
    if (error) throw error
    return
  }
  const { error } = await sb.from(TABLE).upsert(row, { onConflict: 'user_id' })
  if (error) throw error
}

export async function getKakaoTokenRow(userId: string): Promise<KakaoTokenRow | null> {
  const sb = createSupabaseAdminClient()
  const { data, error } = await sb.from(TABLE).select('*').eq('user_id', userId).maybeSingle<KakaoTokenRow>()
  if (error) throw error
  return data
}

/** 유효한 access token 반환. 만료(또는 60초 내 만료)면 refresh 후 저장 */
export async function getValidKakaoAccessToken(userId: string): Promise<{ accessToken: string; scopes: string[] } | null> {
  const row = await getKakaoTokenRow(userId)
  if (!row) return null

  const expiresAt = new Date(row.access_token_expires_at).getTime()
  if (expiresAt - Date.now() > 60_000) return { accessToken: row.access_token, scopes: row.scopes }

  const { clientId, clientSecret } = kakaoEnv()
  const r = await refreshKakaoToken({ refreshToken: row.refresh_token, clientId, clientSecret })
  const now = Date.now()
  const patch: Partial<KakaoTokenRow> = {
    access_token: r.access_token,
    access_token_expires_at: new Date(now + r.expires_in * 1000).toISOString(),
  }
  if (r.refresh_token) {
    patch.refresh_token = r.refresh_token
    patch.refresh_token_expires_at = r.refresh_token_expires_in
      ? new Date(now + r.refresh_token_expires_in * 1000).toISOString()
      : null
  }
  const sb = createSupabaseAdminClient()
  const { error } = await sb.from(TABLE).update(patch).eq('user_id', userId)
  if (error) throw error
  return { accessToken: r.access_token, scopes: row.scopes }
}
