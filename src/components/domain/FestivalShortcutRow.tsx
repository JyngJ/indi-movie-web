'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import { FilterPill } from '@/components/primitives/FilterPill'
import { navStart } from '@/components/domain/RouteProgressBar'
import { trackEvent } from '@/lib/analytics/client'
import { festivalShortcutDateLabel, selectShortcutFestivals } from '@/lib/festival/shortcut'
import type { Festival } from '@/types/festival'

const PENDING_RESET_MS = 10_000

interface Props {
  festivals: Festival[]
  today: string
  isDesktop: boolean
  onSelect: (slug: string) => void
  children?: ReactNode
}

/** 상영작 보기 탭과 진행 중이거나 개막을 앞둔 영화제 바로가기를 같은 줄에 둔다. */
export function FestivalShortcutRow({ festivals, today, isDesktop, onSelect, children }: Props) {
  const shortcuts = selectShortcutFestivals(festivals, today)
  const router = useRouter()
  const [pendingSlug, setPendingSlug] = useState<string | null>(null)
  // ref로 다음 렌더 전에 들어온 연타도 막는다. 이동 실패에 대비해 잠금을 해제한다.
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const slugKey = shortcuts.map((f) => f.slug).join('|')
  useEffect(() => {
    if (!slugKey) return
    for (const slug of slugKey.split('|')) router.prefetch(`/festival/${slug}`)
  }, [router, slugKey])
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current) }, [])

  function openFestival(festival: Festival) {
    if (resetTimer.current !== null) return
    setPendingSlug(festival.slug)
    resetTimer.current = setTimeout(() => {
      resetTimer.current = null
      setPendingSlug(null)
    }, PENDING_RESET_MS)
    navStart()
    trackEvent('curation movie selected', {
      list_id: `festival_shortcut_${festival.slug}`,
      section_title: '영화제 바로가기',
      target_type: 'festival',
      festival_slug: festival.slug,
      festival_name: festival.name,
      source: 'festival_shortcut',
    })
    onSelect(festival.slug)
  }

  if (!children && shortcuts.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2" style={{
      marginTop: isDesktop ? 'var(--spacing-12)' : 'var(--spacing-8)',
      paddingInline: 'var(--gutter)',
    }}>
      {children}
      {shortcuts.map(festival => {
        const pending = pendingSlug === festival.slug
        const dateLabel = festivalShortcutDateLabel(festival, today)
        return (
          <FilterPill
            key={festival.id}
            className="max-w-full"
            aria-label={`${festival.name} ${dateLabel} 상영 시간표 보기`}
            aria-busy={pending}
            aria-disabled={pendingSlug !== null}
            onClick={() => openFestival(festival)}
          >
            {pending ? <span role="status">이동하는 중…</span> : (
              <>
                <span className="truncate">{festival.name}</span>
                <strong className="shrink-0 font-bold tabular-nums">{dateLabel}</strong>
              </>
            )}
          </FilterPill>
        )
      })}
    </div>
  )
}
