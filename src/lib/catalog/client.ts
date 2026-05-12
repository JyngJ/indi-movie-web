'use client'

import { useQuery } from '@tanstack/react-query'
import type { CatalogResponse } from '@/types/catalog'
import { MOCK_MOVIES } from '@/mocks/movies'
import { MOCK_SHOWTIMES } from '@/mocks/showtimes'
import { MOCK_THEATERS } from '@/mocks/theaters'

export const catalogQueryKey = ['catalog']

export function useCatalog() {
  return useQuery({
    queryKey: catalogQueryKey,
    queryFn: fetchCatalog,
    placeholderData: mockCatalog(),
  })
}

async function fetchCatalog(): Promise<CatalogResponse> {
  const response = await fetch('/api/catalog', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('상영 카탈로그를 불러오지 못했습니다.')
  }
  return response.json() as Promise<CatalogResponse>
}

function mockCatalog(): CatalogResponse {
  const today = new Date()
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + index)
    return date.toISOString().slice(0, 10)
  })

  return {
    theaters: MOCK_THEATERS.map((theater) => ({ ...theater, kind: 'indie' as const, city: theater.address.slice(0, 2) })),
    movies: MOCK_MOVIES.map((movie) => ({
      id: movie.id,
      title: movie.title,
      director: movie.director,
      synopsis: movie.synopsis,
      tags: movie.tags ?? [],
    })),
    showtimes: MOCK_THEATERS.flatMap((theater, theaterIndex) =>
      MOCK_SHOWTIMES.map((showtime, showtimeIndex) => ({
        ...showtime,
        theaterId: theater.id,
        showDate: dates[(theaterIndex + showtimeIndex) % dates.length],
      })),
    ),
    generatedAt: new Date().toISOString(),
  }
}
