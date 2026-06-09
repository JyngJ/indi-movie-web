'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTheaterAllMovies } from '@/lib/supabase/queries'
import type { Theater } from '@/types/api'
import { safeUrl } from '@/lib/seo/safeUrl'

const IcoChevronLeft = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
const IcoExternal = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)
const IcoInstagram = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)
const IcoPin = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IcoPhone = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
)

const s = {
  page: {
    minHeight: '100dvh',
    background: 'var(--color-surface-bg)',
    fontFamily: 'var(--font-sans)',
    maxWidth: 'var(--max-width-mobile)',
    margin: '0 auto',
  } as React.CSSProperties,
  nav: {
    display: 'flex',
    alignItems: 'center',
    height: 'var(--header-height)',
    padding: '0 4px',
    borderBottom: '1px solid var(--color-border)',
    position: 'sticky',
    top: 0,
    background: 'var(--color-surface-bg)',
    zIndex: 10,
  } as React.CSSProperties,
  backBtn: {
    width: 44, height: 44,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'none', cursor: 'pointer',
    color: 'var(--color-text-body)',
    flexShrink: 0,
  } as React.CSSProperties,
  navTitle: {
    flex: 1,
    fontSize: 16, fontWeight: 600,
    color: 'var(--color-text-primary)',
    textAlign: 'center' as const,
    paddingRight: 44,
  } as React.CSSProperties,
  section: {
    padding: '20px 16px',
    borderBottom: '1px solid var(--color-border)',
  } as React.CSSProperties,
  theaterName: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-h2)',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    marginBottom: 4,
  } as React.CSSProperties,
  cityBadge: {
    display: 'inline-block',
    fontSize: 12, fontWeight: 600,
    color: 'var(--color-primary-base)',
    background: 'var(--color-primary-subtle-l)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px 8px',
    marginBottom: 12,
  } as React.CSSProperties,
  infoRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    color: 'var(--color-text-body)',
    fontSize: 14,
    marginBottom: 8,
  } as React.CSSProperties,
  infoIcon: {
    flexShrink: 0,
    marginTop: 2,
    color: 'var(--color-text-caption)',
  } as React.CSSProperties,
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    color: 'var(--color-primary-base)',
    textDecoration: 'none',
    fontSize: 14,
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-caption)',
    marginBottom: 12,
  } as React.CSSProperties,
  movieGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  } as React.CSSProperties,
  movieCard: {
    cursor: 'pointer',
  } as React.CSSProperties,
  posterWrap: {
    aspectRatio: '2/3',
    borderRadius: 'var(--comp-poster-radius)',
    overflow: 'hidden',
    background: 'var(--color-surface-raised)',
    marginBottom: 6,
    position: 'relative' as const,
  } as React.CSSProperties,
  movieTitle: {
    fontSize: 12, fontWeight: 600,
    color: 'var(--color-text-body)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  movieMeta: {
    fontSize: 11,
    color: 'var(--color-text-caption)',
  } as React.CSSProperties,
  empty: {
    textAlign: 'center' as const,
    color: 'var(--color-text-caption)',
    fontSize: 14,
    padding: '32px 0',
  } as React.CSSProperties,
}

export function TheaterDetailClient({ theater }: { theater: Theater }) {
  const router = useRouter()
  const { data: movies, isLoading } = useTheaterAllMovies(theater.id)

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <button style={s.backBtn} onClick={() => router.push('/')} aria-label="홈으로">
          <IcoChevronLeft />
        </button>
        <span style={s.navTitle}>{theater.name}</span>
      </nav>

      <div style={s.section}>
        <h1 style={s.theaterName}>{theater.name}</h1>
        <span style={s.cityBadge}>{theater.city}</span>

        <div style={s.infoRow}>
          <span style={s.infoIcon}><IcoPin /></span>
          <span>{theater.address}</span>
        </div>

        {theater.phone && (
          <div style={s.infoRow}>
            <span style={s.infoIcon}><IcoPhone /></span>
            <a href={`tel:${theater.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              {theater.phone}
            </a>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          {safeUrl(theater.website) && (
            <a href={safeUrl(theater.website)} target="_blank" rel="noopener noreferrer" style={s.link}>
              웹사이트 <IcoExternal />
            </a>
          )}
          {safeUrl(theater.instagramUrl) && (
            <a href={safeUrl(theater.instagramUrl)} target="_blank" rel="noopener noreferrer" style={s.link}>
              <IcoInstagram /> 인스타그램
            </a>
          )}
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>현재 상영 중</div>
        {isLoading && (
          <div style={s.empty}>불러오는 중...</div>
        )}
        {!isLoading && (!movies || movies.length === 0) && (
          <div style={s.empty}>현재 상영 정보가 없습니다.</div>
        )}
        {movies && movies.length > 0 && (
          <div style={s.movieGrid}>
            {movies.map(({ movie }) => (
              <div
                key={movie.id}
                style={s.movieCard}
                onClick={() => router.push(`/movie/${movie.id}?theater=${theater.id}`)}
              >
                <div style={s.posterWrap}>
                  {movie.posterUrl ? (
                    movie.posterUrl.includes('supabase.co') ? (
                      <Image
                        src={movie.posterUrl}
                        alt={movie.title}
                        fill
                        sizes="(max-width: 480px) 30vw, 140px"
                        style={{ objectFit: 'cover' }}
                        loading="lazy"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    )
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--color-surface-raised)' }} />
                  )}
                </div>
                <div style={s.movieTitle}>{movie.title}</div>
                <div style={s.movieMeta}>{movie.year}{movie.director ? ` · ${movie.director}` : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer style={{ padding: '20px 16px', fontSize: 11, color: 'var(--color-text-caption)', textAlign: 'center' }}>
        출처 – 한국기계연구원, kimm.re.kr
      </footer>
    </div>
  )
}
