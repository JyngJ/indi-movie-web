'use client'

import { useState } from 'react'
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
import { useIsDark } from '@/hooks/useIsDark'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useThemeStore } from '@/store/themeStore'

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

export default function MorePage() {
  const isDesktop = useIsDesktopLayout()
  const isDark = useIsDark()
  const { setTheme } = useThemeStore()
  const [page, setPage] = useState<SettingsPage>('main')
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
        <SettingsMainPage isDark={isDark} onSetTheme={(theme) => void setTheme(theme)} onNavigate={setPage} />
      )}
      {page === 'report' && !reportSuccess && (
        <SettingsReportPage onSuccess={() => setReportSuccess(true)} />
      )}
      {page === 'report' && reportSuccess && <ReportSuccessNotice />}
      {page === 'attribution' && <SettingsAttributionPage />}
      {page === 'about' && <SettingsAboutPage />}
    </div>
  )
}
