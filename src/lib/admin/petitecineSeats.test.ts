import { describe, expect, it } from 'vitest'
import { petitecineSeats } from './crawler'

describe('petitecineSeats — 쁘띠씨네 잔여석', () => {
  it('ticketing_seat_count는 예매 수라 총 좌석에서 뺀다', () => {
    expect(petitecineSeats({ movie_seat_count: 212, ticketing_seat_count: 0 })).toEqual({ seatAvailable: 212, seatTotal: 212 })
    expect(petitecineSeats({ movie_seat_count: 283, ticketing_seat_count: 20 })).toEqual({ seatAvailable: 263, seatTotal: 283 })
  })

  it('전부 팔렸을 때만 0석이고, 넘쳐도 음수로 내려가지 않는다', () => {
    expect(petitecineSeats({ movie_seat_count: 28, ticketing_seat_count: 28 })).toEqual({ seatAvailable: 0, seatTotal: 28 })
    expect(petitecineSeats({ movie_seat_count: 28, ticketing_seat_count: 30 })).toEqual({ seatAvailable: 0, seatTotal: 28 })
  })

  it('API가 숫자를 문자열로 줘도 읽는다', () => {
    expect(petitecineSeats({ movie_seat_count: '60', ticketing_seat_count: '3' })).toEqual({ seatAvailable: 57, seatTotal: 60 })
  })

  it('총 좌석이 없으면 잔여석도 모르는 것으로 둔다', () => {
    expect(petitecineSeats({ ticketing_seat_count: 0 })).toEqual({ seatAvailable: 0, seatTotal: 0 })
    expect(petitecineSeats({ movie_seat_count: 'x', ticketing_seat_count: 0 })).toEqual({ seatAvailable: 0, seatTotal: 0 })
  })
})
