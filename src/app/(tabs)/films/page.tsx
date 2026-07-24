import type { Metadata } from 'next'
import { getScreeningIndex } from '@/lib/seo/getScreeningIndex'
import { toScreeningListSchema } from '@/lib/seo/toScreeningListSchema'
import { ScreeningIndexSeoContent } from '@/components/seo/ScreeningIndexSeoContent'
import FilmsClient from './FilmsClient'

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.영화볼지도.com'

export const metadata: Metadata = {
  title: '독립영화 상영시간표 — 오늘 뭐 하지? | 영화볼지도',
  description:
    '전국 독립·예술영화관에서 오늘 상영하는 독립영화 시간표를 한눈에. 상영작 검색, 극장별 스케줄, 감독·큐레이션까지 영화볼지도에서.',
  alternates: { canonical: '/films' },
  openGraph: {
    title: '독립영화 상영시간표 | 영화볼지도',
    description: '전국 독립·예술영화관 오늘 상영작과 시간표를 한눈에.',
    url: '/films',
    type: 'website',
  },
}

export default async function FilmsPage() {
  const data = await getScreeningIndex()
  const listSchema = toScreeningListSchema(
    data,
    BASE_URL,
    '오늘 상영 중인 독립·예술영화',
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }}
      />
      <ScreeningIndexSeoContent
        heading="독립영화 상영시간표"
        intro="전국 독립·예술영화관에서 오늘 상영 중인 독립영화와 극장별 시간표입니다. 멀티플렉스엔 잘 걸리지 않는 독립·예술영화를 어디서 볼 수 있는지 한 곳에서 확인하세요."
        data={data}
      />
      <FilmsClient />
    </>
  )
}
