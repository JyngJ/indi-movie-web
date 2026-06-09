import type { Theater } from '@/types/api'
import { safeUrl } from './safeUrl'

export function toTheaterSchema(theater: Theater, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MovieTheater',
    name: theater.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: theater.address,
      addressLocality: theater.city,
      addressCountry: 'KR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: theater.lat,
      longitude: theater.lng,
    },
    ...(theater.phone && { telephone: theater.phone }),
    ...(safeUrl(theater.website) && { url: safeUrl(theater.website) }),
    sameAs: `${baseUrl}/theater/${theater.id}`,
  }
}
