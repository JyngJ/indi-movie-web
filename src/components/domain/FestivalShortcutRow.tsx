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
      style={{ display: 'flex', gap: 'var(--spacing-2)', overflowX: 'auto', padding: 'var(--spacing-3) var(--gutter) 0' }}
    >
      {shortcuts.map((festival) => {
        const dateLabel = festivalShortcutDateLabel(festival, today)
        // 바로가기 이미지가 있는 영화제는 칩 대신 가로 이미지 한 장 — 데이터(shortcut_image_url)가 정한다
        const image = festival.shortcutImageUrl
        return (
          <button
            key={festival.id}
            type="button"
            onClick={() => onSelect(festival.slug)}
            aria-label={`${festival.name} 상영 시간표 보기`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-2)', flexShrink: 0,
              width: image ? 'min(440px, calc(100vw - var(--gutter) - var(--gutter)))' : 'auto',
              minHeight: 'unset',
              padding: image ? 0 : 'var(--gutter-sm) var(--gutter-md)',
              borderRadius: image ? 'var(--radius-button)' : 'var(--radius-pill)',
              /* 영화제는 필터가 아니라 다른 화면으로 나가는 문이다 — 지역칩과 헷갈리지 않게
                 GV·이벤트와 같은 브랜드 보라를 쓴다 */
              border: image ? 'none' : '1px solid var(--color-gv)',
              backgroundColor: 'var(--color-surface-bg)',
              color: 'var(--color-gv)',
              fontSize: 'var(--text-meta)', fontWeight: 700, lineHeight: 1.2,
              cursor: 'pointer',
              overflow: 'hidden',
            }}
          >
            {image ? (
              <Image
                src={image}
                alt={`${festival.name} ${dateLabel}`}
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
                  {dateLabel}
                </span>
                <Icon name="chevron-right" size={14} strokeWidth={2} color="currentColor" />
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
