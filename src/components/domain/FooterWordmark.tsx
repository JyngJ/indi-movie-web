'use client'

/**
 * 페이지 맨 아래 워터마크 — "여기가 끝"이라는 표시.
 *
 * 상영작 탭(AllMoviesGrid) 안에 인라인으로 있던 걸 뺐다. FAQ에도 같은 게 필요해졌는데
 * 복사하면 크기·투명도·하단 여백이 각자 흘러간다 — 이 프로젝트에서 이미 여러 번 그랬다.
 *
 * 탭바를 비키는 여백은 부모 페이지(FAQ·상영작 탭)가 --nav-mobile-offset으로 이미 준다.
 * 여기서 또 더하면 모바일에서 로고 아래가 탭바 높이만큼 비어 보인다(2026-09 이중 여백 수정).
 */
export function FooterWordmark({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        paddingTop: 'var(--spacing-12)',
        paddingBottom: 'var(--spacing-8)',
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
