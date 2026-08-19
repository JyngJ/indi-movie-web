'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { FilterPill, MenuCard, Switch } from '@/components/primitives'
import { useNotificationPrefs } from '@/hooks/useNotifications'
import { useFavorites } from '@/hooks/useFavorites'
import { REGIONS } from '@/lib/regions'

/** 24시간 정각 목록 — 조용한 시간 선택용 */
const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)

/**
 * 설정 한 줄. 기본은 [제목·설명 | 컨트롤] 가로 배치.
 * stacked면 컨트롤이 설명 아래로 내려간다 — 지역 칩처럼 폭을 다 쓰는 컨트롤용.
 */
function Row({ title, description, children, last, stacked }: {
  title: string
  description?: string
  children: React.ReactNode
  last?: boolean
  stacked?: boolean
}) {
  const head = (
    <div style={{ flex: stacked ? undefined : 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</span>
      {description && (
        <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', lineHeight: 1.5 }}>{description}</span>
      )}
    </div>
  )
  return (
    <div style={{
      display: 'flex',
      flexDirection: stacked ? 'column' : 'row',
      alignItems: stacked ? 'stretch' : 'center',
      gap: 12,
      padding: '16px var(--gutter)',
      borderBottom: last ? 'none' : '1px solid var(--color-border)',
    }}>
      {head}
      {children}
    </div>
  )
}

function HourSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: 36, paddingLeft: 12, paddingRight: 12,
        borderRadius: 'var(--radius-control)',
        border: '1px solid var(--color-neutral-300)',
        background: 'var(--color-surface-bg)',
        color: 'var(--color-text-body)',
        fontSize: 'var(--text-meta)', fontWeight: 600,
      }}
    >
      {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
    </select>
  )
}

/**
 * 알림 설정 — 모바일 /my/notifications 페이지와 데스크톱 MY 팝오버가 공유.
 *
 * 지금은 소식 탭에만 쌓이고 카톡 발송은 꺼져 있다(판정 정확도를 먼저 본다).
 * 그래서 화면에도 "카톡 발송은 준비 중"이라고 적어둔다 — 켜져 있다고 오해하면
 * 안 오는 알림을 기다리게 된다.
 */
export function NotificationSettingsContent() {
  const { status } = useAuth()
  const { prefs, isLoading, saving, error, save } = useNotificationPrefs()
  const { favorites } = useFavorites()
  const hasFavoriteTheater = favorites.some((f) => f.type === 'theater')

  const toggleRegion = (id: string) => {
    const next = prefs.regionIds.includes(id)
      ? prefs.regionIds.filter((r) => r !== id)
      : [...prefs.regionIds, id]
    save({ regionIds: next })
  }

  if (status === 'loading' || (status === 'signed-in' && isLoading)) {
    return <p style={{ margin: '24px var(--gutter)', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>확인 중…</p>
  }
  if (status === 'signed-out') {
    return (
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px var(--gutter)' }}>
        <LoginPanel returnTo="/my/notifications" />
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <p style={{
        margin: 0, padding: '16px var(--gutter)',
        fontSize: 'var(--text-meta)', lineHeight: 1.6, color: 'var(--color-text-sub)',
        background: 'var(--color-surface-raised)',
      }}>
        관심 영화·감독·극장에 새 상영이 생기면 소식 탭에 쌓아둬요.
        카카오톡으로 보내는 건 준비 중이에요.
      </p>

      {/* 카드 하나로 — 종류·시간·지역을 나눠 담으면 카드가 셋이 되는데,
          한 화면에 다 들어가는 분량이라 나눌 이유가 없었다 (2026-08-20) */}
      <MenuCard style={{ marginTop: 16 }}>
        <Row title="새 상영" description="관심 영화·감독 작품이 새 극장에 걸리거나, 관심 극장에 새 작품이 들어올 때">
          <Switch label="새 상영 알림" checked={prefs.newScreening} disabled={saving}
            onChange={(v) => save({ newScreening: v })} />
        </Row>
        <Row title="막바지 상영" description="관심 작품의 상영이 곧 끝날 때 (5일 이내)">
          <Switch label="막바지 상영 알림" checked={prefs.lastWeek} disabled={saving}
            onChange={(v) => save({ lastWeek: v })} />
        </Row>
        <Row title="방해 금지 시간" description="이 시간에는 카톡을 보내지 않아요. 소식 탭에는 그대로 쌓여요.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HourSelect label="방해 금지 시작" value={prefs.quietStart} onChange={(v) => save({ quietStart: v })} />
            <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>~</span>
            <HourSelect label="방해 금지 종료" value={prefs.quietEnd} onChange={(v) => save({ quietEnd: v })} />
          </div>
        </Row>
        <Row
          title="알림 받을 지역"
          description={prefs.regionIds.length > 0
            ? '고른 지역의 상영만 알려드려요.'
            : hasFavoriteTheater
              ? '고른 지역이 없어서 관심 극장이 있는 지역으로 알려드리고 있어요.'
              : '고른 지역이 없어서 전국의 상영을 알려드려요. 한 편이 전국 수십 곳에서 상영하기도 해요.'}
          stacked
          last
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {REGIONS.map((r) => (
              <FilterPill
                key={r.id}
                active={prefs.regionIds.includes(r.id)}
                aria-pressed={prefs.regionIds.includes(r.id)}
                disabled={saving}
                onClick={() => toggleRegion(r.id)}
              >
                {r.label}
              </FilterPill>
            ))}
          </div>
        </Row>
      </MenuCard>

      {error && (
        <p style={{ margin: '16px var(--gutter)', fontSize: 'var(--text-meta)', color: 'var(--color-error)' }}>
          설정을 저장하지 못했어요 — {error}
        </p>
      )}
    </div>
  )
}
