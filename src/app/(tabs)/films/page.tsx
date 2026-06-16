'use client'

import { useEffect, useRef, useState } from 'react'
import { CurationSectionRow } from '@/components/domain/CurationSectionRow'
import { FilterChip } from '@/components/domain/filterBar/FilterChip'
import { RegionDropdown } from '@/components/domain/filterBar/RegionDropdown'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { getFilmsTabCurationSections } from '@/lib/curation/filmsTabLists'
import { useActiveMovieIdsByRegion, useCurationLists, useMovies } from '@/lib/supabase/queries'

export default function FilmsPage() {
  const isDesktopLayout = useIsDesktopLayout()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDesktop = mounted && isDesktopLayout

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const chipRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    function onPointerDown(e: PointerEvent) {
      if (
        chipRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return
      setDropdownOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [dropdownOpen])

  const { data: movies = [] } = useMovies()
  const { data: curationLists = [] } = useCurationLists()
  const { data: activeMovieIds = [] } = useActiveMovieIdsByRegion(selectedRegion)

  const sections = getFilmsTabCurationSections(movies, new Set(activeMovieIds), curationLists)

  const subtitle = selectedRegion
    ? `${selectedRegion}에서 지금 만날 수 있는 영화 ${activeMovieIds.length}편`
    : `지금 만날 수 있는 영화 ${activeMovieIds.length}편`

  return (
    <div
      style={{
        minHeight: '100dvh',
        paddingBottom: isDesktop ? 0 : `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom))`,
        paddingLeft: isDesktop ? GLOBAL_NAV_DESKTOP_WIDTH : 0,
        backgroundColor: 'var(--color-surface-bg)',
      }}
    >
      <header style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
            }}
          >
            영화
          </h1>

          <div style={{ position: 'relative' }}>
            <FilterChip
              label="검색 지역"
              value={selectedRegion ?? undefined}
              open={dropdownOpen}
              selected={!!selectedRegion}
              hasDropdown
              chipRef={chipRef}
              onClick={() => setDropdownOpen((o) => !o)}
              onClear={selectedRegion ? () => { setSelectedRegion(null); setDropdownOpen(false) } : undefined}
            />
            {dropdownOpen && (
              <div
                ref={dropdownRef}
                style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200 }}
              >
                <RegionDropdown
                  selectedId={selectedRegion}
                  onSelect={(id) => { setSelectedRegion(id); setDropdownOpen(false) }}
                />
              </div>
            )}
          </div>
        </div>

        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-caption)' }}>
          {subtitle}
        </p>
      </header>

      {sections.map((section) => (
        <CurationSectionRow
          key={section.listId}
          title={section.nameKo}
          movies={section.movies}
          isDesktop={isDesktop}
        />
      ))}
    </div>
  )
}
