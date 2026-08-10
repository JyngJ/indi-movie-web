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
  },
}

export default function MapPage() {
  return null
}
