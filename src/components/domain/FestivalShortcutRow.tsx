'use client'

import Image from 'next/image'

import { Icon } from '@/components/primitives'
import { festivalShortcutDateLabel, selectShortcutFestivals } from '@/lib/festival/shortcut'
import type { Festival } from '@/types/festival'

/**
 * 상영작 탭 필터 줄 바로 아래의 영화제 바로가기 칩.
 *
 * 회기 중이거나 개막이 가까운 영화제만 뜨고, 폐막 다음 날 스스로 사라진다
 * (selectShortcutFestivals가 날짜만 보고 판단 — 회기가 끝나도 손댈 게 없다).
 * 칩이 하나도 없으면 줄 자체를 그리지 않아 빈 여백이 남지 않는다.
 */

interface Props {
  festivals: Festival[]
  /** ISO date "YYYY-MM-DD" */
  today: string
  onSelect: (slug: string) => void
}

export function FestivalShortcutRow({ festivals, today, onSelect }: Props) {
  const shortcuts = selectShortcutFestivals(festivals, today)
  if (shortcuts.length === 0) return null

  return (
    <div
      className="no-scrollbar"
      style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px var(--gutter) 0' }}
    >
      {shortcuts.map((festival) => (
        <button
          key={festival.id}
          type="button"
          onClick={() => onSelect(festival.slug)}
          aria-label={`${festival.name} 상영 시간표 보기`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0,
            width: festival.slug === 'biff31'
              ? 'min(440px, calc(100vw - var(--gutter) - var(--gutter)))'
              : 'auto',
            minHeight: 'unset',
            padding: festival.slug === 'biff31' ? 0 : 'var(--gutter-sm) var(--gutter-md)',
            borderRadius: festival.slug === 'biff31' ? 'var(--radius-button)' : 'var(--radius-pill)',
            border: festival.slug === 'biff31' ? 'none' : '1px solid var(--color-gv)',
            backgroundColor: 'var(--color-surface-bg)',
            color: 'var(--color-gv)',
            fontSize: 'var(--text-meta)', fontWeight: 700, lineHeight: 1.2,
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          {festival.slug === 'biff31' ? (
            <Image
              src="/images/festivals/biff31-shortcut.png"
              alt="제31회 부산국제영화제 10월 6일부터 15일까지"
              width={880}
              height={230}
              sizes="(max-width: 472px) calc(100vw - 32px), 440px"
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />
          ) : (
            <>
              <Icon name="calendar" size={14} strokeWidth={2} color="currentColor" />
              <span>{festival.name}</span>
              <span style={{ fontWeight: 500, opacity: 0.8, fontFeatureSettings: '"tnum"' }}>
                {festivalShortcutDateLabel(festival, today)}
              </span>
              <Icon name="chevron-right" size={14} strokeWidth={2} color="currentColor" />
            </>
          )}
        </button>
      ))}
    </div>
  )
}
