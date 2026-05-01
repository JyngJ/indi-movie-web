import { create } from 'zustand'

interface UIStore {
  isBottomSheetOpen: boolean
  bottomSheetContent: React.ReactNode | null
  openBottomSheet: (content: React.ReactNode) => void
  closeBottomSheet: () => void

  isSearchOpen: boolean
  setSearchOpen: (open: boolean) => void
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
}))
