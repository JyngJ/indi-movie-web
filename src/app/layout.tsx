import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'
import './globals.css'
import { Providers } from './providers'
import { initTheme } from '@/store/themeStore'
import { AnalyticsScripts } from '@/components/analytics/AnalyticsScripts'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'),
  title: '독립영화 상영시간표·독립영화관 정보 | 영화볼지도',
  description:
    '전국 독립·예술영화관 상영시간표와 독립영화 정보를 지도에서 한눈에. 오늘 어디서 무슨 독립영화를 하는지, 극장별 시간표·영화 검색·큐레이션까지 한 곳에서.',
  keywords: [
    '독립영화',
    '독립영화 시간표',
    '독립영화 상영시간표',
    '독립영화 정보',
    '독립영화관',
    '예술영화관',
    '독립예술영화',
    '영화볼지도',
  ],
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/squarelogo.svg',
  },
  openGraph: {
    title: '영화볼지도 — 독립·예술영화관 상영 정보 지도',
    description: '멀티플렉스엔 없는 영화, 어디서 하는지 몰랐다면. 독립·예술영화관 상영 시간표를 지도에서 바로 확인하세요.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '영화볼지도 — 독립·예술영화관 상영 정보 지도',
    description: '멀티플렉스엔 없는 영화, 어디서 하는지 몰랐다면. 독립·예술영화관 상영 시간표를 지도에서 바로 확인하세요.',
    images: ['/og-image.png'],
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
