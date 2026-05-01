// ================================
// Storage Adapter
// Web: localStorage
// Native (추후): AsyncStorage
// ================================

export interface IStorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
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

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, value)
    } catch {
      console.warn('Storage setItem failed:', key)
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
