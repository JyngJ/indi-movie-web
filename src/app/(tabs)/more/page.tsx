'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ReportSuccessNotice,
  SettingsAboutPage,
  SettingsAttributionPage,
  SettingsHeader,
  SettingsMainPage,
  SettingsReportPage,
  type SettingsPage,
} from '@/components/map/SettingsPanel'
import { TransitionPanel, slideVariants } from '@/components/motion'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'

/* TransitionPanel 자식 순서와 일치해야 한다 */
const PAGE_INDEX: Record<SettingsPage, number> = { main: 0, report: 1, attribution: 2, about: 3 }

const PAGE_TITLES: Record<SettingsPage, string> = {
  main: '더보기',
  report: '버그 리포트',
  attribution: '출처 표기',
  about: '만든 사람',
}

// P1 빈 셸 — 와이어프레임은 P4(feat/more-page)에서 채움
function DesktopPlaceholder() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        paddingLeft: GLOBAL_NAV_DESKTOP_WIDTH,
        color: 'var(--color-text-caption)',
        fontSize: 14,
      }}
    >
      더보기 — 준비 중
    </div>
  )
}

// FAQ의 제보/요청 버튼이 ?page=report&category=…로 진입한다 — 리포트 폼을 분류까지
// 채워서 바로 연다. useSearchParams는 Suspense 경계가 필요해 내용을 분리했다.
function MorePageContent() {
  const isDesktop = useIsDesktopLayout()
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get('category') ?? undefined
  const [page, setPage] = useState<SettingsPage>(
    searchParams.get('page') === 'report' ? 'report' : 'main'
  )
  const [reportSuccess, setReportSuccess] = useState(false)
  const [direction, setDirection] = useState(1)

  if (isDesktop) return <DesktopPlaceholder />

  const navigateTo = (p: SettingsPage) => { setDirection(1); setPage(p) }
  const handleBack = () => { setDirection(-1); setPage('main') }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        paddingBottom: `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom))`,
        backgroundColor: 'var(--color-surface-bg)',
      }}
    >
      <SettingsHeader title={PAGE_TITLES[page]} onBack={handleBack} />

      {/* 페이지 전환 — 메인→하위는 오른쪽에서, 뒤로가기는 왼쪽에서 들어온다 */}
      <TransitionPanel
        className="settings-pages"
        activeIndex={PAGE_INDEX[page]}
        direction={direction}
        variants={slideVariants(360)}
        style={{ flex: 1, minHeight: 0 }}
      >
        <SettingsMainPage onNavigate={navigateTo} />
        {reportSuccess ? (
          <ReportSuccessNotice />
        ) : (
          <SettingsReportPage initialCategory={initialCategory} onSuccess={() => setReportSuccess(true)} />
        )}
        <SettingsAttributionPage />
        <SettingsAboutPage />
      </TransitionPanel>
    </div>
  )
}

export default function MorePage() {
  return (
    <Suspense>
      <MorePageContent />
    </Suspense>
  )
}
