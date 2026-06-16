const KEY = 'region_filter'

export function getStoredRegion(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(KEY)
}

export function setStoredRegion(id: string | null): void {
  if (typeof window === 'undefined') return
  if (id) sessionStorage.setItem(KEY, id)
  else sessionStorage.removeItem(KEY)
}
