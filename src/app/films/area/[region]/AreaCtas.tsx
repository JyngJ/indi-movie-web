'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/primitives'
import { setStoredRegion } from '@/lib/regionStorage'

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
          router.push('/')
        }}
      >
        지도에서 {region} 독립영화관 찾기
      </Button>
      <Button variant="secondary" size="full" onClick={() => router.push('/films')}>
        전체 상영작 보기
      </Button>
    </div>
  )
}
