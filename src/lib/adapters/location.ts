// ================================
// Location Adapter
// Web: Geolocation API
// Native (추후): React Native Geolocation
// ================================

export interface LocationCoords {
  lat: number
  lng: number
}

export interface ILocationAdapter {
  /** 조용한 요청 — 실패 시 null 반환 (Seoul 폴백 없음) */
  getCurrentPosition(): Promise<LocationCoords | null>
  /** 명시적 사용자 요청 — 실패 시 GeolocationPositionError throw */
  requestPosition(): Promise<LocationCoords>
  watchPosition(callback: (coords: LocationCoords) => void): () => void
  getDefaultLocation(): LocationCoords
  getPermissionState(): Promise<'granted' | 'prompt' | 'denied' | 'unsupported'>
  saveCache(coords: LocationCoords): void
  loadCache(): LocationCoords | null
}

// 서울 시청 — 거리 계산 fallback 전용 (위치 필터에는 쓰지 않음)
const SEOUL_CITY_HALL: LocationCoords = { lat: 37.5665, lng: 126.978 }

const CACHE_KEY = 'ym_location'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30분

const webLocationAdapter: ILocationAdapter = {
  /** 조용히 GPS 시도 — 실패하면 null */
  getCurrentPosition(): Promise<LocationCoords | null> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.warn('Geolocation silent fail:', error.message)
          resolve(null)
        },
        {
          timeout: 15_000,
          maximumAge: 300_000,
          enableHighAccuracy: false,
        },
      )
    })
  },

  /** 사용자가 버튼 눌러서 명시적으로 요청 — error 그대로 throw */
  requestPosition(): Promise<LocationCoords> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        reject(new Error('geolocation not supported'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => reject(error),
        {
          timeout: 15_000,
          maximumAge: 0,
          enableHighAccuracy: false,
        },
      )
    })
  },

  watchPosition(callback: (coords: LocationCoords) => void): () => void {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return () => {}
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        callback({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      (error) => {
        console.warn('Watch position error:', error.message)
      },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  },

  getDefaultLocation(): LocationCoords {
    return SEOUL_CITY_HALL
  },

  async getPermissionState(): Promise<'granted' | 'prompt' | 'denied' | 'unsupported'> {
    if (typeof window === 'undefined' || !navigator.geolocation) return 'unsupported'
    try {
      const perm = await navigator.permissions.query({ name: 'geolocation' })
      return perm.state as 'granted' | 'prompt' | 'denied'
    } catch {
      return 'prompt' // iOS Safari 등 permissions API 미지원
    }
  },

  saveCache(coords: LocationCoords): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...coords, ts: Date.now() }))
  },

  loadCache(): LocationCoords | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return null
      const { lat, lng, ts } = JSON.parse(raw) as { lat: number; lng: number; ts: number }
      if (Date.now() - ts > CACHE_TTL_MS) return null
      return { lat, lng }
    } catch {
      return null
    }
  },
}

// 플랫폼 선택 (추후 React Native 대응 시 교체)
export const locationAdapter: ILocationAdapter = webLocationAdapter
