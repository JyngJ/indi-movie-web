import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export function AnalyticsScripts() {
  return (
    <>
      <Analytics />
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { send_page_view: true });
            `}
          </Script>
        </>
      )}
    </>
  )
}
