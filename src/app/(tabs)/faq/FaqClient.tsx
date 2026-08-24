'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { FooterWordmark } from '@/components/domain/FooterWordmark'
import type { FaqSection } from './content'
import { Icon } from '@/components/primitives'

/**
 * FAQ 본문 — 상영작 탭과 같은 프레임을 쓴다.
 * 헤더는 전폭(구분선 포함), 본문은 데스크톱에서 최대폭 컬럼으로 중앙 정렬.
 * 문답은 카드형 아코디언 — 답변은 항상 DOM에 있고 grid-rows(0fr→1fr)로 접고 펴서
 * 크롤러가 접힌 상태에서도 본문을 읽는다(FAQPage 스키마와 본문 일치 유지).
 */

function FaqCard({
  item,
}: {
  item: FaqSection['items'][number]
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-popover)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          padding: '16px',
          fontSize: 'var(--text-subtitle)',
          fontWeight: 600,
          fontFamily: 'inherit',
          color: 'var(--color-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 'unset',
        }}
      >
        <span style={{ color: 'var(--color-text-caption)', fontWeight: 700, flexShrink: 0 }}>Q.</span>
        <span style={{ flex: 1 }}>{item.question}</span>
        <Icon name="chevron-down" size={16} />
      </button>

      {/* grid-rows 높이 전환 — 답변은 항상 DOM에 존재 */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 240ms cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <div
            style={{
              paddingInline: 16,
              paddingBottom: 16,
              fontSize: 'var(--text-subtitle)',
              opacity: open ? 1 : 0,
              transition: `opacity 200ms ease ${open ? '60ms' : '0ms'}`,
            }}
          >
            <p style={{ margin: 0 }}>{item.answer}</p>
            {item.action && (
              <Link
                href={item.action.href}
                tabIndex={open ? 0 : -1}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  marginTop: 12,
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-button)',
                  border: 'none',
                  backgroundColor: 'var(--color-primary-100)',
                  color: 'var(--color-primary-900)',
                  fontSize: 'var(--text-meta)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                {item.action.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function FaqClient({ sections }: { sections: FaqSection[] }) {
  const isDesktop = useIsDesktopLayout()

  return (
    <div
      style={{
        minHeight: '100dvh',
        paddingLeft: isDesktop ? GLOBAL_NAV_DESKTOP_WIDTH : 0,
        paddingBottom: isDesktop ? 40 : `calc(${GLOBAL_NAV_MOBILE_HEIGHT}px + env(safe-area-inset-bottom) + 24px)`,
        backgroundColor: 'var(--color-surface-bg)',
      }}
    >
      {/* 헤더 — 전폭, 하단 구분선 */}
      <header
        style={{
          paddingTop: 20,
          paddingInline: 'var(--gutter-sheet)',
          ...(isDesktop ? { position: 'sticky' as const, top: 0, zIndex: 100, backgroundColor: 'var(--color-surface-bg)' } : {}),
        }}
      >
        <h1 className="display-h1" style={{ margin: 0, color: 'var(--color-text-primary)' }}>
          자주 묻는 질문
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
          영화볼지도 서비스 소개와 이용 안내
        </p>
        <div style={{ marginTop: 16, height: 1, background: 'var(--color-border)' }} />
      </header>

      {/* 본문 — PC 최대폭 컬럼 중앙 정렬 (상영작 탭과 동일한 폭) */}
      <main
        style={{
          maxWidth: isDesktop ? 760 : undefined,
          margin: '0 auto',
          paddingTop: 8,
          paddingInline: 'var(--gutter-sheet)',
          color: 'var(--color-text-body)',
          lineHeight: 1.7,
        }}
      >
        {sections.map((section) => (
          <section key={section.title} style={{ marginTop: 48 }}>
            <h2
              className="display-h2"
              style={{ color: 'var(--color-text-primary)', margin: '0 0 12px' }}
            >
              {section.title}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {section.items.map((item) => (
                <FaqCard key={item.question} item={item} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <FooterWordmark isDesktop={isDesktop} />
    </div>
  )
}
