import Link from 'next/link'
import type { TheaterScreenings } from '@/lib/seo/getTheaterScreenings'
import type { Theater } from '@/types/api'
import { srOnly } from './srOnly'

/** 'YYYY-MM-DD' → '8월 12일 (수)' */
function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00+09:00`)
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`
}

/**
 * 극장 상세의 SSR 본문 — 검색엔진과 답변형 AI가 읽을 텍스트.
 * "OO극장 오늘 뭐 해요?"에 그 자리에서 답이 끝나도록 첫 문단에 오늘 상영작을 담는다.
 */
export function TheaterSeoContent({
  theater,
  data,
}: {
  theater: Theater
  data: TheaterScreenings
}) {
  const today = data.days.find((d) => d.date === data.date)
  const todayTitles = today?.movies.map((m) => m.movieTitle) ?? []

  const intro = todayTitles.length > 0
    ? `${theater.name}에서 오늘 상영하는 영화는 ${todayTitles.join(', ')} ${todayTitles.length}편입니다. 앞으로 2주간 ${data.movieCount}편이 예정돼 있습니다. 주소는 ${theater.address}입니다.`
    : `${theater.name}은 ${theater.address}에 있는 독립·예술영화관입니다. 오늘은 등록된 상영이 없습니다.${data.movieCount > 0 ? ` 앞으로 2주간 ${data.movieCount}편이 예정돼 있습니다.` : ''}`

  return (
    <section style={srOnly} data-seo-content>
      <h1>{theater.name} 상영시간표</h1>
      <p>{intro}</p>

      {today && today.movies.length > 0 && (
        <>
          <h2>{theater.name} 오늘 상영시간표</h2>
          <ul>
            {today.movies.map((m) => (
              <li key={m.movieId}>
                <Link href={`/films/movie/${m.movieId}`}>
                  {m.movieTitle}
                  {m.year ? ` (${m.year})` : ''}
                </Link>
                {m.director.length > 0 ? ` — ${m.director.join(', ')} 감독` : ''}
                {` · ${m.times.join(', ')}`}
              </li>
            ))}
          </ul>
        </>
      )}

      {data.days.length > 0 && (
        <>
          <h2>{theater.name} 상영 예정 (2주)</h2>
          {data.days.map((day) => (
            <div key={day.date}>
              <h3>{formatDay(day.date)}</h3>
              <ul>
                {day.movies.map((m) => (
                  <li key={`${day.date}-${m.movieId}`}>
                    <Link href={`/films/movie/${m.movieId}`}>{m.movieTitle}</Link>
                    {` · ${m.times.join(', ')}`}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}

      <h2>{theater.name}은 어떤 극장인가요?</h2>
      <p>
        {theater.name}은 {theater.address}에 있는 독립·예술영화관입니다.
        멀티플렉스에서 보기 어려운 독립·예술영화를 상영하며,
        {theater.screenCount ? ` 상영관 ${theater.screenCount}개를 운영합니다.` : ' 상영 시간표는 매일 갱신됩니다.'}
        {' '}상영 시간과 예매는 영화볼지도에서 확인할 수 있습니다.
      </p>
    </section>
  )
}
