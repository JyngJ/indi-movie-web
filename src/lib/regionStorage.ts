const KEY = 'region_filter'
const EVENT = 'region-filter-change'

export function getStoredRegion(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(KEY)
}

export function setStoredRegion(id: string | null): void {
  if (typeof window === 'undefined') return
  if (id) sessionStorage.setItem(KEY, id)
  else sessionStorage.removeItem(KEY)
  // MapView는 (tabs)/layout에서 persistent 마운트라 재마운트로 stored를 다시
  // 읽지 못한다. 지역 변경을 이벤트로 브로드캐스트해 지도·필터바·상영작 탭이
  // 어느 화면에서 바뀌든 즉시 동기화되게 한다.
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }))
}

/** 지역 필터 변경 구독 — 반환값은 해제 함수 */
export function subscribeStoredRegion(handler: (id: string | null) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const listener = (e: Event) => handler((e as CustomEvent<string | null>).detail)
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
