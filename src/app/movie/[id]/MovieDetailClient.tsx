'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMovieDetail, useMovieTheaterShowtimes, useActiveMovieIds } from '@/lib/supabase/queries'
import type { MovieDetail, MovieTheaterEntry } from '@/lib/supabase/queries'

/* ── 아이콘 ─────────────────────────────────────────────────────── */
const IcoChevronLeft = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
const IcoStar = ({ filled }: { filled?: boolean }) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill={filled ? 'var(--color-primary-base)' : 'none'} stroke={filled ? 'var(--color-primary-base)' : 'currentColor'} strokeWidth="1.8" strokeLinejoin="round">
    <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z" />
  </svg>
)
const IcoChevronRight = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
)
const IcoMap = () => (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
)
const IcoPin = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IcoUser = () => (
  <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

/* ── NavBar ── */
function NavBar({
  title,
  titleVisible,
  onBack,
  starred,
  onStar,
}: {
  title: string
  titleVisible: boolean
  onBack: () => void
  starred?: boolean
  onStar?: () => void
}) {
  const btn: React.CSSProperties = {
    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-body)',
    flexShrink: 0,
  }
  return (
    <div style={{
      height: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 4,
      paddingRight: 4,
      borderBottom: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface-bg)',
    }}>
      <button style={btn} onClick={onBack}><IcoChevronLeft /></button>
      <span style={{
        flex: 1,
        textAlign: 'center',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        padding: '0 4px',
        opacity: titleVisible ? 1 : 0,
        transition: 'opacity 180ms ease',
      }}>
        {title}
      </span>
      <button style={btn} onClick={onStar}><IcoStar filled={starred} /></button>
    </div>
  )
}

/* ── HeroSection ── */
function HeroSection({ movie, titleRef }: { movie: MovieDetail; titleRef: React.Ref<HTMLHeadingElement> }) {
  return (
    <div style={{
      background: 'linear-gradient(to bottom, var(--color-primary-subtle-l) 0%, var(--color-surface-bg) 100%)',
      padding: '24px 20px 20px',
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
    }}>
      {/* 포스터 */}
      <div style={{ flexShrink: 0, position: 'relative', width: 96, height: 144 }}>
        {movie.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={movie.posterUrl}
            alt=""
            style={{ width: 96, height: 144, borderRadius: 8, objectFit: 'cover', display: 'block', boxShadow: '0 8px 28px rgba(0,0,0,0.45)' }}
          />
        ) : (
          <div style={{
            width: 96, height: 144, borderRadius: 8,
            backgroundColor: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            background: 'repeating-linear-gradient(135deg, rgba(128,128,128,0.08) 0 7px, transparent 7px 14px)',
          }} />
        )}
      </div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
        <h1
          ref={titleRef}
          style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text-primary)', wordBreak: 'keep-all' }}
        >
          {movie.title}
        </h1>
        {movie.originalTitle && (
          <div style={{ marginTop: 4, fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 11, color: 'var(--color-text-caption)', lineHeight: 1.4 }}>
            {movie.originalTitle}
          </div>
        )}
        {movie.genre.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
            {movie.genre.map((g) => (
              <span key={g} style={{
                height: 22, padding: '0 9px',
                display: 'inline-flex', alignItems: 'center',
                borderRadius: 999, fontSize: 11, fontWeight: 500,
                backgroundColor: 'var(--color-primary-subtle-l)',
                border: '1px solid color-mix(in srgb, var(--color-primary-base) 40%, transparent)',
                color: 'var(--color-primary-base)',
              }}>{g}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--color-text-sub)', lineHeight: 1.5 }}>
          {[movie.nation, movie.year, movie.runtimeMinutes ? `${movie.runtimeMinutes}분` : null].filter(Boolean).join(' · ')}
        </div>
        {movie.rating != null && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ color: 'var(--color-warning)', fontSize: 14 }}>★</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', fontFeatureSettings: '"tnum"' }}>{movie.rating.toFixed(1)}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>&nbsp;/ 10</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-caption)' }}>관객 평점</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── TabBar ── */
function TabBar({ active, onChange }: { active: 'info' | 'theaters'; onChange: (t: 'info' | 'theaters') => void }) {
  const tabs: Array<{ key: 'info' | 'theaters'; label: string }> = [
    { key: 'info', label: '영화 정보' },
    { key: 'theaters', label: '상영 영화관' },
  ]
  return (
    <div style={{
      position: 'sticky',
      top: 'calc(env(safe-area-inset-top) + 52px)',
      zIndex: 40,
      display: 'flex',
      borderBottom: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface-bg)',
    }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            flex: 1, height: 44,
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 14,
            fontWeight: active === t.key ? 600 : 400,
            color: active === t.key ? 'var(--color-primary-base)' : 'var(--color-text-caption)',
            borderBottom: active === t.key ? '2px solid var(--color-primary-base)' : '2px solid transparent',
            transition: 'color 150ms, border-color 150ms',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/* ── InfoTab ── */
function InfoTab({ movie, onDirectorClick }: { movie: MovieDetail; onDirectorClick: (name: string) => void }) {
  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase',
    color: 'var(--color-text-caption)', marginBottom: 10,
  }
  const divider: React.CSSProperties = { borderTop: '1px solid var(--color-border)', margin: '0 20px' }

  return (
    <div style={{ paddingBottom: 52 }}>
      {movie.synopsis && (
        <div style={{ padding: '24px 20px' }}>
          <p style={sectionLabel}>시놉시스</p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-body)', wordBreak: 'keep-all' }}>
            {movie.synopsis}
          </p>
        </div>
      )}

      {movie.director.length > 0 && (
        <>
          <div style={divider} />
          <div style={{ padding: '20px 20px' }}>
            <p style={sectionLabel}>감독</p>
            {movie.director.map((name) => (
              <button
                key={name}
                onClick={() => onDirectorClick(name)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface-card)',
                  cursor: 'pointer', textAlign: 'left', marginBottom: 10, minHeight: 'auto',
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: 'var(--color-text-caption)',
                }}>
                  <IcoUser />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>{name}</div>
                  <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-primary-base)', fontWeight: 500 }}>감독 페이지 보기 →</div>
                </div>
                <IcoChevronRight />
              </button>
            ))}
          </div>
        </>
      )}

      <div style={divider} />
      <div style={{ padding: '20px 20px' }}>
        <p style={sectionLabel}>상세 정보</p>
        <div style={{ borderRadius: 10, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          {[
            { key: '국가', value: movie.nation },
            { key: '개봉', value: movie.year ? String(movie.year) : undefined },
            { key: '상영 시간', value: movie.runtimeMinutes ? `${movie.runtimeMinutes}분` : undefined },
            { key: '장르', value: movie.genre.join(', ') || undefined },
          ].filter((r) => r.value).map((row, i, arr) => (
            <div key={row.key} style={{
              display: 'flex', alignItems: 'center', padding: '13px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}>
              <span style={{ width: 72, flexShrink: 0, fontSize: 13, color: 'var(--color-text-sub)', fontWeight: 500 }}>{row.key}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── TheaterShowtimeChips ── */
function TheaterShowtimeChips({ entry }: { entry: MovieTheaterEntry }) {
  return (
    <div>
      <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{
          marginTop: 5, width: 8, height: 8, borderRadius: '50%',
          backgroundColor: 'var(--color-primary-base)', flexShrink: 0, display: 'block',
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {entry.theaterName}
          </div>
          <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 3, color: 'var(--color-text-sub)', fontSize: 12 }}>
            <IcoPin />
            {entry.theaterAddress}
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {entry.showtimes.map((st) => {
          const soldout = st.seatAvailable === 0
          const low = !soldout && st.seatAvailable <= 20
          const seatColor = soldout ? 'var(--color-error)' : low ? 'var(--color-warning)' : 'var(--color-primary-base)'
          return (
            <button
              key={st.id}
              disabled={soldout}
              onClick={st.bookingUrl ? () => window.open(st.bookingUrl!, '_blank', 'noopener') : undefined}
              style={{
                padding: '10px 14px', borderRadius: 10,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface-raised)',
                cursor: soldout ? 'default' : (st.bookingUrl ? 'pointer' : 'default'),
                opacity: soldout ? 0.5 : 1,
                textAlign: 'left', minHeight: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 16, fontWeight: 700, fontFeatureSettings: '"tnum"', color: 'var(--color-text-primary)' }}>
                  {st.showTime.slice(0, 5)}
                </span>
                {st.endTime && (
                  <span style={{ fontSize: 10, color: 'var(--color-text-caption)', fontFeatureSettings: '"tnum"' }}>
                    -{st.endTime.slice(0, 5)}
                  </span>
                )}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, fontFeatureSettings: '"tnum"' }}>
                <span style={{ fontWeight: 600, color: seatColor }}>{st.seatAvailable}</span>
                <span style={{ color: 'var(--color-text-sub)' }}>/{st.seatTotal}석</span>
                {low && !soldout && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--color-warning)', fontWeight: 600 }}>잔여↓</span>}
                {soldout && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--color-error)', fontWeight: 700 }}>매진</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── TheatersTab ── */
function TheatersTab({ movieId, onMapClick }: { movieId: string; onMapClick: () => void }) {
  const { data: theaters = [], isLoading } = useMovieTheaterShowtimes(movieId)
  return (
    <div style={{ padding: '20px 20px 52px' }}>
      <button
        onClick={onMapClick}
        style={{
          width: '100%', height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderRadius: 10, border: '1px solid var(--color-primary-base)',
          backgroundColor: 'var(--color-primary-subtle-l)',
          color: 'var(--color-primary-base)', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', marginBottom: 20,
        }}
      >
        <IcoMap />
        상영중인 영화관 지도에서 보기
      </button>

      {!isLoading && (
        <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--color-text-caption)' }}>
          상영 중 · {theaters.length}곳
        </p>
      )}

      {isLoading ? (
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-caption)', fontSize: 13 }}>
          불러오는 중…
        </div>
      ) : theaters.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'var(--color-text-caption)' }}>
          오늘 상영 중인 영화관이 없습니다
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {theaters.map((entry) => (
            <div key={entry.theaterId} style={{
              borderRadius: 12, border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface-card)', overflow: 'hidden',
            }}>
              <TheaterShowtimeChips entry={entry} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── 메인 ── */
export function MovieDetailClient({ movieId, theaterId }: { movieId: string; theaterId?: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<'info' | 'theaters'>('info')
  // const [starred, setStarred] = useState(false) // 즐겨찾기 — 계정 기능 구현 전 비활성화
  const [titleInNav, setTitleInNav] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)

  const { data: movie, isLoading } = useMovieDetail(movieId)
  const { data: activeIds = [] } = useActiveMovieIds()
  void activeIds

  // 제목이 sticky NavBar 아래로 스크롤되면 NavBar에 영화 제목 표시
  useEffect(() => {
    if (!movie) return
    const el = titleRef.current
    if (!el) return
    const onScroll = () => {
      setTitleInNav(el.getBoundingClientRect().bottom < 60)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [movie])

  const handleBack = () => theaterId ? router.push(`/?theater=${theaterId}`) : router.back()
  const handleDirectorClick = (name: string) => router.push(`/director/${encodeURIComponent(name)}`)
  const handleMapClick = () => router.push(`/?movie=${movieId}`)

  if (isLoading) {
    return (
      <div style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-caption)' }}>불러오는 중…</span>
      </div>
    )
  }

  if (!movie) {
    return (
      <div style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top)', backgroundColor: 'var(--color-surface-bg)' }}>
          <NavBar title="영화 정보" titleVisible onBack={handleBack} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 14, color: 'var(--color-text-caption)' }}>영화를 찾을 수 없습니다</span>
          <button onClick={handleBack} style={{ fontSize: 13, color: 'var(--color-primary-base)', border: 'none', background: 'none', cursor: 'pointer' }}>돌아가기</button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="page-slide-in"
      style={{ minHeight: '100svh', backgroundColor: 'var(--color-surface-bg)' }}
    >
      {/* Sticky 상단 바: safe-area + NavBar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        paddingTop: 'env(safe-area-inset-top)',
        backgroundColor: 'var(--color-surface-bg)',
      }}>
        {/* starred / onStar — 즐겨찾기 계정 기능 구현 전 비활성화 */}
        <NavBar
          title={movie.title}
          titleVisible={titleInNav}
          onBack={handleBack}
        />
      </div>

      <HeroSection movie={movie} titleRef={titleRef} />

      <TabBar active={tab} onChange={setTab} />

      {tab === 'info'
        ? <InfoTab movie={movie} onDirectorClick={handleDirectorClick} />
        : <TheatersTab movieId={movieId} onMapClick={handleMapClick} />
      }

      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </div>
  )
}
