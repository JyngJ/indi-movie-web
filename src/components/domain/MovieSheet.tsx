'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PosterThumb } from './PosterThumb'
import { ShowtimeCell } from './ShowtimeCell'
import { Skeleton } from '@/components/primitives/Skeleton'
import { useMovieDetail, useMovieTheaterShowtimes } from '@/lib/supabase/queries'
import { GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { withFlag } from '@/lib/nations'
import type { Showtime } from '@/types/api'

const TOP_MARGIN = 72  // 검색바 아래에서 시작 — 지도가 살짝 보이게

const IcoClose = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
const IcoMap = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" /><path d="M8 2v16M16 6v16" />
  </svg>
)
const IcoExternal = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`
}

function showtimeKind(s: Showtime): 'soldout' | 'low' | 'normal' {
  if (s.seatTotal > 0 && s.seatAvailable === 0) return 'soldout'
  if (s.seatTotal > 0 && s.seatAvailable / s.seatTotal < 0.2) return 'low'
  return 'normal'
}

interface MovieSheetProps {
  movieId: string
  onClose: () => void
  onTheaterSelect?: (theaterId: string) => void
}

export function MovieSheet({ movieId, onClose, onTheaterSelect }: MovieSheetProps) {
  const router = useRouter()
  const { data: movie, isLoading: movieLoading } = useMovieDetail(movieId)
  const { data: theaters = [], isLoading: showsLoading } = useMovieTheaterShowtimes(movieId)

  const [visible, setVisible] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(id) }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  const sheetStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    top: TOP_MARGIN,
    zIndex: 1050,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--color-surface-card)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
    transform: visible ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
    overflow: 'hidden',
  }

  return (
    <>
      {/* 배경 딤 */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1049,
          background: 'rgba(0,0,0,0.32)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.28s ease',
        }}
      />
      <div style={sheetStyle}>
        {/* 핸들 + 닫기 */}
        <div style={{ flexShrink: 0, position: 'relative', padding: '10px 16px 0' }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            backgroundColor: 'var(--color-border)',
            margin: '0 auto 8px',
          }} />
          <button
            onClick={handleClose}
            style={{
              position: 'absolute', top: 8, right: 12,
              width: 32, height: 32, borderRadius: '50%',
              border: 'none', background: 'var(--color-surface-overlay)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--color-text-primary)',
            }}
          >
            <IcoClose />
          </button>
        </div>

        {/* 스크롤 본문 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: GLOBAL_NAV_MOBILE_HEIGHT + 16,
        }}>
          {/* 영화 헤더 */}
          <div style={{ display: 'flex', gap: 14, padding: '12px 16px 16px' }}>
            <div style={{ flexShrink: 0 }}>
              {movieLoading
                ? <Skeleton width={80} height={120} rounded="md" />
                : <PosterThumb src={movie?.posterUrl} alt={movie?.title ?? ''} width={80} height={120} size="lg" />
              }
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
              {movieLoading ? (
                <>
                  <Skeleton width="80%" height={22} rounded="sm" />
                  <Skeleton width="50%" height={16} rounded="sm" />
                </>
              ) : movie ? (
                <>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                    {movie.title}
                  </h2>
                  {movie.originalTitle && (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-caption)', lineHeight: 1.3 }}>
                      {movie.originalTitle}
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-body)' }}>
                    {[
                      movie.year,
                      movie.runtimeMinutes ? `${movie.runtimeMinutes}분` : null,
                      movie.nation ? withFlag(movie.nation) : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                  {movie.director.length > 0 && (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-body)' }}>
                      감독 {movie.director.join(', ')}
                    </p>
                  )}
                  {movie.genre.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                      {movie.genre.map(g => (
                        <span key={g} style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 20,
                          backgroundColor: 'var(--color-surface-overlay)',
                          color: 'var(--color-text-caption)',
                        }}>{g}</span>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* 시놉시스 */}
          {movie?.synopsis && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--color-border)' }}>
              <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.7 }}>
                {movie.synopsis}
              </p>
            </div>
          )}

          {/* 상영 중인 극장 */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <h3 style={{ margin: '0 0 8px', padding: '0 16px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              상영 중인 극장
            </h3>

            {showsLoading ? (
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0, 1, 2].map(i => <Skeleton key={i} width="100%" height={48} rounded="md" />)}
              </div>
            ) : theaters.length === 0 ? (
              <p style={{ margin: 0, padding: '4px 16px 16px', fontSize: 13, color: 'var(--color-text-caption)' }}>
                현재 상영 정보가 없어요
              </p>
            ) : theaters.map(theater => (
              <div key={theater.theaterId} style={{ marginBottom: 16 }}>
                {/* 극장 이름 */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 16px', backgroundColor: 'var(--color-surface-base)',
                }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {theater.theaterName}
                  </span>
                  {onTheaterSelect && (
                    <button
                      onClick={() => { onTheaterSelect(theater.theaterId); handleClose() }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 20,
                        border: '1px solid var(--color-border)',
                        background: 'none', cursor: 'pointer',
                        fontSize: 11, color: 'var(--color-text-body)',
                      }}
                    >
                      <IcoMap /> 지도에서 보기
                    </button>
                  )}
                </div>

                {/* 날짜별 상영 */}
                {theater.dateGroups.map(({ date, showtimes }) => (
                  <div key={date} style={{ padding: '8px 16px 0' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-caption)' }}>
                      {formatDate(date)}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {showtimes.map(show => (
                        <ShowtimeCell
                          key={show.id}
                          startTime={show.showTime}
                          endTime={show.endTime ?? ''}
                          seatAvailable={show.seatAvailable}
                          seatTotal={show.seatTotal}
                          screenName={show.screenName}
                          kind={showtimeKind(show)}
                          onClick={show.bookingUrl ? () => window.open(show.bookingUrl, '_blank', 'noopener') : undefined}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* 전체 화면 버튼 */}
          <div style={{ padding: '8px 16px 16px' }}>
            <button
              onClick={() => router.push(`/movie/${movieId}`)}
              style={{
                width: '100%', padding: '12px 0',
                borderRadius: 10, border: '1px solid var(--color-border)',
                background: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
              }}
            >
              <IcoExternal /> 영화 상세 전체 화면으로 보기
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
