import { NextResponse } from 'next/server'
import { VISIT_REF_TTL_MS, formatVisitRef } from '@/lib/analytics/visitRef'

/**
 * 포트폴리오 유입 추적용 짧은 경로.
 * /p 로 들어오면 쿠키만 심고 홈으로 보낸다 — 최종 URL에는 흔적이 남지 않는다.
 *
 * 태깅 창은 30분 — PostHog 세션 정의와 같은 길이라 "방문 1회"만 pf로 잡힌다.
 * 원래 90일이었는데, 그러면 한 번 /p를 거친 브라우저의 이후 모든 방문이 pf로
 * 태깅된다. 실제로 개발자 본인이 /p를 눌러본 뒤 며칠간 본 /design-system/* 세션이
 * 전부 포폴 유입으로 집계돼, 대시보드가 외부 유입을 하나도 못 보여줬다.
 *
 * 값에 발급 시각을 실어 보내는 이유는 `lib/analytics/visitRef`에 적어 뒀다 —
 * Max-Age를 줄여도 이미 심긴 90일 쿠키는 안 줄어들기 때문이다.
 */
const TAG_WINDOW_SECONDS = VISIT_REF_TTL_MS / 1000

/** 진입 이벤트 1건을 쏘라는 일회용 신호. 클라이언트가 읽자마자 지운다. */
const ENTRY_SIGNAL_SECONDS = 60 * 5

export function GET(request: Request) {
  const res = NextResponse.redirect(new URL('/', request.url), 302)
  res.cookies.set('vref', formatVisitRef('pf', Date.now()), {
    maxAge: TAG_WINDOW_SECONDS,
    path: '/',
    sameSite: 'lax',
  })
  res.cookies.set('vref_entry', '1', {
    maxAge: ENTRY_SIGNAL_SECONDS,
    path: '/',
    sameSite: 'lax',
  })
  return res
}
