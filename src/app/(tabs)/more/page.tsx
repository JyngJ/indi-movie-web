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
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'

const PAGE_TITLES: Record<SettingsPage, string> = {
  main: '설정',
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
      설정 탭 — 준비 중
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

  if (isDesktop) return <DesktopPlaceholder />

  const handleBack = () => setPage('main')

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
      <SettingsHeader title={PAGE_TITLES[page]} onBack={page !== 'main' ? handleBack : undefined} />

      {page === 'main' && (
        <SettingsMainPage onNavigate={setPage} />
      )}
      {page === 'report' && !reportSuccess && (
        <SettingsReportPage initialCategory={initialCategory} onSuccess={() => setReportSuccess(true)} />
      )}
      {page === 'report' && reportSuccess && <ReportSuccessNotice />}
      {page === 'attribution' && <SettingsAttributionPage />}
      {page === 'about' && <SettingsAboutPage />}
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
