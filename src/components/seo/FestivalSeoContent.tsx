import Link from 'next/link'
import type { FestivalDetail } from '@/types/festival'
import { srOnly } from './srOnly'

/** "YYYY-MM-DD" → "8월 23일" — SSR 전용이라 타임존 파싱 없이 문자열로 처리 */
function formatDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(m)}월 ${Number(d)}일`
}

/**
 * 영화제 상세의 SSR 본문 — 화면 UI는 전부 클라이언트 렌더라 JS를 실행하지 않는
 * 크롤러(검색엔진 일부·답변형 AI 대부분)에겐 빈 문서였다. DirectorSeoContent와
 * 같은 패턴으로 "무엇이 · 언제 · 어디서 · 몇 편"을 서버 HTML에 담는다.
 * h1은 클라이언트 뷰가 렌더하므로 여기서는 h2부터 쓴다.
 */
export function FestivalSeoContent({ festival }: { festival: FestivalDetail }) {
  const venueNames = [
    ...new Set(
      festival.theaters
        .map((t) => t.theater?.name ?? t.venueText)
        .filter((name): name is string => Boolean(name)),
    ),
  ]

  // writing-audit-ignore — SEO 본문은 문어체 유지
  const intro = `${festival.name}는 ${formatDate(festival.startDate)}부터 ${formatDate(festival.endDate)}까지 ${festival.city}${venueNames.length > 0 ? ` ${venueNames.join(', ')}` : ''}에서 열립니다.${festival.movies.length > 0 ? ` 올해는 ${festival.movies.length}편을 상영합니다.` : ''}`

  return (
    <section style={srOnly} data-seo-content>
      <p>{intro}</p>
      {festival.description && <p>{festival.description}</p>}

      {festival.movies.length > 0 && (
        <>
          <h2>{festival.name} 상영작 ({festival.movies.length}편)</h2>
          <ul>
            {festival.movies.map((m) => (
              <li key={m.id}>
                {m.movieId ? (
                  <Link href={`/movie/${m.movieId}`}>{m.movie?.title ?? m.movieTitleSnapshot}</Link>
                ) : (
                  m.movieTitleSnapshot
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {festival.theaters.length > 0 && (
        <>
          <h2>상영 장소</h2>
          <ul>
            {festival.theaters.map((t) => (
              <li key={t.id}>
                {t.theaterId && t.theater ? (
                  <Link href={`/films/theater/${t.theaterId}`}>{t.theater.name}</Link>
                ) : (
                  t.venueText
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
