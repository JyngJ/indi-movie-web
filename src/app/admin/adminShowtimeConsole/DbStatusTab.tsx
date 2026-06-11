import type { AdminMovie, AdminTheater, AdminTheaterSource } from '@/types/admin'
import styles from '../admin.module.css'
import { Metric } from './badges'

export function DbStatusTab({ theaters, movies, sources }: {
  theaters: AdminTheater[]
  movies: AdminMovie[]
  sources: AdminTheaterSource[]
}) {
  const moviesNoPoster = movies.filter(m => !m.posterUrl)
  const moviesNoSynopsis = movies.filter(m => !m.synopsis)
  const sourcesUnhealthy = sources.filter(s => s.health !== 'healthy')

  // 극장별 소스 매핑
  const sourcesByTheater = new Map<string, AdminTheaterSource[]>()
  for (const src of sources) {
    const list = sourcesByTheater.get(src.theaterName) ?? []
    list.push(src)
    sourcesByTheater.set(src.theaterName, list)
  }

  const healthLabel: Record<AdminTheaterSource['health'], string> = {
    healthy: '정상',
    degraded: '저하',
    broken: '오류',
  }
  const healthClass: Record<AdminTheaterSource['health'], string> = {
    healthy: styles.healthHealthy,
    degraded: styles.healthDegraded,
    broken: styles.healthBroken,
  }

  return (
    <>
      <div className={styles.statusGrid}>
        <Metric label="등록 극장" value={theaters.length} />
        <Metric label="등록 영화" value={movies.length} />
        <Metric label="크롤링 소스" value={sources.length} />
        <Metric label="소스 이상" value={sourcesUnhealthy.length} tone={sourcesUnhealthy.length ? 'warning' : 'default'} />
        <Metric label="포스터 없음" value={moviesNoPoster.length} tone={moviesNoPoster.length ? 'warning' : 'default'} />
        <Metric label="시놉시스 없음" value={moviesNoSynopsis.length} tone={moviesNoSynopsis.length ? 'warning' : 'default'} />
      </div>

      <div className={styles.statusSection}>
        <div className={styles.panelHeader}>
          <h2>크롤링 소스 상태</h2>
          <span>{sources.length}개 소스</span>
        </div>
        <table className={styles.statusTable}>
          <thead>
            <tr>
              <th>극장</th>
              <th>파서</th>
              <th>주기</th>
              <th>마지막 수집</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-caption)', padding: '24px' }}>등록된 소스가 없습니다.</td></tr>
            )}
            {sources.map(src => (
              <tr key={src.id}>
                <td style={{ fontWeight: 600 }}>{src.theaterName}</td>
                <td style={{ color: 'var(--color-text-sub)', fontFamily: 'monospace', fontSize: 12 }}>{src.parser}</td>
                <td style={{ color: 'var(--color-text-sub)' }}>
                  {{ manual: '수동', daily: '매일', twice_daily: '하루 2회', four_daily: '하루 4회' }[src.cadence] ?? src.cadence}
                </td>
                <td style={{ color: 'var(--color-text-caption)', fontSize: 12 }}>
                  {src.lastCrawledAt ? new Date(src.lastCrawledAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td>
                  <span className={`${styles.healthBadge} ${healthClass[src.health]}`}>
                    {healthLabel[src.health]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {moviesNoPoster.length > 0 && (
        <div className={styles.statusSection}>
          <div className={styles.panelHeader}>
            <h2>포스터 없는 영화</h2>
            <span>{moviesNoPoster.length}편</span>
          </div>
          <div className={styles.qualityList}>
            {moviesNoPoster.map(m => (
              <div key={m.id} className={styles.qualityItem}>
                <div className={styles.qualityDot} style={{ background: 'var(--color-warning)' }} />
                <span style={{ fontWeight: 600 }}>{m.title}</span>
                <span style={{ color: 'var(--color-text-caption)', fontSize: 12 }}>{m.year} · {m.director.join(', ') || '감독 미입력'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {moviesNoSynopsis.length > 0 && (
        <div className={styles.statusSection}>
          <div className={styles.panelHeader}>
            <h2>시놉시스 없는 영화</h2>
            <span>{moviesNoSynopsis.length}편</span>
          </div>
          <div className={styles.qualityList}>
            {moviesNoSynopsis.map(m => (
              <div key={m.id} className={styles.qualityItem}>
                <div className={styles.qualityDot} style={{ background: 'var(--color-text-caption)' }} />
                <span style={{ fontWeight: 600 }}>{m.title}</span>
                <span style={{ color: 'var(--color-text-caption)', fontSize: 12 }}>{m.year}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
