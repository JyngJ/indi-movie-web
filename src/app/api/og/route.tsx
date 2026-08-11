import { renderMovieOg, renderTheaterOg, renderDirectorOg } from '@/lib/og/cards'
import { enforceRateLimit } from '@/lib/rateLimit/guard'
import { RATE_LIMIT_POLICIES } from '@/lib/rateLimit/policies'

/* 공유 미리보기(OG) 카드 라우트.
 *
 * 파일 규약(opengraph-image.tsx)을 쓰지 않는 이유: 그쪽은 `params`만 받고 `searchParams`를
 * 받지 못한다. 회차까지 선택해서 공유한 링크(`?showtime=…`)는 쿼리에 맥락이 실려 있어
 * 파일 규약으로는 회차가 들어간 카드를 만들 수 없다. 그래서 라우트 핸들러로 굽고,
 * 각 페이지의 generateMetadata(여기는 searchParams를 받는다)가 이 URL을 og:image로 가리킨다.
 *
 * 파일 규약은 config 메타데이터를 덮어쓰므로 둘을 섞어 쓸 수 없다 — 관련 라우트는 전부 이쪽이다.
 */
const MAX_ID = 36    // UUID
const MAX_NAME = 100 // 감독명

function badRequest(message: string) {
  return Response.json({ error: { code: 'BAD_REQUEST', message } }, { status: 400 })
}

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, RATE_LIMIT_POLICIES.ogCards)
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  // 상한을 넘긴 값은 자르지 않고 거절한다 — 정상 링크에는 있을 수 없는 길이라,
  // 캐시 키를 흔들어 CDN을 무력화하려는 요청이다.
  const id = searchParams.get('id') ?? ''
  const name = searchParams.get('name') ?? ''
  const showtime = searchParams.get('showtime') ?? ''
  if (id.length > MAX_ID || showtime.length > MAX_ID || name.length > MAX_NAME) {
    return badRequest('파라미터가 허용 길이를 넘었습니다.')
  }

  switch (type) {
    case 'movie':
      if (!id) return badRequest('id가 필요합니다.')
      return renderMovieOg(id, showtime || undefined)
    case 'theater':
      if (!id) return badRequest('id가 필요합니다.')
      return renderTheaterOg(id, showtime || undefined)
    case 'director':
      if (!name) return badRequest('name이 필요합니다.')
      return renderDirectorOg(name)
    default:
      return badRequest('type은 movie · theater · director 중 하나여야 합니다.')
  }
}
