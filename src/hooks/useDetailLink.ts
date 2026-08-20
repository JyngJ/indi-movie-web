'use client'

import { usePathname } from 'next/navigation'
import { useCallback } from 'react'
import type { MouseEvent } from 'react'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useUIStore } from '@/store/uiStore'

export type DetailTarget =
  | { kind: 'movie'; id: string }
  | { kind: 'theater'; id: string }
  | { kind: 'director'; name: string }

export function detailHref(t: DetailTarget): string {
  if (t.kind === 'movie') return `/films/movie/${encodeURIComponent(t.id)}`
  if (t.kind === 'theater') return `/films/theater/${encodeURIComponent(t.id)}`
  return `/films/director/${encodeURIComponent(t.name)}`
}

/**
 * 소식·관심 목록처럼 어느 탭 위에서나 뜨는 목록에서 상세로 갈 때 쓰는 링크 속성.
 *
 * 지도 탭(데스크톱)에서는 페이지를 갈아끼우지 않고 지도 위 패널·극장 시트를 연다 —
 * 지도를 보다가 소식을 확인하는 흐름인데 화면이 통째로 바뀌면 보던 지도를 잃는다.
 * 그 밖(상영작 탭·모바일)에서는 상영작 탭 상세(/films/*)로 이동한다.
 *
 * href는 어떤 경우에도 채워둔다 — 새 탭 열기·크롤러·모바일이 그대로 쓴다.
 */
export function useDetailLink(onNavigate?: () => void) {
  const isDesktop = useIsDesktopLayout()
  const pathname = usePathname()
  const requestMapFocus = useUIStore((s) => s.requestMapFocus)
  const onMap = pathname === '/map'

  return useCallback((target: DetailTarget) => ({
    href: detailHref(target),
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      // 새 탭·다운로드 의도는 건드리지 않는다
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      if (isDesktop && onMap) {
        e.preventDefault()
        requestMapFocus(
          target.kind === 'director'
            ? { type: 'director', name: target.name }
            : { type: target.kind, id: target.id },
        )
      }
      onNavigate?.()
    },
  }), [isDesktop, onMap, requestMapFocus, onNavigate])
}
