'use client'

import { useEffect, type ReactNode, type RefObject } from 'react'
import { SearchBar } from '@/components/primitives'

const SEARCH_GUIDE_EXAMPLES = [
  { label: '영화관', example: '서울아트시네마' },
  { label: '영화', example: '레오파드' },
  { label: '감독', example: '홍상수' },
  { label: '지하철역', example: '혜화역' },
]

/**
 * 검색 패널 — 모바일: 전체화면 오버레이(iOS 키보드 대응) / 데스크톱: 좌측 레일에 붙는 플랫 도크 패널.
 * 도크가 비어 있던 채로 열렸으면(slideMode) 도크처럼 좌측에서 슬라이드 인/아웃,
 * 다른 시트(극장/상세) 위로 열렸으면 애니메이션 없이 바로 겹쳐 표시.
 *
 * 검색어 상태·결과 계산·선택 내비게이션은 호출부(MapView)가 소유하고,
 * 이 컴포넌트는 패널 크롬(컨테이너·검색바·최근 검색·빈/무결과 상태)만 담당한다.
 * 결과 섹션은 children으로 주입.
 */
export function SearchPanel({
  isDesktopLayout,
  leftOffset,
  width,
  slideMode,
  slideIn,
  query,
  inputRef,
  recentSearches,
  hasResults,
  onQueryChange,
  onClose,
  onRecentSelect,
  onRecentRemove,
  onRecentClearAll,
  children,
}: {
  isDesktopLayout: boolean
  /** 데스크톱에서 패널이 시작되는 x 오프셋(글로벌 내비 레일 폭) */
  leftOffset: number
  /** 데스크톱 패널 폭 — 좌측 도크(DESKTOP_DOCK_WIDTH)와 동일 값 */
  width: number
  /** 도크가 비어 있는 채로 열렸을 때만 true — 좌측 슬라이드 인/아웃 적용 */
  slideMode: boolean
  /** slideMode일 때 true면 화면 안(translateX(0)), false면 화면 밖(-100%) */
  slideIn: boolean
  query: string
  inputRef: RefObject<HTMLInputElement | null>
  recentSearches: string[]
  hasResults: boolean
  onQueryChange: (value: string) => void
  onClose: () => void
  onRecentSelect: (query: string) => void
  onRecentRemove: (query: string) => void
  onRecentClearAll: () => void
  children?: ReactNode
}) {
  // 데스크톱: 패널이 열리면(마운트되면) 검색 입력 자동 포커스 — 좌측 레일 버튼·/search 딥링크처럼
  // openSearch()를 거치지 않는 진입에서도 동일하게 동작.
  // 모바일은 iOS 키보드 정책상 클릭 핸들러 안의 동기 focus가 필요하므로 openSearch가 담당.
  useEffect(() => {
    if (isDesktopLayout) inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{
      position: 'absolute',
      inset: isDesktopLayout ? `0 auto 0 ${leftOffset}px` : 0,
      width: isDesktopLayout ? width : 'auto',
      maxWidth: isDesktopLayout ? `calc(100vw - ${leftOffset}px)` : undefined,
      backgroundColor: 'var(--color-surface-bg)',
      display: 'flex',
      flexDirection: 'column',
      // 슬라이드 모드일 땐 도크와 같은 슬롯에서 겹치므로 도크보다 살짝 위, 글로벌 내비 레일보단 아래(레일이 항상 최상단)
      zIndex: slideMode ? 945 : 2000,
      borderRight: isDesktopLayout ? '1px solid var(--color-border)' : undefined,
      overflow: 'hidden',
      transform: slideMode ? (slideIn ? 'translateX(0)' : 'translateX(-100%)') : undefined,
      transition: slideMode ? 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)' : undefined,
    }}>
      {/* 검색바 헤더 — < 버튼은 SearchBar의 onBack 쉐브론이 담당 */}
      <div style={{
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 12,
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <SearchBar
          ref={inputRef}
          value={query}
          placeholder="영화, 감독, 역, 영화관 검색"
          inputFontSize={isDesktopLayout ? 14 : 16}
          onChange={(e) => onQueryChange(e.target.value)}
          onClear={() => onQueryChange('')}
          onBack={onClose}
        />
      </div>

      {/* 결과 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        {query === '' ? (
          <div style={{ marginTop: 0 }}>
            {recentSearches.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <p style={{ fontSize: 'var(--text-meta)', fontWeight: 700, color: 'var(--color-text-caption)', margin: 0 }}>최근 검색</p>
                  <button
                    onClick={onRecentClearAll}
                    style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
                  >
                    전체 삭제
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recentSearches.map(q => (
                    <div
                      key={q}
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-caption)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                      </svg>
                      <button
                        onClick={() => onRecentSelect(q)}
                        style={{ flex: 1, background: 'none', border: 0, cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: 'var(--text-body)', color: 'var(--color-text-body)' }}
                      >
                        {q}
                      </button>
                      <button
                        onClick={() => onRecentRemove(q)}
                        style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, color: 'var(--color-text-caption)', lineHeight: 1, flexShrink: 0 }}
                      >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: 20 }}>
              <p style={{ margin: '0 0 4px', fontSize: 'var(--text-meta)', fontWeight: 600, color: 'var(--color-text-caption)' }}>
                영화관, 영화, 감독, 지하철역을 모두 검색할 수 있어요
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
                {SEARCH_GUIDE_EXAMPLES.map(({ label, example }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-2-5)', lineHeight: 1.9 }}>
                    <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', width: 44, flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', opacity: 0.6 }}>&quot;{example}&quot;</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : hasResults ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {children}
          </div>
        ) : (
          <p style={{ textAlign: 'center', marginTop: 60, fontSize: 'var(--text-body)', color: 'var(--color-text-caption)' }}>
            &ldquo;{query}&rdquo;와 일치하는 결과가 없습니다
          </p>
        )}
      </div>
    </div>
  )
}
