import type { Metadata } from 'next'
import { getScreeningIndex } from '@/lib/seo/getScreeningIndex'
import { ScreeningIndexSeoContent } from '@/components/seo/ScreeningIndexSeoContent'

// 지도 탭 라우트. 지도(MapView)는 탭 전환에도 상태를 보존해야 해서 (tabs)/layout.tsx에서
// 마운트되며 `ssr: false`다. 그래서 이 경로의 서버 HTML에는 아무 텍스트도 남지 않았고
// h1조차 없었다(Bing URL 검사에서 확인). 화면에 그릴 UI는 여전히 레이아웃이 담당하고,
// 이 페이지는 메타데이터와 크롤러용 sr-only 본문을 맡는다.
//
// SEO 크롤러용 텍스트라 신선도 불필요 — 홈과 같은 6시간 (Supabase 요청량 절감)
export const revalidate = 21600
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

export default async function MapPage() {
  const data = await getScreeningIndex()

  return (
    <ScreeningIndexSeoContent
      heading="독립영화관 지도 — 내 주변 상영관 찾기"
      intro="전국 독립·예술영화관을 지도에서 찾을 수 있습니다. 극장 위치와 오늘 상영작, 상영 시간표를 지도 한 장에서 확인하세요. 지하철역, 감독, 영화 제목으로도 검색할 수 있습니다."
      data={data}
    />
  )
}
