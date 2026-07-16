// ================================
// Storage Adapter
// Web: localStorage
// Native (추후): AsyncStorage
// ================================

export interface IStorageAdapter {
  getItem(key: string): Promise<string | null>
  /** 저장 성공 여부를 반환한다 — 호출부가 쓰기 실패(프라이빗 모드/쿼터 초과 등)를 감지해 대응할 수 있도록 */
  setItem(key: string, value: string): Promise<boolean>
  removeItem(key: string): Promise<void>
}

const webStorageAdapter: IStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },

  async setItem(key: string, value: string): Promise<boolean> {
    if (typeof window === 'undefined') return false
    try {
      localStorage.setItem(key, value)
      return true
    } catch {
      console.warn('Storage setItem failed:', key)
      return false
    }
  },

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch {
      console.warn('Storage removeItem failed:', key)
    }
  },
}

// 플랫폼 선택 (추후 React Native 대응 시 교체)
export const storageAdapter: IStorageAdapter = webStorageAdapter
