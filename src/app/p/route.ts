import { NextResponse } from 'next/server'

// 포트폴리오 유입 추적용 짧은 경로.
// /p 로 들어오면 쿠키만 심고 홈으로 보낸다 — 최종 URL에는 흔적이 남지 않는다.
export function GET(request: Request) {
  const res = NextResponse.redirect(new URL('/', request.url), 302)
  res.cookies.set('vref', 'pf', {
    maxAge: 60 * 60 * 24 * 90,
    path: '/',
    sameSite: 'lax',
  })
  return res
}
