import { llmsIndex } from '@/design-system/llms'

export const dynamic = 'force-static'

export function GET() {
  return new Response(llmsIndex(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // 텍스트 응답이라 <meta robots>를 실을 곳이 없다 — 헤더로 색인을 막는다.
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
