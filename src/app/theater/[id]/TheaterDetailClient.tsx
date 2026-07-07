'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Theater } from '@/types/api'

const s = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-surface-bg)',
    fontFamily: 'var(--font-sans)',
    color: 'var(--color-text-caption)',
    fontSize: 'var(--text-body)',
  } as React.CSSProperties,
}

/** 검색엔진은 SSR 메타데이터/JSON-LD로 극장 정보를 읽고,
 *  실 사용자는 지도 + 극장 시트(모바일)/패널(PC)로 바로 진입.
 */
export function TheaterDetailClient({ theater }: { theater: Theater }) {
  const router = useRouter()

  useEffect(() => {
    router.replace(`/?theater=${theater.id}`)
  }, [router, theater.id])

  return <div style={s.page}>지도로 이동 중...</div>
}
