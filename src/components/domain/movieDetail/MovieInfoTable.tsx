import type { MovieDetail } from '@/lib/supabase/queries'
import { withFlagsRaw } from '@/lib/nations'

/**
 * 영화 상세 정보 테이블 (국가/개봉/상영 시간/장르).
 * 모바일 전체화면 상세(MovieDetailClient)와 데스크톱 패널(MoviePanel)이 공유한다 —
 * 값이 다시 갈라지지 않도록 단일 소스로 유지할 것.
 */
export function MovieInfoTable({ movie }: { movie: Pick<MovieDetail, 'nation' | 'year' | 'runtimeMinutes' | 'genre'> }) {
  const rows = [
    { key: '국가', value: movie.nation ? withFlagsRaw(movie.nation) : undefined },
    { key: '개봉', value: movie.year ? String(movie.year) : undefined },
    { key: '상영 시간', value: movie.runtimeMinutes ? `${movie.runtimeMinutes}분` : undefined },
    { key: '장르', value: movie.genre.join(', ') || undefined },
  ].filter((r) => r.value)

  return (
    <div style={{ borderRadius: 'var(--radius-control)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      {rows.map((row, i) => (
        <div key={row.key} style={{
          display: 'flex', alignItems: 'center', padding: '12px 16px',
          borderBottom: i < rows.length - 1 ? '1px solid var(--color-border)' : 'none',
        }}>
          <span style={{ width: 72, flexShrink: 0, fontSize: 13, color: 'var(--color-text-sub)', fontWeight: 500 }}>{row.key}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.value}</span>
        </div>
      ))}
    </div>
  )
}
