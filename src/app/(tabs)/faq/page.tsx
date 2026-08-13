import type { Metadata } from 'next'
import { toFaqSchema } from '@/lib/seo/toFaqSchema'
import { getScreeningIndex } from '@/lib/seo/getScreeningIndex'
import { buildSections } from './content'
import { FaqClient } from './FaqClient'

export const metadata: Metadata = {
  title: '자주 묻는 질문 | 영화볼지도',
  description:
    '영화볼지도 FAQ — 서비스 소개, 상영시간표 업데이트 주기, 등록 극장, 예매 방법, GV 상영, 데이터 출처 등 자주 묻는 질문과 답변.',
  alternates: { canonical: '/faq' },
}

// llms.txt와 같은 판단 — 극장 수 같은 숫자만 바뀌므로 6시간 캐시
export const revalidate = 21600

export default async function FaqPage() {
  const data = await getScreeningIndex()
  const sections = buildSections(data.theaters.length)
  const faqSchema = toFaqSchema(
    sections.flatMap((s) => s.items.map(({ question, answer }) => ({ question, answer })))
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <FaqClient sections={sections} />
    </>
  )
}
