import type { FestivalDetail } from '@/types/festival'
import { safeUrl } from './safeUrl'

/**
 * 영화제 페이지의 Festival(Event 하위 타입) 스키마.
 * 일정·장소가 있는 전형적인 Event인데 마크업이 없어 답변형 AI·리치 결과에서
 * 빠지던 것을 채운다. 상태(진행/종료)는 저장하지 않으므로 날짜만 내보낸다.
 */
export function toFestivalSchema(
  festival: FestivalDetail,
  baseUrl: string,
): Record<string, unknown> {
  const venueNames = [
    ...new Set(
      festival.theaters
        .map((t) => t.theater?.name ?? t.venueText)
        .filter((name): name is string => Boolean(name)),
    ),
  ]
  const bannerUrl = safeUrl(festival.bannerUrl)

  return {
    '@context': 'https://schema.org',
    '@type': 'Festival',
    name: festival.name,
    startDate: festival.startDate,
    endDate: festival.endDate,
    url: `${baseUrl}/festival/${festival.slug}`,
    ...(festival.description ? { description: festival.description } : {}),
    ...(bannerUrl ? { image: bannerUrl } : {}),
    location: venueNames.length > 0
      ? venueNames.map((name) => ({
          '@type': 'Place',
          name,
          address: { '@type': 'PostalAddress', addressLocality: festival.city },
        }))
      : {
          '@type': 'Place',
          name: festival.venueText ?? festival.city,
          address: { '@type': 'PostalAddress', addressLocality: festival.city },
        },
    ...(festival.movies.length > 0
      ? {
          workFeatured: festival.movies.map((m) => ({
            '@type': 'Movie',
            name: m.movie?.title ?? m.movieTitleSnapshot,
            ...(m.movieId ? { url: `${baseUrl}/movie/${m.movieId}` } : {}),
          })),
        }
      : {}),
  }
}
