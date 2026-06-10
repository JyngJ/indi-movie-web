'use client'

import { MoviePanel } from './desktopDetailPanel/MoviePanel'
import { DirectorPanel } from './desktopDetailPanel/DirectorPanel'

export type DesktopPanelState =
  | { type: 'movie'; id: string }
  | { type: 'director'; name: string }

/* ── 메인 export ── */
export function DesktopDetailPanel({
  panel,
  regionId,
  onClose,
  onBack,
  embedded,
  onNavigate,
  onMovieFilterOnMap,
  onDirectorFilterOnMap,
  onTheaterOpen,
}: {
  panel: DesktopPanelState
  regionId?: string | null
  onClose: () => void
  onBack?: () => void
  /** 좌측 도크에 내장될 때 true — 카드 모서리/배경 없이 도크에 꽉 채워 표시 */
  embedded?: boolean
  onNavigate: (next: DesktopPanelState) => void
  onMovieFilterOnMap: (id: string, title: string) => void
  onDirectorFilterOnMap: (name: string) => void
  onTheaterOpen: (movieId: string, theaterId: string, date: string) => void
}) {
  if (panel.type === 'movie') {
    return (
      <MoviePanel
        movieId={panel.id}
        regionId={regionId}
        onClose={onClose}
        onBack={onBack}
        embedded={embedded}
        onDirectorOpen={(name) => onNavigate({ type: 'director', name })}
        onMovieFilterOnMap={onMovieFilterOnMap}
        onTheaterOpen={(theaterId, date) => onTheaterOpen(panel.id, theaterId, date)}
      />
    )
  }

  return (
    <DirectorPanel
      directorName={panel.name}
      onClose={onClose}
      onBack={onBack}
      embedded={embedded}
      onMovieOpen={(id) => onNavigate({ type: 'movie', id })}
      onDirectorFilterOnMap={onDirectorFilterOnMap}
    />
  )
}
