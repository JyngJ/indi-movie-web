'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
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
  const choicesId = useId()
  const [expanded, setExpanded] = useState(false)
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

  function shortcutButton(festival: Festival, label: string) {
    const pending = pendingSlug === festival.slug
    return (
      <FilterPill
        key={festival.id}
        aria-label={label === '영화제' ? `영화제 · ${festival.name} 상영 시간표 보기` : undefined}
        aria-busy={pending}
        aria-disabled={pendingSlug !== null}
        onClick={() => openFestival(festival)}
      >
        {pending ? <span role="status">이동하는 중…</span> : label}
      </FilterPill>
    )
  }

  const singleFestival = shortcuts.length === 1 ? shortcuts[0] : undefined
  const hasChoices = shortcuts.length > 1
  if (!children && !singleFestival && !hasChoices) return null

  return (
    <div style={{
      marginTop: isDesktop ? 'var(--spacing-12)' : 'var(--spacing-8)',
      paddingInline: 'var(--gutter)',
    }}>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {singleFestival && shortcutButton(singleFestival, '영화제')}
        {hasChoices && (
          <FilterPill active={expanded} aria-expanded={expanded} aria-controls={choicesId}
            onClick={() => setExpanded(!expanded)}>
            영화제
          </FilterPill>
        )}
      </div>
      {hasChoices && (
        <div id={choicesId} hidden={!expanded}>
          <div className="mt-2 flex flex-wrap gap-2">
            {shortcuts.map(festival => shortcutButton(festival, `${festival.name} ${festivalShortcutDateLabel(festival, today)}`))}
          </div>
        </div>
      )}
    </div>
  )
}
