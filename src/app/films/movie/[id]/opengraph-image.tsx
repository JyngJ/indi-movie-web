import { renderMovieOg } from '@/lib/og/cards'

/* 세그먼트 설정은 정적 분석 대상이라 리터럴이어야 한다 — 다른 모듈에서 재수출하면
 * "Invalid segment configuration export" 로 빌드가 깨진다. 카드 렌더링만 공용화한다. */
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
// 미리보기 봇이 같은 URL을 반복 요청 — ISR로 Supabase 재조회 억제
export const revalidate = 3600

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return renderMovieOg(id)
}
