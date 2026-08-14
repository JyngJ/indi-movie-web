import posthog from 'posthog-js'

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_TOKEN
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

if (typeof window !== 'undefined' && posthogToken) {
  posthog.init(posthogToken, {
    api_host: posthogHost,
    defaults: '2026-01-30',
    capture_pageview: true,
    capture_pageleave: true,
  })

  // /p 리다이렉트가 심어둔 유입 쿠키 — 있으면 모든 이벤트에 super property로 붙는다.
  const refMatch = document.cookie.match(/(?:^|;\s*)vref=([^;]+)/)
  if (refMatch) {
    posthog.register({ visit_ref: refMatch[1] })
  }
}
