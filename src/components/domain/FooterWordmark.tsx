'use client'

import { GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'

/**
 * 페이지 맨 아래 워터마크 — "여기가 끝"이라는 표시.
 *
 * 상영작 탭(AllMoviesGrid) 안에 인라인으로 있던 걸 뺐다. FAQ에도 같은 게 필요해졌는데
 * 복사하면 크기·투명도·하단 여백이 각자 흘러간다 — 이 프로젝트에서 이미 여러 번 그랬다.
 *
 * 하단 여백은 모바일에서 탭바 높이를 피해야 한다. 안 그러면 로고가 탭바에 깔린다.
 */
export function FooterWordmark({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        paddingTop: 48,
        paddingBottom: isDesktop ? 32 : GLOBAL_NAV_MOBILE_HEIGHT + 24,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.svg"
        alt="영화볼지도"
        width={isDesktop ? 120 : 90}
        style={{ opacity: 0.6 }}
      />
    </div>
  )
}
