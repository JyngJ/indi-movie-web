import type { FaqEntry } from '@/lib/seo/toFaqSchema'

/** 답변 아래에 붙는 이동 버튼 — 제보/요청은 더보기 탭의 리포트 폼으로 연결한다 */
export interface FaqAction {
  label: string
  href: string
}

export interface FaqItem extends FaqEntry {
  action?: FaqAction
}

export interface FaqSection {
  title: string
  items: FaqItem[]
}

const reportHref = (category: string) => `/more?page=report&category=${encodeURIComponent(category)}`

export function buildSections(theaterCount: number): FaqSection[] {
  return [
    {
      title: '서비스 소개',
      items: [
        {
          question: "'영화볼지도'는 어떤 서비스인가요?",
          answer:
            '전국 독립·예술영화관의 상영 시간표를 지도 한 장으로 모아 보는 서비스예요. 멀티플렉스에서 만나기 어려운 독립·예술영화가 오늘 어느 극장에서 몇 시에 상영하는지 한눈에 볼 수 있어요.',
        },
        {
          question: '왜 만들었나요?',
          answer:
            '독립·예술영화관의 상영 정보는 극장마다 인스타그램, 홈페이지, 블로그에 흩어져 있어서 매번 일일이 찾아봐야 했어요. 그 번거로움을 줄이고 독립영화관을 더 쉽게 찾을 수 있도록 만들었어요.',
        },
        {
          question: '무료로 이용할 수 있나요?',
          answer: '네, 회원가입 없이 전부 무료로 쓸 수 있어요.',
        },
        {
          question: '모바일 앱도 있나요?',
          answer:
            '지금은 모바일·PC 웹 브라우저로 쓸 수 있어요. 모바일 화면에 맞춰 최적화돼 있고, 전용 앱도 준비하고 있어요.',
        },
      ],
    },
    {
      title: '상영 정보',
      items: [
        {
          question: '상영시간표는 얼마나 자주 업데이트되나요?',
          answer: '전국 극장의 상영 시간표를 매일 3회쯤 자동으로 새로 받아와요.',
        },
        {
          question: '어떤 극장들이 등록되어 있나요?',
          answer: `전국의 독립·예술영화 전용관, 시네마테크, 지역 예술영화관 ${theaterCount}곳의 시간표를 보여드려요.`,
        },
        {
          question: 'CGV·메가박스·롯데시네마 같은 대형 멀티플렉스는 왜 없나요?',
          answer:
            '멀티플렉스는 자체 앱에서 쉽게 볼 수 있지만 독립·예술영화관은 정보를 찾기 어려워서, 지금은 여기에 집중하고 있어요. 대형 극장 체인은 기술·정책상 연동이 어려운 점도 있어요.',
        },
        {
          question: '상영 정보가 실제와 다르면 어떻게 하나요?',
          answer:
            '극장 사정으로 상영이 갑자기 바뀌거나 취소될 수 있어요. 방문 전에 극장 공식 공지를 한 번 더 확인해 주세요. 잘못된 정보를 발견했다면 제보해 주시면 빠르게 반영할게요.',
          action: { label: '잘못된 정보 제보하기', href: reportHref('데이터 수정') },
        },
        {
          question: '찾는 극장이 없어요. 추가를 요청할 수 있나요?',
          answer: '네, 원하는 극장을 알려주시면 검토해서 차례로 추가할게요.',
          action: { label: '극장 추가 요청하기', href: reportHref('영화관 추가 요청') },
        },
      ],
    },
    {
      title: '기능',
      items: [
        {
          question: '예매는 어떻게 진행되나요?',
          answer:
            "직접 예매 기능은 없어요. 원하는 회차의 [예매하러 가기] 버튼을 누르면 그 극장의 공식 예매 페이지로 이동해요.",
        },
        {
          question: 'GV(관객과의 대화) 상영 회차도 확인할 수 있나요?',
          answer: '네, GV·시네토크가 예정된 회차는 지도와 시간표에 태그로 따로 표시돼요.',
        },
        {
          question: "'오늘이 마지막' 표시는 무슨 뜻인가요?",
          answer:
            '그 극장에서 상영 종료가 임박한 작품에 붙는 배지예요. 재상영이 드문 독립·예술영화 특성상 관람 기회를 놓치지 않도록 알려드려요. 수집 시점에 따라 실제 종영일과 조금 다를 수 있으니, 오류를 발견하면 제보해 주세요.',
        },
        {
          question: '영화제 상영 일정도 함께 볼 수 있나요?',
          answer: '네, 진행 중인 주요 영화제의 상영 일정과 정보도 함께 보여드려요.',
        },
      ],
    },
    {
      title: '데이터 & 기타',
      items: [
        {
          question: '수집된 데이터를 외부에서 재가공하거나 사용할 수 있나요?',
          answer:
            "상영 시간표의 원천 정보에 대한 권리는 각 극장에 있어요. 영화볼지도가 수집·가공한 정보를 무단으로 복제·배포하거나 상업적으로 쓰는 것은 제한돼요. 안내 목적으로 인용할 때는 영화볼지도 링크를 함께 적어 주세요.",
        },
        {
          question: '특정 영화의 개봉이나 상영 알림을 받을 수 있나요?',
          answer:
            '상영 알림 기능은 준비 중이에요. 빠르게 선보일 수 있도록 만들고 있으니 조금만 기다려 주세요.',
        },
      ],
    },
  ]
}
