import { getScreeningIndex } from '@/lib/seo/getScreeningIndex'
import { toScreeningListSchema, toWebSiteSchema } from '@/lib/seo/toScreeningListSchema'
import { ScreeningIndexSeoContent } from '@/components/seo/ScreeningIndexSeoContent'
import FilmsClient from './FilmsClient'

// 홈(진입점) = 상영작. 랜딩 A/B 실험에서 상영작 랜딩(test arm)이 이겨서 기본 진입점으로 승격했고,
// 클라이언트 리다이렉트(`/` → `/films`)를 없애기 위해 라우트 자체를 뒤집었다: 상영작 '/', 지도 '/map'.
// 구 링크(`/films`)는 next.config.ts에서 '/'로 영구 리다이렉트한다.
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
        intro="영화볼지도는 전국 독립·예술영화관의 상영 정보를 한눈에 보여주는 서비스입니다. 멀티플렉스엔 걸리지 않는 독립영화가 오늘 어느 독립영화관에서 몇 시에 상영하는지, 극장별 시간표와 상영작을 확인하세요."
        data={data}
      />
      <FilmsClient />
    </>
  )
}
