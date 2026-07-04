import { describe, expect, it } from 'vitest'
import { toScreeningEventSchema, MAX_SCREENING_EVENTS } from './toScreeningEventSchema'
import type { MovieTheaterEntry } from '@/lib/catalog/getMovieTheaterShowtimes'

function entry(overrides: Partial<MovieTheaterEntry> = {}): MovieTheaterEntry {
  return {
    theaterId: 't1',
    theaterName: '인디극장',
    theaterAddress: '서울시 마포구',
    theaterLat: null,
    theaterLng: null,
    dateGroups: [],
    ...overrides,
  }
}

describe('toScreeningEventSchema', () => {
  it('builds one ScreeningEvent per showtime with KST offset and location', () => {
    const entries: MovieTheaterEntry[] = [
      entry({
        dateGroups: [
          {
            date: '2026-07-05',
            showtimes: [{
              id: 's1', movieId: 'm1', movieTitle: '', theaterId: 't1', screenName: '1관',
              showDate: '2026-07-05', showTime: '19:30', formatType: 'standard', language: 'korean',
              seatAvailable: 10, seatTotal: 50, price: 0, bookingUrl: 'https://book.example/1',
            }],
          },
        ],
      }),
    ]

    const result = toScreeningEventSchema({ id: 'm1', title: '화양연화' }, entries, 'https://example.com')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      '@type': 'ScreeningEvent',
      startDate: '2026-07-05T19:30:00+09:00',
      location: { '@type': 'MovieTheater', name: '인디극장', address: '서울시 마포구' },
      offers: { '@type': 'Offer', url: 'https://book.example/1' },
      workPresented: { '@type': 'Movie', name: '화양연화', url: 'https://example.com/movie/m1' },
    })
  })

  it('omits offers when there is no booking url', () => {
    const entries: MovieTheaterEntry[] = [
      entry({
        dateGroups: [{
          date: '2026-07-05',
          showtimes: [{
            id: 's1', movieId: 'm1', movieTitle: '', theaterId: 't1', screenName: '1관',
            showDate: '2026-07-05', showTime: '19:30', formatType: 'standard', language: 'korean',
            seatAvailable: 10, seatTotal: 50, price: 0,
          }],
        }],
      }),
    ]

    const result = toScreeningEventSchema({ id: 'm1', title: '화양연화' }, entries, 'https://example.com')
    expect(result[0].offers).toBeUndefined()
  })

  it('adds endDate from endTime, rolling over to the next day past midnight', () => {
    const entries: MovieTheaterEntry[] = [
      entry({
        dateGroups: [{
          date: '2026-07-05',
          showtimes: [
            {
              id: 's1', movieId: 'm1', movieTitle: '', theaterId: 't1', screenName: '1관',
              showDate: '2026-07-05', showTime: '19:30', endTime: '21:15',
              formatType: 'standard', language: 'korean', seatAvailable: 10, seatTotal: 50, price: 0,
            },
            {
              id: 's2', movieId: 'm1', movieTitle: '', theaterId: 't1', screenName: '1관',
              showDate: '2026-07-05', showTime: '23:50', endTime: '01:40',
              formatType: 'standard', language: 'korean', seatAvailable: 10, seatTotal: 50, price: 0,
            },
          ],
        }],
      }),
    ]

    const result = toScreeningEventSchema({ id: 'm1', title: '화양연화' }, entries, 'https://example.com')
    expect(result[0].endDate).toBe('2026-07-05T21:15:00+09:00')
    expect(result[1].endDate).toBe('2026-07-06T01:40:00+09:00')
  })

  it('caps output at MAX_SCREENING_EVENTS, keeping the nearest dates first', () => {
    const showtimes = Array.from({ length: MAX_SCREENING_EVENTS + 20 }, (_, i) => ({
      id: `s${i}`, movieId: 'm1', movieTitle: '', theaterId: 't1', screenName: '1관',
      showDate: `2026-07-${String(1 + (i % 28)).padStart(2, '0')}`, showTime: '10:00',
      formatType: 'standard' as const, language: 'korean' as const,
      seatAvailable: 10, seatTotal: 50, price: 0,
    }))
    const entries: MovieTheaterEntry[] = [
      entry({ dateGroups: [{ date: '2026-07-01', showtimes }] }),
    ]

    const result = toScreeningEventSchema({ id: 'm1', title: '화양연화' }, entries, 'https://example.com')
    expect(result).toHaveLength(MAX_SCREENING_EVENTS)
  })
})
