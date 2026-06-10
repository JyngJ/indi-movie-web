import { create } from 'zustand'

interface UIStore {
  isBottomSheetOpen: boolean
  bottomSheetContent: React.ReactNode | null
  openBottomSheet: (content: React.ReactNode) => void
  closeBottomSheet: () => void

  isSearchOpen: boolean
  setSearchOpen: (open: boolean) => void

  isSettingsOpen: boolean
  setSettingsOpen: (open: boolean) => void

  /** 데스크톱 지도 화면 좌측 도크 접힘 상태 — 도크 토글 버튼과 GlobalNav '지도' 탭 재클릭이 함께 제어 */
  isMapDockCollapsed: boolean
  setMapDockCollapsed: (collapsed: boolean) => void
  toggleMapDockCollapsed: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  isBottomSheetOpen: false,
  bottomSheetContent: null,
  openBottomSheet: (content) =>
    set({ isBottomSheetOpen: true, bottomSheetContent: content }),
  closeBottomSheet: () =>
    set({ isBottomSheetOpen: false, bottomSheetContent: null }),

  isSearchOpen: false,
  setSearchOpen: (open) => set({ isSearchOpen: open }),

  isSettingsOpen: false,
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),

  isMapDockCollapsed: false,
  setMapDockCollapsed: (collapsed) => set({ isMapDockCollapsed: collapsed }),
  toggleMapDockCollapsed: () => set((s) => ({ isMapDockCollapsed: !s.isMapDockCollapsed })),
}))
