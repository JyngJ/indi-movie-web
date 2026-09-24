import type { FestivalDetail } from '@/types/festival'
import { safeUrl } from './safeUrl'
import { festivalMetaDescription } from './festivalSeo'

/**
 * 영화제 페이지의 Festival(Event 하위 타입) 스키마.
 * 일정·장소가 있는 전형적인 Event인데 마크업이 없어 답변형 AI·리치 결과에서
 * 빠지던 것을 채운다. 상태(진행/종료)는 저장하지 않으므로 날짜만 내보낸다.
 */
export function toFestivalSchema(
  festival: FestivalDetail,
  baseUrl: string,
): Record<string, unknown> {
  // 극장별 Place — theaters에 연결된 곳은 주소·좌표까지, 이름만 있는 행사장은 이름과 도시만
  const places = new Map<string, Record<string, unknown>>()
  for (const t of [...festival.theaters].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const name = t.theater?.name ?? t.venueText
    if (!name || places.has(name)) continue
    places.set(name, {
      '@type': 'Place',
      name,
      address: t.theater?.address
        ? { '@type': 'PostalAddress', streetAddress: t.theater.address, addressLocality: festival.city, addressCountry: 'KR' }
        : { '@type': 'PostalAddress', addressLocality: festival.city, addressCountry: 'KR' },
      ...(t.theater && Number.isFinite(t.theater.lat) && Number.isFinite(t.theater.lng)
        ? { geo: { '@type': 'GeoCoordinates', latitude: t.theater.lat, longitude: t.theater.lng } }
        : {}),
    })
  }
  const officialUrl = safeUrl(festival.linkUrl)
  // 스키마 image는 절대 주소여야 한다 — 포스터는 사이트 루트 경로(/images/...)로 올 수 있다
  const posterUrl = festival.posterUrl?.startsWith('/') ? `${baseUrl}${festival.posterUrl}` : festival.posterUrl
  const imageUrl = safeUrl(festival.bannerUrl) ?? safeUrl(posterUrl)

  return {
    '@context': 'https://schema.org',
    '@type': 'Festival',
    name: festival.name,
    startDate: festival.startDate,
    endDate: festival.endDate,
    url: `${baseUrl}/festival/${festival.slug}`,
    // 소개 문단이 없는 영화제도 기간·회차·극장으로 만든 설명을 싣는다(메타 설명과 같은 문장)
    description: festivalMetaDescription(festival),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(officialUrl ? { sameAs: officialUrl } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
    location: places.size > 0
      ? [...places.values()]
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
