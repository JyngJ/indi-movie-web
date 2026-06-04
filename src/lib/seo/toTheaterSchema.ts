import type { Theater } from '@/types/api'

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
    ...(theater.website && { url: theater.website }),
    sameAs: `${baseUrl}/theater/${theater.id}`,
  }
}
