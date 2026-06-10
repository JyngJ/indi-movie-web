import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'
import './globals.css'
import { Providers } from './providers'
import { initTheme } from '@/store/themeStore'
import { AnalyticsScripts } from '@/components/analytics/AnalyticsScripts'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'),
  title: '영화볼지도',
  description: '독립·예술영화관 상영 정보를 지도에서 한눈에. 극장별 시간표, 영화 검색, 큐레이션까지.',
  icons: {
    icon: '/squarelogo.svg',
  },
  openGraph: {
    title: '영화볼지도 — 독립·예술영화관 상영 정보 지도',
    description: '멀티플렉스엔 없는 영화, 어디서 하는지 몰랐다면. 독립·예술영화관 상영 시간표를 지도에서 바로 확인하세요.',
    images: [{ url: '/squarelogo.svg', width: 351, height: 351 }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '영화볼지도 — 독립·예술영화관 상영 정보 지도',
    description: '멀티플렉스엔 없는 영화, 어디서 하는지 몰랐다면. 독립·예술영화관 상영 시간표를 지도에서 바로 확인하세요.',
    images: ['/squarelogo.svg'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* FOUC 방지: 렌더링 전 테마 적용 — React 19 알려진 경고(개발환경 only, 프로덕션 무관) */}
        <script dangerouslySetInnerHTML={{ __html: initTheme() }} />
      </head>
      <body>
        <Providers>
          <div className="mobile-container">
            {children}
          </div>
        </Providers>
        {/* 모바일 가로 회전 차단 오버레이 */}
        <div className="rotate-overlay" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <path d="M9 22h6" />
          </svg>
          <p>화면을 세로로 돌려주세요</p>
        </div>
        <AnalyticsScripts />
      </body>
    </html>
  )
}
