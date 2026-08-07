'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { getPrevPathname } from '@/components/navigation/GlobalNav'

const IcoChevronLeft = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

interface DetailTopBarProps {
  /** breadcrumb 카테고리 라벨 (예: '영화') */
  crumbLabel: string
  /** 카테고리 클릭 시 이동 경로 (예: '/films') */
  crumbHref: string
  /** 현재 항목명 (영화 제목·극장명·감독명) */
  title: string
  /** 우측 위젯 (지역 칩 등) */
  trailing?: ReactNode
  isDesktop: boolean
}

/** 상세 화면 공통 상단 바 — 뒤로가기 + [카테고리 > 현재명] breadcrumb + 우측 위젯.
 *  DetailShell(본문 1000 컬럼) 안에서 sticky — 화면별 자체 NavBar 대신 이걸 쓸 것. */
export function DetailTopBar({ crumbLabel, crumbHref, title, trailing, isDesktop }: DetailTopBarProps) {
  const router = useRouter()
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top)', backgroundColor: 'var(--color-surface-bg)', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: isDesktop ? 4 : 0, paddingRight: 12, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <button
            onClick={() => {
              // 직전이 상영작 흐름(/films*)이면 히스토리 back, 아니면(지도 등 다른 탭 경유)
              // 상영작 탭으로 — "직전 페이지"가 아니라 "이 흐름의 이전"으로 가는 규칙
              const prev = getPrevPathname()
              if (prev && prev.startsWith(crumbHref)) router.back()
              else router.push(crumbHref)
            }}
            aria-label="뒤로가기"
            style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-body)', flexShrink: 0 }}
          >
            <IcoChevronLeft />
          </button>
          <button
            onClick={() => router.push(crumbHref)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-caption)', fontSize: 'var(--text-meta)', minHeight: 'auto', padding: 0, flexShrink: 0 }}
          >
            {crumbLabel}
          </button>
          <span style={{ color: 'var(--color-text-caption)', fontSize: 'var(--text-meta)', flexShrink: 0 }}>&gt;</span>
          <span style={{ fontSize: 'var(--text-meta)', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </span>
        </div>
        {trailing && <div style={{ flexShrink: 0 }}>{trailing}</div>}
      </div>
    </div>
  )
}
