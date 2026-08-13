'use client'

import Link from 'next/link'
import { GLOBAL_NAV_DESKTOP_WIDTH, GLOBAL_NAV_MOBILE_HEIGHT } from '@/components/navigation/GlobalNav'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import type { FaqSection } from './content'

/**
 * FAQ 본문 — 상영작 탭과 같은 프레임을 쓴다.
 * 헤더는 전폭(구분선 포함), 본문은 데스크톱에서 최대폭 컬럼으로 중앙 정렬.
 * 문답은 네이티브 <details>로 접고 편다 — 접혀 있어도 답변이 서버 HTML에
 * 그대로 남아 크롤러가 읽는다(FAQPage 스키마와 본문 일치 유지).
 */
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
          <section key={section.title} style={{ marginTop: 56 }}>
            <h2
              className="display-h2"
              style={{ color: 'var(--color-text-primary)', margin: '0 0 8px' }}
            >
              {section.title}
            </h2>
            {section.items.map((item) => (
              <details
                key={item.question}
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    padding: '16px 0',
                    fontSize: 'var(--text-subtitle)',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    listStyle: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ color: 'var(--color-text-caption)', fontWeight: 700, flexShrink: 0 }}>Q.</span>
                  <span style={{ flex: 1 }}>{item.question}</span>
                  <svg
                    className="faq-chevron"
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-text-placeholder)"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <div style={{ paddingBottom: 16, fontSize: 'var(--text-subtitle)' }}>
                  <p style={{ margin: 0 }}>{item.answer}</p>
                  {item.action && (
                    <Link
                      href={item.action.href}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        marginTop: 12,
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-button)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface-card)',
                        color: 'var(--color-text-primary)',
                        fontSize: 'var(--text-meta)',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      {item.action.label}
                    </Link>
                  )}
                </div>
              </details>
            ))}
          </section>
        ))}
      </main>

      {/* summary 기본 마커 제거 + 열림 상태 셰브론 회전 */}
      <style>{`
        .faq-chevron { transition: transform 0.15s ease; }
        details[open] .faq-chevron { transform: rotate(180deg); }
        details > summary::-webkit-details-marker { display: none; }
      `}</style>
    </div>
  )
}
