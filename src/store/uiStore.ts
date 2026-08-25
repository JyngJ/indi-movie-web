import { create } from 'zustand'
import type { SettingsPage } from '@/components/map/SettingsPanel'

export interface LoginSheetState {
  /** 진입 맥락 카피 (예: "관심 영화로 등록하면 새 상영 소식을 알려드려요") */
  title?: string
  description?: string
  /** 로그인 후 돌아갈 경로. 생략 시 현재 경로 */
  returnTo?: string
}

/** 지도에 "이걸 열어달라"고 넘기는 요청. 소식·관심 목록 팝오버는 MapView 밖에 있어서
 *  패널 상태(MapView 내부 state)를 직접 못 건드린다 — 이 값을 보고 MapView가 대신 연다. */
export type MapFocusRequest =
  /** title은 필터 칩·토스트 문구용 — 없으면 MapView가 영화 목록에서 찾는다 */
  | { type: 'movie'; id: string; title?: string }
  | { type: 'director'; name: string }
  | { type: 'theater'; id: string }

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
  /** 데스크톱 MY 팝오버 (모바일은 /my 페이지) */
  isMyOpen: boolean
  setMyOpen: (open: boolean) => void

  /** 전역 로그인 시트 — 하트 클릭 등 컨텍스트 진입용. 내 계정 탭 홈은 시트 없이 자체 화면 (IA 42) */
  loginSheet: LoginSheetState | null
  openLoginSheet: (opts?: Partial<LoginSheetState>) => void
  closeLoginSheet: () => void

  /** 지도에 열어달라고 요청한 대상 — MapView가 처리하고 즉시 비운다 */
  mapFocus: MapFocusRequest | null
  requestMapFocus: (focus: MapFocusRequest) => void
  clearMapFocus: () => void

  /** 데스크톱 지도 화면 좌측 도크 접힘 상태 — 도크 토글 버튼과 GlobalNav '지도' 탭 재클릭이 함께 제어 */
  isMapDockCollapsed: boolean
  setMapDockCollapsed: (collapsed: boolean) => void
  toggleMapDockCollapsed: () => void
}

export const useUIStore = create<UIStore>((set, get) => ({
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
  setFeedOpen: (open) => set({ isFeedOpen: open, isMyOpen: open ? false : get().isMyOpen }),
  isMyOpen: false,
  setMyOpen: (open) => set({ isMyOpen: open, isFeedOpen: open ? false : get().isFeedOpen }),

  loginSheet: null,
  openLoginSheet: (opts) => set({ loginSheet: { ...(opts ?? {}) } }),
  closeLoginSheet: () => set({ loginSheet: null }),

  mapFocus: null,
  requestMapFocus: (focus) => set({ mapFocus: focus }),
  clearMapFocus: () => set({ mapFocus: null }),

  isMapDockCollapsed: false,
  setMapDockCollapsed: (collapsed) => set({ isMapDockCollapsed: collapsed }),
  toggleMapDockCollapsed: () => set((s) => ({ isMapDockCollapsed: !s.isMapDockCollapsed })),
}))
