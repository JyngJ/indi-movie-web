/**
 * AdSense 설정 — 게시자 ID와 광고 단위(슬롯) ID를 한곳에서 읽는다.
 *
 * 브라우저에서도 읽어야 해서 NEXT_PUBLIC_ 변수만 쓴다. Vercel은 NEXT_PUBLIC_VERCEL_ENV를
 * 빌드 때 자동으로 넣는다. 프로덕션이 아니면(프리뷰·로컬) 광고를 요청하지 않는다.
 */
export const ADSENSE_CLIENT = 'ca-pub-9133958847616613'

interface AdEnv {
  vercelEnv?: string
  slot?: string
}

/** 상세 하단 광고 단위 ID. 프로덕션이 아니거나 슬롯이 비어 있으면 null — 광고 칸을 그리지 않는다. */
export function resolveDetailAdSlot(env: AdEnv): string | null {
  if (env.vercelEnv !== 'production') return null
  const slot = env.slot?.trim()
  return slot && /^\d+$/.test(slot) ? slot : null
}

export function detailAdSlot(): string | null {
  return resolveDetailAdSlot({
    vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
    slot: process.env.NEXT_PUBLIC_ADSENSE_DETAIL_SLOT,
  })
}
