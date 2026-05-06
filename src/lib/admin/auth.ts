import { cookies } from 'next/headers'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const ADMIN_SESSION_COOKIE = 'indi_admin_access_token'

export interface AdminSessionUser {
  id: string
  email?: string
  role: 'admin'
}

interface AdminUserRow {
  user_id: string
  role: string
  is_active: boolean
}

export class AdminAuthError extends Error {
  constructor(
    public readonly code: 'UNAUTHENTICATED' | 'FORBIDDEN',
    message: string,
  ) {
    super(message)
  }
}

export async function getAdminSessionUser(request?: Request): Promise<AdminSessionUser | null> {
  const token = await readAccessToken(request)
  if (!token) return null

  const supabase = createSupabaseAdminClient()
  const { data: userData, error: userError } = await supabase.auth.getUser(token)

  if (userError || !userData.user) return null

  const admin = await findActiveAdminUser(userData.user.id)
  if (!admin) return null

  return {
    id: userData.user.id,
    email: userData.user.email,
    role: 'admin',
  }
}

export async function requireAdminSessionUser(request?: Request): Promise<AdminSessionUser> {
  const token = await readAccessToken(request)
  if (!token) {
    throw new AdminAuthError('UNAUTHENTICATED', '관리자 로그인이 필요합니다.')
  }

  const supabase = createSupabaseAdminClient()
  const { data: userData, error: userError } = await supabase.auth.getUser(token)

  if (userError || !userData.user) {
    throw new AdminAuthError('UNAUTHENTICATED', '관리자 세션이 만료되었거나 유효하지 않습니다.')
  }

  const admin = await findActiveAdminUser(userData.user.id)
  if (!admin) {
    throw new AdminAuthError('FORBIDDEN', '관리자 권한이 없습니다.')
  }

  return {
    id: userData.user.id,
    email: userData.user.email,
    role: 'admin',
  }
}

export async function verifyAdminAccessToken(accessToken: string): Promise<AdminSessionUser> {
  const supabase = createSupabaseAdminClient()
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken)

  if (userError || !userData.user) {
    throw new AdminAuthError('UNAUTHENTICATED', 'Supabase 인증 토큰이 유효하지 않습니다.')
  }

  const admin = await findActiveAdminUser(userData.user.id)
  if (!admin) {
    throw new AdminAuthError('FORBIDDEN', '관리자 권한이 없습니다.')
  }

  return {
    id: userData.user.id,
    email: userData.user.email,
    role: 'admin',
  }
}

export function adminAuthErrorResponse(error: unknown) {
  if (error instanceof AdminAuthError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.code === 'UNAUTHENTICATED' ? 401 : 403 },
    )
  }

  return Response.json(
    {
      error: {
        code: 'ADMIN_AUTH_ERROR',
        message: error instanceof Error ? error.message : '관리자 권한 확인에 실패했습니다.',
      },
    },
    { status: 500 },
  )
}

async function findActiveAdminUser(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, role, is_active')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(error.message)

  return data as AdminUserRow | null
}

async function readAccessToken(request?: Request) {
  const authorization = request?.headers.get('authorization')
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (bearerToken) return bearerToken

  const cookieStore = await cookies()
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value
}
