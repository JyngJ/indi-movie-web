import type { Metadata } from 'next'

// 지도 탭 라우트. 지도(MapView)는 탭 전환에도 상태를 보존해야 해서 (tabs)/layout.tsx에서
// 마운트되고, 이 페이지는 라우트와 메타데이터만 담당한다
// (레이아웃이 지도 경로에서는 children을 렌더하지 않는다).
export const metadata: Metadata = {
  title: '독립영화관 지도 — 내 주변 상영관 찾기 | 영화볼지도',
  description:
    '전국 독립·예술영화관을 지도에서 찾아보세요. 내 주변 영화관의 오늘 상영작과 시간표를 지도에서 바로 확인할 수 있습니다.',
  alternates: { canonical: '/map' },
  openGraph: {
    title: '독립영화관 지도 | 영화볼지도',
    description: '전국 독립·예술영화관과 오늘 상영작을 지도에서 한눈에.',
    url: '/map',
    type: 'website',
    // 중첩 키는 통째로 덮어써진다 — images를 빼면 루트의 브랜드 카드까지 사라진다.
    // 지도 시트·GV 공유가 이 경로로 오므로 미리보기가 비면 그대로 드러난다.
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '독립영화관 지도 | 영화볼지도',
    description: '전국 독립·예술영화관과 오늘 상영작을 지도에서 한눈에.',
    images: ['/og-image.png'],
  },
}

export default function MapPage() {
  return null
}
