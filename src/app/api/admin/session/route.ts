import { NextResponse } from 'next/server'
import {
  ADMIN_SESSION_COOKIE,
  adminAuthErrorResponse,
  getAdminSessionUser,
  verifyAdminAccessToken,
} from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

const sessionMaxAgeSeconds = 60 * 60 * 8

export async function GET(request: Request) {
  try {
    const user = await getAdminSessionUser(request)
    return Response.json({ user })
  } catch (error) {
    return adminAuthErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<{ accessToken: string }>
    const accessToken = payload.accessToken?.trim()

    if (!accessToken) {
      return Response.json(
        { error: { code: 'INVALID_SESSION_PAYLOAD', message: 'Supabase access token이 필요합니다.' } },
        { status: 400 },
      )
    }

    const user = await verifyAdminAccessToken(accessToken)
    const response = NextResponse.json({ user })

    response.cookies.set(ADMIN_SESSION_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: sessionMaxAgeSeconds,
    })

    return response
  } catch (error) {
    return adminAuthErrorResponse(error)
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })

  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  return response
}
