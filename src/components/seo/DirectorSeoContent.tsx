import Link from 'next/link'
import type { DirectorScreenings } from '@/lib/seo/getDirectorScreenings'
import { srOnly } from './srOnly'

/**
 * 감독 상세의 SSR 본문 — 검색엔진과 답변형 AI가 읽을 텍스트.
 *
 * 답변형 AI는 "그 자리에서 답이 끝나는 문단"을 인용한다. 그래서 목록만 나열하지 않고
 * 첫 문단에 "누가 · 몇 편 · 지금 어디서" 를 한 문장으로 담는다.
 */
export function DirectorSeoContent({
  directorName,
  data,
}: {
  directorName: string
  data: DirectorScreenings
}) {
  const nowShowing = [...new Map(data.screenings.map((s) => [s.movieId, s])).values()]
  const theaterNames = [...new Set(data.screenings.map((s) => s.theaterName))]

  const intro = nowShowing.length > 0
    ? `${directorName} 감독의 작품 ${data.films.length}편 중 ${nowShowing.length}편이 앞으로 2주간 전국 독립·예술영화관 ${theaterNames.length}곳에서 상영됩니다. ${nowShowing.map((s) => s.movieTitle).slice(0, 5).join(', ')} 등을 ${theaterNames.slice(0, 3).join(', ')}에서 볼 수 있습니다.`
    : `${directorName} 감독의 작품 ${data.films.length}편을 모았습니다. 현재 전국 독립·예술영화관에 잡힌 상영 일정은 없습니다. 새 상영이 열리면 영화볼지도에서 확인할 수 있습니다.`

  return (
    <section style={srOnly} data-seo-content>
      <h1>{directorName} 감독 영화 상영시간표</h1>
      <p>{intro}</p>

      {nowShowing.length > 0 && (
        <>
          <h2>{directorName} 감독 작품, 지금 상영 중인 극장</h2>
          <ul>
            {data.screenings.map((s) => (
              <li key={`${s.movieId}-${s.theaterId}-${s.date}`}>
                <Link href={`/films/movie/${s.movieId}`}>{s.movieTitle}</Link>
                {' — '}
                <Link href={`/films/theater/${s.theaterId}`}>{s.theaterName}</Link>
                {s.theaterCity ? ` (${s.theaterCity})` : ''}
                {` · ${s.date}`}
              </li>
            ))}
          </ul>
        </>
      )}

      {data.films.length > 0 && (
        <>
          <h2>{directorName} 감독 작품 목록 ({data.films.length}편)</h2>
          <ul>
            {data.films.map((f) => {
              const coDirectors = f.director.filter((d) => d !== directorName)
              return (
                <li key={f.id}>
                  <Link href={`/films/movie/${f.id}`}>
                    {f.title}
                    {f.year ? ` (${f.year})` : ''}
                  </Link>
                  {coDirectors.length > 0 ? ` — ${directorName}, ${coDirectors.join(', ')} 공동연출` : ''}
                </li>
              )
            })}
          </ul>
        </>
      )}

      <h2>{directorName} 감독 영화는 어디서 볼 수 있나요?</h2>
      <p>
        {nowShowing.length > 0
          ? `${theaterNames.join(', ')}에서 상영합니다. 각 극장의 상영 시간과 예매 링크는 영화볼지도 극장 페이지에서 확인하세요.`
          : `현재 상영 중인 극장이 없습니다. 영화볼지도는 전국 독립·예술영화관의 상영 시간표를 매일 모으므로, 새 상영이 열리면 이 페이지에서 확인할 수 있습니다.`}
      </p>
    </section>
  )
}
