import { NextResponse } from 'next/server'

/**
 * 포트폴리오 유입 추적용 짧은 경로.
 * /p 로 들어오면 쿠키만 심고 홈으로 보낸다 — 최종 URL에는 흔적이 남지 않는다.
 *
 * 태깅 창은 30분 — PostHog 세션 정의와 같은 길이라 "방문 1회"만 pf로 잡힌다.
 * 원래 90일이었는데, 그러면 한 번 /p를 거친 브라우저의 이후 모든 방문이 pf로
 * 태깅된다. 실제로 개발자 본인이 /p를 눌러본 뒤 며칠간 본 /design-system/* 세션이
 * 전부 포폴 유입으로 집계돼, 대시보드가 외부 유입을 하나도 못 보여줬다.
 */
const TAG_WINDOW_SECONDS = 60 * 30

export function GET(request: Request) {
  const res = NextResponse.redirect(new URL('/', request.url), 302)
  res.cookies.set('vref', 'pf', {
    maxAge: TAG_WINDOW_SECONDS,
    path: '/',
    sameSite: 'lax',
  })
  return res
}
