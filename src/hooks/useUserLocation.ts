'use client'

import { useEffect, useRef, useState } from 'react'
import { locationAdapter, LocationCoords } from '@/lib/adapters/location'

export function useUserLocation() {
  // 캐시된 위치로 즉시 초기화 (서울 폴백 없음 — null이면 null)
  const [coords, setCoords] = useState<LocationCoords | null>(() => {
    if (typeof window === 'undefined') return null
    return locationAdapter.loadCache()
  })
  const [loading, setLoading] = useState(true)
  const inFlight = useRef(false)

  const fetch = () => {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    locationAdapter.getCurrentPosition().then((c) => {
      if (c) {
        setCoords(c)
        locationAdapter.saveCache(c)
      }
      setLoading(false)
      inFlight.current = false
    })
  }

  useEffect(() => { fetch() }, [])

  return { coords, loading, refetch: fetch }
}
