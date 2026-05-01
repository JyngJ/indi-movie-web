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
  getCurrentPosition(): Promise<LocationCoords>
  watchPosition(callback: (coords: LocationCoords) => void): () => void
  getDefaultLocation(): LocationCoords
}

// 서울 시청 — 위치 거부 시 기본값
const SEOUL_CITY_HALL: LocationCoords = { lat: 37.5665, lng: 126.978 }

const webLocationAdapter: ILocationAdapter = {
  getCurrentPosition(): Promise<LocationCoords> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        resolve(SEOUL_CITY_HALL)
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
          console.warn('Geolocation denied or unavailable:', error.message)
          resolve(SEOUL_CITY_HALL)
        },
        {
          timeout: 8000,
          maximumAge: 60_000,
          enableHighAccuracy: false,
        }
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
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  },

  getDefaultLocation(): LocationCoords {
    return SEOUL_CITY_HALL
  },
}

// 플랫폼 선택 (추후 React Native 대응 시 교체)
export const locationAdapter: ILocationAdapter = webLocationAdapter
