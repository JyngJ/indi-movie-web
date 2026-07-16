// ================================
// Cookie Storage Adapter
// 클라이언트 전용 — 계정 동기화 없는 짧은 값(최근 찾아본 목록 등) 저장용
// ================================

import type { IStorageAdapter } from './storage'

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // 1년

function readCookie(key: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${key}=`))
  if (!match) return null
  try {
    return decodeURIComponent(match.slice(key.length + 1))
  } catch {
    return null
  }
}

function writeCookie(key: string, value: string): void {
  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`
}

function clearCookie(key: string): void {
  document.cookie = `${key}=; path=/; max-age=0; samesite=lax`
}

export const cookieStorageAdapter: IStorageAdapter = {
  async getItem(key) {
    if (typeof document === 'undefined') return null
    try {
      return readCookie(key)
    } catch {
      return null
    }
  },

  async setItem(key, value) {
    if (typeof document === 'undefined') return false
    try {
      writeCookie(key, value)
      return true
    } catch {
      console.warn('Cookie setItem failed:', key)
      return false
    }
  },

  async removeItem(key) {
    if (typeof document === 'undefined') return
    try {
      clearCookie(key)
    } catch {
      console.warn('Cookie removeItem failed:', key)
    }
  },
}
