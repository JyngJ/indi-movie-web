'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import type { LocationPermState } from '@/hooks/useLocationPermission'
import { Button, Icon, Divider } from '@/components/primitives'

interface Props {
  state: Extract<LocationPermState, 'prompt' | 'requesting' | 'denied'>
  onRequest: () => void
  onDismiss: () => void
}



export function LocationPermissionModal({ state, onRequest, onDismiss }: Props) {
  const isDesktop = useIsDesktopLayout()
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useLockBodyScroll(true)

  useEffect(() => {
    setMounted(true)
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!mounted) return null

  const isDenied = state === 'denied'
  const isRequesting = state === 'requesting'

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(onDismiss, 260)
  }

  const card = (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'relative',
        background: 'var(--color-surface-card)',
        borderRadius: isDesktop ? 24 : '20px 20px 0 0',
        width: isDesktop ? 380 : '100%',
        maxWidth: isDesktop ? 380 : undefined,
        boxShadow: '0 -4px 48px rgba(0,0,0,0.35)',
        transform: visible
          ? 'translateY(0)'
          : isDesktop ? 'scale(0.96) translateY(12px)' : 'translateY(100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease',
        paddingBottom: 32,
        overflow: 'hidden',
      }}
    >
      {/* 모바일 드래그 핸들 */}
      {!isDesktop && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 9999, background: 'var(--color-border)' }} />
        </div>
      )}

      {/* 로고 */}
      <div style={{ textAlign: 'center', padding: isDesktop ? '20px 24px 16px' : '12px 24px 14px' }}>
        <div style={{
          display: 'inline-block',
          width: 120, height: 30,
          background: 'var(--color-text-primary)',
          WebkitMaskImage: 'url(/logo.svg)',
          maskImage: 'url(/logo.svg)',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }} />
      </div>
      <Divider />

      {/* 본문 */}
      <div style={{ padding: '28px var(--gutter) 0', textAlign: 'center' }}>
        {/* 아이콘 */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          color: isDenied ? 'var(--color-text-caption)' : 'var(--color-primary-base)',
        }}>
          {isDenied ? <Icon name="lock" size={28} /> : <Icon name="map-pin" size={30} />}
        </div>

        {isDenied ? (
          <>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.4, margin: '0 0 16px' }}>
              브라우저의 위치 접근을<br />허용해주세요
            </p>
            {/* 안내 박스 */}
            <div style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: 16,
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ flexShrink: 0, marginTop: 4, color: 'var(--color-text-body)' }}>
                  <Icon name="lock" size={18} strokeWidth={1.75} color="currentColor" />
                </span>
                <div style={{ fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.65 }}>
                  주소창 왼쪽 <strong>자물쇠 아이콘</strong> 클릭<br />
                  <span style={{ color: 'var(--color-text-caption)' }}>
                    → 위치 → <strong>허용</strong> 으로 변경 후 아래 버튼을 눌러주세요
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.35, margin: '0 0 12px' }}>
              내 주변 독립영화관 찾기
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-text-caption)', lineHeight: 1.65, margin: 0 }}>
              가까운 영화관과 오늘의 상영 정보를 바로 보려면<br />위치 접근을 허용해주세요.
            </p>
          </>
        )}
      </div>

      {/* 버튼 영역 */}
      <div style={{ padding: '24px var(--gutter) 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Button size="lg" fullWidth disabled={isRequesting} onClick={onRequest}>
          {isRequesting ? (
            <span>위치 확인 중…</span>
          ) : isDenied ? (
            <span>설정했어요</span>
          ) : (
            <>
              <Icon name="map-pin" size={30} />
              <span>위치 허용하기</span>
            </>
          )}
        </Button>

        <Button variant="ghost" fullWidth onClick={handleDismiss}>
          괜찮아요
        </Button>
      </div>
    </div>
  )

  return createPortal(
    <div
      onClick={handleDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex',
        alignItems: isDesktop ? 'center' : 'flex-end',
        justifyContent: 'center',
        background: visible ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
        transition: 'background 280ms ease',
      }}
    >
      {card}
    </div>,
    document.body,
  )
}
