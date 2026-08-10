'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/primitives'
import { setStoredRegion } from '@/lib/regionStorage'

/* Lucide map-pinned / clapperboard — stroke 1.75 (아이콘 규칙) */
const IcoMapPinned = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0" />
    <circle cx="12" cy="8" r="2" />
    <path d="M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712" />
  </svg>
)
const IcoClapperboard = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
    <path d="m6.2 5.3 3.1 3.9" />
    <path d="m12.4 3.4 3.1 4" />
    <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </svg>
)

/** 지역 SEO 랜딩 CTA — 지도로 갈 때 해당 지역 필터를 미리 저장해
 *  전국 지도가 아니라 "그 지역이 설정된 지도"로 진입시킨다. */
export function AreaCtas({ region }: { region: string }) {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
      <Button
        variant="primary"
        size="full"
        onClick={() => {
          setStoredRegion(region)
          router.push('/map')
        }}
      >
        <IcoMapPinned />
        지도에서 {region} 독립영화관 찾기
      </Button>
      <Button variant="secondary" size="full" onClick={() => router.push('/')}>
        <IcoClapperboard />
        전체 상영작 보기
      </Button>
    </div>
  )
}
