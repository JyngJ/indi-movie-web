import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  permanentRedirect: (url: string) => { throw new Error(`redirect:${url}`) },
}))
import FilmsMovieDetailPage from './page'

describe('legacy movie links', () => {
  it('preserves shared showtime selection and repeated query values', async () => {
    await expect(FilmsMovieDetailPage({
      params: Promise.resolve({ id: 'movie-id' }),
      searchParams: Promise.resolve({ date: '2026-09-15', theater: 'theater-id', showtime: 'showtime-id', tag: ['a', 'b'], absent: undefined }),
    })).rejects.toThrow('redirect:/movie/movie-id?date=2026-09-15&theater=theater-id&showtime=showtime-id&tag=a&tag=b')
  })
  it('redirects plain links without an empty query', async () => {
    await expect(FilmsMovieDetailPage({ params: Promise.resolve({ id: 'movie-id' }), searchParams: Promise.resolve({}) }))
      .rejects.toThrow('redirect:/movie/movie-id')
  })
})
