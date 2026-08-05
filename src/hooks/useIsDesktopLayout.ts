'use client'

import { useMediaQuery } from '@/hooks/useMediaQuery'

export function useIsDesktopLayout(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
