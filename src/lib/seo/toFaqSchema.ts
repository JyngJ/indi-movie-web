/**
 * FAQPage 스키마 — 답변형 AI(ChatGPT·Perplexity 등)와 검색엔진이 "질문 → 답" 쌍을
 * 그대로 인용할 수 있게 한다. 본문에 실제로 있는 문답만 넣는다(없는 내용을 스키마로만
 * 넣으면 구조화 데이터 정책 위반).
 */
export interface FaqEntry {
  question: string
  answer: string
}

export function toFaqSchema(entries: FaqEntry[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((e) => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: e.answer,
      },
    })),
  }
}
