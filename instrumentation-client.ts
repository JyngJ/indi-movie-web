import posthog from 'posthog-js'
import { parseVisitRef } from '@/lib/analytics/visitRef'

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_TOKEN
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? match[1] : null
}

function expireCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}

if (typeof window !== 'undefined' && posthogToken) {
  posthog.init(posthogToken, {
    api_host: posthogHost,
    defaults: '2026-01-30',
    capture_pageview: true,
    capture_pageleave: true,
  })

  // 내부 트래픽 표식. `?internal=1` 로 한 번 들어오면 이 브라우저는 영구히 내부 사용자다.
  // 프로젝트의 "Internal / Test users" 코호트가 바로 이 person 속성을 보고 거르므로,
  // 인사이트에서 "내부/테스트 사용자 제외"만 켜면 내 트래픽이 빠진다.
  // 해제는 `?internal=0`. IP로 거르던 방식은 IP가 계속 바뀌어(3주에 7개) 못 쓴다.
  const internalFlag = new URLSearchParams(window.location.search).get('internal')
  if (internalFlag === '1') {
    posthog.setPersonProperties({ $internal_or_test_user: true })
  } else if (internalFlag === '0') {
    posthog.setPersonProperties({ $internal_or_test_user: false })
  }

  // /p 리다이렉트가 심어둔 유입 쿠키 — 쿠키가 살아있는 방문에만 visit_ref를 붙인다.
  //
  // 예전엔 register()를 썼는데, 그건 super property를 localStorage에 영구 저장한다.
  // /p를 한 번 누른 브라우저는 쿠키가 만료된 뒤에도 모든 이벤트에 visit_ref=pf가
  // 계속 붙었고, 그래서 포폴 유입 지표가 개발자 본인의 이후 방문으로 가득 찼다.
  // 세션 한정 등록으로 바꾸고, 이미 박혀버린 영구 등록분은 unregister로 걷어낸다.
  //
  // 쿠키 값의 발급 시각까지 검사한다. Max-Age를 90일에서 30분으로 줄여도(#311)
  // 그 전에 심긴 90일 쿠키는 그대로 남아, 수정 뒤에도 본인 방문이 계속 pf로
  // 집계됐다. 시각이 없는 옛 값은 만료로 보고 쿠키까지 걷어낸다.
  posthog.unregister('visit_ref')
  const rawVisitRef = readCookie('vref')
  const visitRef = parseVisitRef(rawVisitRef, Date.now())
  if (visitRef) {
    posthog.register_for_session({ visit_ref: visitRef })
  } else {
    if (rawVisitRef) expireCookie('vref')
    posthog.unregister_for_session('visit_ref')
  }

  // /p 진입 자체를 이벤트 1건으로 남긴다 — 유입 "수"는 이 이벤트로 정확히 센다.
  // (visit_ref는 그 방문에 무엇을 봤는지 보려는 태그일 뿐, 카운트용이 아니다.)
  if (readCookie('vref_entry')) {
    expireCookie('vref_entry')
    posthog.capture('portfolio entry', {
      visit_ref: visitRef ?? 'pf',
      landing_path: window.location.pathname,
      referrer: document.referrer || null,
    })
  }
}
