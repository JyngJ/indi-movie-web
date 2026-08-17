import { create } from 'zustand'
import type { SettingsPage } from '@/components/map/SettingsPanel'

export interface LoginSheetState {
  /** 진입 맥락 카피 (예: "관심 영화로 등록하면 새 상영 소식을 알려드려요") */
  title?: string
  description?: string
  /** 로그인 후 돌아갈 경로. 생략 시 현재 경로 */
  returnTo?: string
}

interface UIStore {
  isBottomSheetOpen: boolean
  bottomSheetContent: React.ReactNode | null
  openBottomSheet: (content: React.ReactNode) => void
  closeBottomSheet: () => void

  isSearchOpen: boolean
  setSearchOpen: (open: boolean) => void

  isSettingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  /** 설정 패널을 열 때 보여줄 첫 페이지 — 예: 좌측 레일 '신고' 버튼은 바로 'report'로 진입 */
  settingsInitialPage: SettingsPage
  openSettingsPage: (page: SettingsPage) => void

  /** 데스크톱 소식 패널 (모바일은 /feed 페이지) */
  isFeedOpen: boolean
  setFeedOpen: (open: boolean) => void

  /** 전역 로그인 시트 — 하트 클릭 등 컨텍스트 진입용. 내 계정 탭 홈은 시트 없이 자체 화면 (IA 42) */
  loginSheet: LoginSheetState | null
  openLoginSheet: (opts?: Partial<LoginSheetState>) => void
  closeLoginSheet: () => void

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
  settingsInitialPage: 'main',
  openSettingsPage: (page) => set({ isSettingsOpen: true, settingsInitialPage: page }),

  isFeedOpen: false,
  setFeedOpen: (open) => set({ isFeedOpen: open }),

  loginSheet: null,
  openLoginSheet: (opts) => set({ loginSheet: { ...(opts ?? {}) } }),
  closeLoginSheet: () => set({ loginSheet: null }),

  isMapDockCollapsed: false,
  setMapDockCollapsed: (collapsed) => set({ isMapDockCollapsed: collapsed }),
  toggleMapDockCollapsed: () => set((s) => ({ isMapDockCollapsed: !s.isMapDockCollapsed })),
}))
