/**
 * Haversine formula: 지구 표면의 두 지점 사이의 거리 계산 (km)
 * @param lat1 위도 1
 * @param lon1 경도 1
 * @param lat2 위도 2
 * @param lon2 경도 2
 * @returns 거리 (km)
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // 지구 반경 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function calculateDistanceKm(
  userLat: number | null | undefined,
  userLon: number | null | undefined,
  targetLat: number | null | undefined,
  targetLon: number | null | undefined,
): number | null {
  if (userLat == null || userLon == null || targetLat == null || targetLon == null) {
    return null
  }
  if (![userLat, userLon, targetLat, targetLon].every(Number.isFinite)) {
    return null
  }

  try {
    return haversineDistance(userLat, userLon, targetLat, targetLon)
  } catch {
    return null
  }
}

/**
 * 거리 텍스트 포맷팅 (km 또는 m)
 * @param kmDistance 거리 (km)
 * @returns 포맷된 거리 문자열 ("1.2 km", "850 m" 등)
 */
export function formatDistance(kmDistance: number): string {
  if (kmDistance < 1) {
    return `${Math.round(kmDistance * 1000)} m`
  }
  return `${kmDistance.toFixed(1)} km`
}

/**
 * 사용자 현재 위치와 목표 위치 사이의 거리 계산 및 포맷팅
 * @param userLat 사용자 위도
 * @param userLon 사용자 경도
 * @param targetLat 목표 위도
 * @param targetLon 목표 경도
 * @returns 포맷된 거리 문자열 또는 null (계산 실패 시)
 */
export function calculateAndFormatDistance(
  userLat: number | null | undefined,
  userLon: number | null | undefined,
  targetLat: number | null | undefined,
  targetLon: number | null | undefined,
): string | null {
  const distanceKm = calculateDistanceKm(userLat, userLon, targetLat, targetLon)
  return distanceKm == null ? null : formatDistance(distanceKm)
}
