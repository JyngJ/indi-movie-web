'use client'

import { useEmailNotifications } from '@/hooks/useEmailNotifications'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { useProgressRouter } from '@/hooks/useProgressRouter'
import { useUIStore } from '@/store/uiStore'
import { MenuCard, MenuRow, Switch, ListRow } from '@/components/primitives'
import { useNotificationPrefs } from '@/hooks/useNotifications'

/** 24시간 정각 목록 — 조용한 시간 선택용 */
const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)

/**
 * 설정 한 줄. 기본은 [제목·설명 | 컨트롤] 가로 배치.
 * stacked면 컨트롤이 설명 아래로 내려간다 — 지역 칩처럼 폭을 다 쓰는 컨트롤용.
 */

/** 알림 설정 — 모바일 페이지와 데스크톱 MY 팝오버가 공유한다.
 * 이메일 수신을 선택한 회원은 월·금 오전 9시에 소식을 요약해 받는다.
 * 기존 소식 탭의 종류별 설정은 이메일에도 적용한다.
 */
export function NotificationSettingsContent() {
  const { status } = useAuth()
  const email = useEmailNotifications()
  const router = useProgressRouter()
  const closeMy = useUIStore(s => s.setMyOpen)
  const subscription = email.data?.subscription
  const receiving = subscription?.status === 'active'
  const pending = subscription?.status === 'pending'
  const emailDescription = receiving ? `${subscription.email} · 월·금 오전 9시`
    : pending ? `${subscription.email} · 인증 대기 중` : '새 소식이 있으면 월·금 오전 9시에 보내 드려요'
  const { prefs, isLoading, saving, error, save } = useNotificationPrefs()


  if (status === 'loading' || (status === 'signed-in' && isLoading)) {
    return <p style={{ margin: '24px var(--gutter)', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>불러오는 중…</p>
  }
  if (status === 'signed-out') {
    return (
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px var(--gutter)' }}>
        <LoginPanel returnTo="/my/notifications" />
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <p style={{
        margin: 0, padding: '16px var(--gutter)',
        fontSize: 'var(--text-meta)', lineHeight: 1.6, color: 'var(--color-text-sub)',
        background: 'var(--color-surface-raised)',
      }}>
        관심 영화·감독·극장에 새 상영이 생기면 소식 탭에 쌓아둬요
      </p>

      {/* 카드 하나로 — 종류·시간·지역을 나눠 담으면 카드가 셋이 되는데,
          한 화면에 다 들어가는 분량이라 나눌 이유가 없었다 (2026-08-20) */}
      <MenuCard style={{ marginTop: 16, backgroundColor: 'var(--color-surface-card)' }}>
        <ListRow title="새 상영" description="관심 영화·감독 작품이 새 극장에 걸리거나, 관심 극장에 새 작품이 들어올 때">
          <Switch label="새 상영 알림" checked={prefs.newScreening} disabled={saving}
            onChange={(v) => save({ newScreening: v })} />
        </ListRow>
        {/* 방해 금지·지역은 뺐다 (2026-08-24) — 바깥 발송이 없어 아직 필요 없다. 발송 붙일 때 복원 */}
        <ListRow title="막바지 상영" description="관심 작품의 상영이 곧 끝날 때 (5일 이내)" last={!email.data?.enabled}>
          <Switch label="막바지 상영 알림" checked={prefs.lastWeek} disabled={saving}
            onChange={(v) => save({ lastWeek: v })} />
        </ListRow>
        {email.data?.enabled && (
          <MenuRow title="이메일로 소식 받기" description={emailDescription} last onClick={() => {
            closeMy(false)
            router.push('/my/notifications/email')
          }} />
        )}
      </MenuCard>
      {email.isError && <p role="alert" className="p-4 text-[length:var(--text-meta)] text-[var(--color-error)]">이메일 설정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>}

      {error && (
        <p style={{ margin: '16px var(--gutter)', fontSize: 'var(--text-meta)', color: 'var(--color-error)' }}>
          설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
    </div>
  )
}
