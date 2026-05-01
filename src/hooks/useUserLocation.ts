'use client'

import { useEffect, useRef, useState } from 'react'
import { locationAdapter, LocationCoords } from '@/lib/adapters/location'

export function useUserLocation() {
  const [coords, setCoords] = useState<LocationCoords | null>(null)
  const [loading, setLoading] = useState(true)
  const inFlight = useRef(false)

  const fetch = () => {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    locationAdapter.getCurrentPosition().then((c) => {
      setCoords(c)
      setLoading(false)
      inFlight.current = false
    })
  }

  useEffect(() => { fetch() }, [])

  return { coords, loading, refetch: fetch }
}
