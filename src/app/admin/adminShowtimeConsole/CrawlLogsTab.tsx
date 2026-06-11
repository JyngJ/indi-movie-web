import { useState } from 'react'
import { Button } from '@/components/primitives'
import type { CrawlRun } from '@/types/admin'
import styles from '../admin.module.css'

export function CrawlLogsTab({ logs, loading, onRefresh }: {
  logs: CrawlRun[]
  loading: boolean
  onRefresh: () => void
}) {
  const [filter, setFilter] = useState<'all' | 'failed' | 'completed'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = filter === 'all' ? logs : logs.filter((r) => r.status === filter)

  return (
    <section style={{ margin: '0 auto', maxWidth: 1320 }}>
      <div className={styles.panelHeader} style={{ marginBottom: 12 }}>
        <h2>크롤링 로그</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className={styles.logFilter}>
            {(['all', 'completed', 'failed'] as const).map((f) => (
              <button
                key={f}
                className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? '전체' : f === 'completed' ? '성공' : '실패'}
                <span className={styles.filterTabBadge}>
                  {f === 'all' ? logs.length : logs.filter((r) => r.status === f).length}
                </span>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" loading={loading} onClick={onRefresh}>새로고침</Button>
        </div>
      </div>
      {loading && logs.length === 0 && <p className={styles.empty}>로그를 불러오는 중...</p>}
      {!loading && filtered.length === 0 && <p className={styles.empty}>표시할 로그가 없습니다.</p>}
      {filtered.length > 0 && (
        <div className={styles.statusSection}>
          <table className={styles.logsTable}>
            <thead>
              <tr>
                <th style={{ width: 20 }}></th>
                <th>극장</th>
                <th>파서</th>
                <th>후보</th>
                <th>경고</th>
                <th>시작</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((run) => {
                const isExpanded = expandedId === run.id
                const isFailed = run.status === 'failed'
                const hasWarn = run.warningCount > 0
                return (
                  <>
                    <tr
                      key={run.id}
                      className={`${styles.logRow} ${isFailed ? styles.logRowFailed : styles.logRowOk}`}
                      onClick={() => setExpandedId(isExpanded ? null : run.id)}
                      style={{ cursor: run.error ? 'pointer' : 'default' }}
                    >
                      <td>
                        <span className={`${styles.logRunDot} ${isFailed ? styles.logRunFailed : hasWarn ? styles.logRunWarn : styles.logRunOk}`} />
                      </td>
                      <td className={styles.logRunName}>{run.sourceName}</td>
                      <td className={styles.logRunMeta}>{run.inputKind}</td>
                      <td>{run.createdCount}</td>
                      <td style={{ color: hasWarn ? 'var(--color-warning)' : undefined }}>{run.warningCount || '—'}</td>
                      <td className={styles.logRunTime}>
                        {new Date(run.startedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        {isFailed
                          ? <span style={{ color: 'var(--color-error)', fontWeight: 700, fontSize: 12 }}>실패</span>
                          : <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: 12 }}>완료</span>}
                        {run.error && <span className={styles.logRunErrorInline}> ▾</span>}
                      </td>
                    </tr>
                    {isExpanded && run.error && (
                      <tr key={`${run.id}-detail`} className={styles.logRowDetail}>
                        <td colSpan={7}>
                          <span className={styles.logDetailLabel}>오류:</span>
                          <span className={styles.logDetailError}>{run.error}</span>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
