import type { ShowtimeKind } from '@/components/domain/ShowtimeCell'

export interface MockShowtime {
  id: string
  movieId: string
  startTime: string
  endTime: string
  seatAvailable: number
  seatTotal: number
  screenName: string
  kind: ShowtimeKind
  promo?: string
}

export const MOCK_SHOWTIMES: MockShowtime[] = [
  // ── 비밀의 언덕 (m1, 105분) ──
  { id: 's1-1', movieId: 'm1', startTime: '10:30', endTime: '12:15', seatAvailable: 54, seatTotal: 80, screenName: '1관', kind: 'normal' },
  { id: 's1-2', movieId: 'm1', startTime: '13:10', endTime: '14:55', seatAvailable: 9,  seatTotal: 80, screenName: '1관', kind: 'low' },
  { id: 's1-3', movieId: 'm1', startTime: '17:00', endTime: '18:45', seatAvailable: 0,  seatTotal: 80, screenName: '1관', kind: 'soldout' },
  { id: 's1-4', movieId: 'm1', startTime: '20:20', endTime: '22:05', seatAvailable: 38, seatTotal: 80, screenName: '1관', kind: 'normal' },
  { id: 's1-5', movieId: 'm1', startTime: '23:50', endTime: '01:35', seatAvailable: 22, seatTotal: 60, screenName: '2관', kind: 'late' },

  // ── 세 번째 살인 (m2, 124분) ──
  { id: 's2-1', movieId: 'm2', startTime: '11:00', endTime: '13:04', seatAvailable: 47, seatTotal: 100, screenName: '2관', kind: 'normal' },
  { id: 's2-2', movieId: 'm2', startTime: '15:30', endTime: '17:34', seatAvailable: 12, seatTotal: 100, screenName: '2관', kind: 'low' },
  { id: 's2-3', movieId: 'm2', startTime: '19:10', endTime: '21:14', seatAvailable: 0,  seatTotal: 100, screenName: '2관', kind: 'soldout' },
  { id: 's2-4', movieId: 'm2', startTime: '22:00', endTime: '00:04', seatAvailable: 55, seatTotal: 100, screenName: '2관', kind: 'late' },

  // ── 아노라 (m3, 139분) ──
  { id: 's3-1', movieId: 'm3', startTime: '10:00', endTime: '12:19', seatAvailable: 60, seatTotal: 80, screenName: '3관', kind: 'normal' },
  { id: 's3-2', movieId: 'm3', startTime: '14:30', endTime: '16:49', seatAvailable: 30, seatTotal: 80, screenName: '3관', kind: 'normal' },
  { id: 's3-3', movieId: 'm3', startTime: '18:00', endTime: '20:19', seatAvailable: 5,  seatTotal: 80, screenName: '3관', kind: 'low' },
  { id: 's3-4', movieId: 'm3', startTime: '21:30', endTime: '23:49', seatAvailable: 44, seatTotal: 80, screenName: '3관', kind: 'late' },

  // ── 패스트 라이브즈 (m4, 105분) ──
  { id: 's4-1', movieId: 'm4', startTime: '11:30', endTime: '13:15', seatAvailable: 72, seatTotal: 90, screenName: '1관', kind: 'normal' },
  { id: 's4-2', movieId: 'm4', startTime: '15:00', endTime: '16:45', seatAvailable: 0,  seatTotal: 90, screenName: '1관', kind: 'soldout' },
  { id: 's4-3', movieId: 'm4', startTime: '18:30', endTime: '20:15', seatAvailable: 18, seatTotal: 90, screenName: '1관', kind: 'low' },
  { id: 's4-4', movieId: 'm4', startTime: '21:30', endTime: '23:15', seatAvailable: 50, seatTotal: 90, screenName: '1관', kind: 'normal' },

  // ── 콘크리트 유토피아 (m5, 130분) ──
  { id: 's5-1', movieId: 'm5', startTime: '10:20', endTime: '12:30', seatAvailable: 40, seatTotal: 120, screenName: '4관', kind: 'normal' },
  { id: 's5-2', movieId: 'm5', startTime: '14:00', endTime: '16:10', seatAvailable: 88, seatTotal: 120, screenName: '4관', kind: 'normal' },
  { id: 's5-3', movieId: 'm5', startTime: '18:00', endTime: '20:10', seatAvailable: 3,  seatTotal: 120, screenName: '4관', kind: 'low' },
  { id: 's5-4', movieId: 'm5', startTime: '21:00', endTime: '23:10', seatAvailable: 0,  seatTotal: 120, screenName: '4관', kind: 'soldout' },
  { id: 's5-5', movieId: 'm5', startTime: '23:50', endTime: '02:00', seatAvailable: 67, seatTotal: 80,  screenName: '5관', kind: 'late' },

  // ── 다음 소희 (m6, 138분) ──
  { id: 's6-1', movieId: 'm6', startTime: '11:00', endTime: '13:18', seatAvailable: 35, seatTotal: 70, screenName: '2관', kind: 'normal' },
  { id: 's6-2', movieId: 'm6', startTime: '14:30', endTime: '16:48', seatAvailable: 0,  seatTotal: 70, screenName: '2관', kind: 'soldout' },
  { id: 's6-3', movieId: 'm6', startTime: '18:00', endTime: '20:18', seatAvailable: 28, seatTotal: 70, screenName: '2관', kind: 'normal' },
  { id: 's6-4', movieId: 'm6', startTime: '21:00', endTime: '23:18', seatAvailable: 7,  seatTotal: 70, screenName: '2관', kind: 'low' },
]
