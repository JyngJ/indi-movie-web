// Google AdSense 자동 광고 — 광고 형식·위치는 AdSense 콘솔(광고 설정 미리보기)에서 정한다.
// 승인 크롤러가 서버 HTML에서 바로 찾도록 next/script가 아닌 <head> 안 <script async>로 렌더한다.
// 프로덕션 배포에서만 싣는다 — 프리뷰(*.vercel.app)·로컬에서 광고 요청을 보내지 않는다.
//
// 내용이 있는 페이지에만 싣는다(2026-10): 상영작 홈 · FAQ · 영화/극장/영화제/감독 상세(각 레이아웃).
// 지도·소식·MY·검색·설정은 앱 화면이라 광고 효과가 낮은데, 광고를 요청한 URL마다 AdSense
// 크롤러가 따로 방문한다 — 12시간 CDN 요청 약 14K 중 3.4K가 이 크롤러였다(Hobby 한도는 건수).
// <head> 밖에 렌더해도 React 19가 async 스크립트를 <head>로 끌어올린다.
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
