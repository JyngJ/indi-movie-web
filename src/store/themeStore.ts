import { create } from 'zustand'
import { storageAdapter } from '@/lib/adapters/storage'

type Theme = 'light' | 'dark' | 'system'

interface ThemeStore {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'movie-app-theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme()
  return theme
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'system',
  resolvedTheme: 'light',

  setTheme: async (theme: Theme) => {
    const resolved = resolveTheme(theme)
    document.documentElement.setAttribute('data-theme', resolved)
    await storageAdapter.setItem(STORAGE_KEY, theme)
    set({ theme, resolvedTheme: resolved })
  },
}))

// 초기 테마 적용 (FOUC 방지용 — layout.tsx <script>에서 호출)
export function initTheme(): string {
  return `
    (function() {
      try {
        var stored = localStorage.getItem('${STORAGE_KEY}');
        var theme = stored || 'system';
        var resolved = theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme;
        document.documentElement.setAttribute('data-theme', resolved);
      } catch(e) {}
    })();
  `
}
