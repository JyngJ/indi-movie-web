'use client'

import Link from 'next/link'
import { PosterThumb } from '@/components/domain/PosterThumb'
import type { StoredNotificationEvent } from '@/lib/notifications/types'

/** "2026-08-21" → "8월 21일" */
function formatDate(iso?: string): string {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${Number(m)}월 ${Number(d)}일`
}

/** 소식 시각 — 오늘/어제/N일 전 */
function relativeDay(createdAt: string, now: Date): string {
  const then = new Date(createdAt)
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000)
  if (days <= 0) return '오늘'
  if (days === 1) return '어제'
  if (days < 7) return `${days}일 전`
  return formatDate(createdAt.slice(0, 10))
}

/** 왜 이 소식을 받았는지 — 하트 종류를 그대로 보여준다 */
function reasonLabel(e: StoredNotificationEvent): string {
  if (e.subjectType === 'movie') return '관심 영화'
  if (e.subjectType === 'director') return `관심 감독 · ${e.subjectId}`
  return '관심 극장'
}

function headline(e: StoredNotificationEvent): string {
  if (e.kind === 'last_week') {
    const d = e.payload.daysLeft
    if (d === 0) return '오늘이 마지막 상영이에요'
    // confidence가 'likely'면 크롤 데이터 기준 추정 — 단정하지 않는다
    const suffix = e.payload.confidence === 'confirmed' ? '' : ' (예정)'
    return `상영 ${d}일 남았어요${suffix}`
  }
  return `${e.payload.theaterName}에서 상영해요`
}

function FeedItem({ event, now }: { event: StoredNotificationEvent; now: Date }) {
  const href = event.movieId ? `/movie/${encodeURIComponent(event.movieId)}` : undefined
  const body = (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      padding: '12px var(--gutter)',
      background: event.readAt ? 'transparent' : 'var(--color-primary-subtle-l)',
    }}>
      <PosterThumb src={event.payload.posterUrl} alt={event.payload.movieTitle} width={48} height={72} size="sm" radius={4} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 'var(--text-badge)', fontWeight: 600, color: 'var(--color-text-caption)' }}>
          {reasonLabel(event)}
        </span>
        <span style={{
          fontSize: 'var(--text-body)', fontWeight: 700, color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {event.payload.movieTitle}
        </span>
        <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)' }}>
          {headline(event)}
          {event.kind === 'new_screening' && event.payload.firstDate ? ` · ${formatDate(event.payload.firstDate)}부터` : ''}
        </span>
      </div>
      <span style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)', flexShrink: 0 }}>
        {relativeDay(event.createdAt, now)}
      </span>
    </div>
  )

  if (!href) return body
  return <Link href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>{body}</Link>
}

/** 소식 목록 — 최신순. 안 읽은 건 배경으로 구분한다 */
export function FeedList({ events }: { events: StoredNotificationEvent[] }) {
  const now = new Date()
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {events.map((e) => (
        <div key={e.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
          <FeedItem event={e} now={now} />
        </div>
      ))}
    </div>
  )
}
