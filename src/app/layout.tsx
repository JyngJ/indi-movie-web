import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'
import './globals.css'
import { Providers } from './providers'
import { initTheme } from '@/store/themeStore'

export const metadata: Metadata = {
  title: '영화볼지도',
  description: '서울 독립·예술영화관 상영 정보를 지도에서 한눈에',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* FOUC 방지: 렌더링 전 테마 적용 */}
        <script dangerouslySetInnerHTML={{ __html: initTheme() }} />
      </head>
      <body>
        <Providers>
          <div className="mobile-container">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
