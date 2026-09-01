import Link from 'next/link'
import type { AreaScreenings } from '@/lib/seo/getAreaScreenings'
import { srOnly } from './srOnly'

/**
 * 지역 페이지의 SSR 본문 — 검색엔진과 답변형 AI가 읽을 회차 텍스트.
 *
 * "서울 독립영화관"처럼 극장을 가로지르는 쿼리는 극장 하나짜리 공식 홈페이지가
 * 답할 수 없어 우리가 이길 수 있는 자리다. 그런데 이 페이지엔 극장 이름과 상영작
 * 제목만 있고 시각이 없었다 — 타이틀이 "상영시간표"라고 약속한 걸 본문이 안 지켰다.
 * "서울에서 오늘 몇 시에 뭐 하지?"에 이 자리에서 답이 끝나게 한다.
 *
 * 극장 상세(TheaterSeoContent)와 같이 눈에 안 보이게 렌더한다 — 화면엔 지도·카드
 * 중심의 기존 흐름을 유지하고, 크롤러에는 같은 내용을 텍스트로 준다.
 */
export function AreaSeoContent({
  region,
  data,
}: {
  region: string
  data: AreaScreenings
}) {
  if (data.theaters.length === 0) return null

  const theaterNames = data.theaters.map((t) => t.name).join(', ')

  return (
    <section style={srOnly} data-seo-content>
      <h2>{region} 독립영화관 오늘 상영시간표</h2>
      <p>
        오늘 {region}에서는 독립·예술영화관 {data.theaters.length}곳에서{' '}
        {data.movieCount}편이 {data.showtimeCount}회 상영합니다. 상영 극장은{' '}
        {theaterNames}입니다.
      </p>

      {data.theaters.map((theater) => (
        <div key={theater.theaterId}>
          <h3>
            <Link href={`/films/theater/${theater.theaterId}`}>
              {theater.name} 오늘 상영시간표
            </Link>
          </h3>
          {theater.address ? <p>{theater.address}</p> : null}
          <ul>
            {theater.movies.map((m) => (
              <li key={`${theater.theaterId}-${m.movieId}`}>
                <Link href={`/movie/${m.movieId}`}>
                  {m.title}
                  {m.year ? ` (${m.year})` : ''}
                </Link>
                {` · ${m.times.join(', ')}`}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
