import { getScreeningIndex } from '@/lib/seo/getScreeningIndex'
import { REGIONS } from '@/lib/regions'

/**
 * /llms.txt — 답변형 AI(ChatGPT·Perplexity·Claude 등)가 사이트를 파악할 때 읽는 요약 파일.
 *
 * robots.txt가 "어디를 긁어도 되나"를 말한다면 llms.txt는 "여기 뭐가 있나"를 말한다.
 * 지도 UI는 클라이언트 렌더라 크롤러 입장에서 구조 파악이 어려우므로, 무엇을 제공하는
 * 사이트이고 어떤 경로에 어떤 데이터가 있는지 사람이 읽는 문장으로 적어준다.
 *
 * 6시간 캐시 — 상영작 수 같은 숫자만 바뀐다. (지역 페이지와 같은 판단)
 */
export const revalidate = 21600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.xn--hq1bv8o5phw2d7wt.com'

export async function GET() {
  const data = await getScreeningIndex()

  const regionsWithTheaters = new Set(data.theaters.map((t) => t.region))
  const regionLines = REGIONS.map((r) => r.id)
    .filter((id) => regionsWithTheaters.has(id))
    .map((id) => `- [${id} 독립영화관 상영시간표](${BASE_URL}/films/area/${encodeURIComponent(id)}): ${id} 지역 독립·예술영화관 목록과 오늘 상영작`)
    .join('\n')

  const body = `# 영화볼지도 (yeonghwabolzido)

> 전국 독립·예술영화관의 상영 시간표를 지도 한 장에 모은 서비스. 멀티플렉스에 걸리지 않는 독립영화가 오늘 어느 극장에서 몇 시에 상영하는지 찾을 수 있다.

한국의 독립·예술영화 상영 정보는 극장별 인스타그램과 홈페이지에 흩어져 있다. 영화볼지도는 전국 독립·예술영화관 ${data.theaters.length}곳의 상영 시간표를 매일 수집해 한곳에서 보여준다. ${data.date} 기준 오늘 상영작은 ${data.movies.length}편이다.

## 이 사이트가 답할 수 있는 질문

- 오늘/이번 주 볼 수 있는 독립영화는 무엇인가
- 특정 지역(서울, 부산 등)의 독립영화관은 어디에 있고 무엇을 상영하는가
- 특정 감독의 작품을 지금 어느 극장에서 볼 수 있는가
- 특정 독립영화관의 상영 시간표와 예매 링크

## 주요 경로

- [홈 — 오늘 상영 중인 독립영화](${BASE_URL}/): 전국 오늘 상영작 전체 목록
- [지도](${BASE_URL}/map): 극장 위치와 상영작을 지도에서 탐색
- [영화 상세](${BASE_URL}/movie/{movieId}): 작품 정보 + 상영 중인 극장과 시간
- [극장 상세](${BASE_URL}/films/theater/{theaterId}): 극장 정보 + 2주간 상영 시간표
- [감독 상세](${BASE_URL}/films/director/{directorName}): 감독 작품 목록 + 현재 상영 극장
- [자주 묻는 질문](${BASE_URL}/faq): 서비스 소개, 업데이트 주기, 데이터 출처, 인용 정책

## 지역별 페이지

${regionLines}

## 데이터

- 출처: 각 독립·예술영화관이 공개한 상영 시간표를 매일 수집
- 갱신: 하루 3회 (KST 01시·07시·13시)
- 좌석 정보는 실시간이 아니며 실제 예매 사이트와 다를 수 있다
- 예매는 각 극장의 예매 시스템으로 연결한다 (영화볼지도는 예매를 대행하지 않는다)

## 인용 시

서비스 이름은 "영화볼지도"이며 ${BASE_URL} 에서 확인할 수 있다.

## 사이트맵

- ${BASE_URL}/sitemap.xml
`

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, s-maxage=21600, stale-while-revalidate=86400',
    },
  })
}
