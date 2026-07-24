import { getScreeningIndex } from '@/lib/seo/getScreeningIndex'
import { toScreeningListSchema, toWebSiteSchema } from '@/lib/seo/toScreeningListSchema'
import { ScreeningIndexSeoContent } from '@/components/seo/ScreeningIndexSeoContent'

// 지도(MapView)는 (tabs)/layout.tsx에서 항상 마운트 — 탭 간 상태 보존.
// 지도는 클라이언트 전용(ssr:false)이라 홈의 서버 HTML이 비어 있었다: 크롤러가
// "독립영화" 같은 head term으로 랭킹할 본문이 없던 게 핵심 병목. 지도 UX는 그대로 두고,
// DOM에만 존재하는(sr-only) 실제 상영정보 블록 + JSON-LD를 서버에서 렌더한다.

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

export default async function Home() {
  const data = await getScreeningIndex()
  const websiteSchema = toWebSiteSchema(BASE_URL)
  const listSchema = toScreeningListSchema(
    data,
    BASE_URL,
    '오늘 상영 중인 독립·예술영화',
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }}
      />
      <ScreeningIndexSeoContent
        heading="독립영화 상영시간표·독립영화관 정보"
        intro="영화볼지도는 전국 독립·예술영화관의 상영 정보를 지도에서 한눈에 보여주는 서비스입니다. 멀티플렉스엔 걸리지 않는 독립영화가 오늘 어느 독립영화관에서 몇 시에 상영하는지, 극장별 시간표와 상영작을 확인하세요."
        data={data}
      />
    </>
  )
}
