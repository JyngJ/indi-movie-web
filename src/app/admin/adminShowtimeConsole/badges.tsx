import type { AdminShowtimeStatus } from '@/types/admin'
import styles from '../admin.module.css'

export function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'warning' | 'success' }) {
  const toneClass = tone === 'default' ? '' : styles[tone]

  return (
    <article className={`${styles.metric} ${toneClass}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

export function Confidence({ value }: { value: number }) {
  const percent = Math.round(value * 100)

  return (
    <div className={styles.confidence}>
      <span>{percent}%</span>
      <div><i style={{ width: `${percent}%` }} /></div>
    </div>
  )
}

export function StatusBadge({ status }: { status: AdminShowtimeStatus }) {
  const label = {
    draft: '초안',
    needs_review: '검수',
    approved: '승인',
    rejected: '반려',
  }[status]

  return <span className={`${styles.status} ${styles[status]}`}>{label}</span>
}
