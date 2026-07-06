'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/store/uiStore'
import { trackEvent } from '@/lib/analytics/client'

/**
 * /search — 딥링크 호환용 얇은 진입점.
 *
 * 검색 UI는 지도 화면의 검색 패널(SearchPanel) 하나로 통합됐다:
 * 데스크톱은 좌측 도크 슬롯에 붙는 슬라이드 패널, 모바일은 전체화면 오버레이.
 * 이 라우트는 별도의 검색 화면을 중복 구현하지 않고, 검색 오버레이를 연 상태로
 * 지도 화면으로 이동시키기만 한다. (기존 북마크·공유 링크 호환을 위해 라우트 유지)
 */
export default function SearchPage() {
  const router = useRouter()
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)

  useEffect(() => {
    trackEvent('search opened', { source: 'page' })
    setSearchOpen(true)
    router.replace('/')
  }, [router, setSearchOpen])

  return null
}
