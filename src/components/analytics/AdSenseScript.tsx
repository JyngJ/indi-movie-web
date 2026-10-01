// Google AdSense 자동 광고 — 광고 형식·위치는 AdSense 콘솔(광고 설정 미리보기)에서 정한다.
// 승인 크롤러가 서버 HTML에서 바로 찾도록 next/script가 아닌 <head> 안 <script async>로 렌더한다.
// 프로덕션 배포에서만 싣는다 — 프리뷰(*.vercel.app)·로컬에서 광고 요청을 보내지 않는다.
const ADSENSE_CLIENT = 'ca-pub-9133958847616613'

export function AdSenseScript() {
  if (process.env.VERCEL_ENV !== 'production') return null
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  )
}
