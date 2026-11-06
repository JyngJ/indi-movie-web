'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'

/** 가로채기 라우트가 살아 있는 동안 '지도 위 극장 주소' 상태를 켠다. 뒤로가기로 빠지면 꺼진다. */
export function MapTheaterRoute({ id }: { id: string }) {
  const setMapTheaterRouteId = useUIStore((s) => s.setMapTheaterRouteId)
  useEffect(() => {
    setMapTheaterRouteId(id)
    return () => setMapTheaterRouteId(null)
  }, [id, setMapTheaterRouteId])
  return null
}
