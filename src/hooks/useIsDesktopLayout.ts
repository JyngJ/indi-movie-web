'use client'

import { useEffect, useState } from 'react'

export function useIsDesktopLayout(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches
  )
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)')
    const update = () => setIsDesktop(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return isDesktop
}
