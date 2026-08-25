import type { ReactNode } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/primitives'
import { siblings } from './nav'

/* 문서 사이트 조각들. 제품 컴포넌트가 아니라 문서 전용이므로 여기서만 쓴다. */

export function DocHeader({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <header style={{ marginBottom: 'var(--spacing-16)' }}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 1.2, fontWeight: 700,
        color: 'var(--color-text-primary)', letterSpacing: '0.01em', margin: 0,
      }}>{title}</h1>
      {lead && (
        <p style={{
          marginTop: 'var(--spacing-4)', fontSize: 'var(--text-body)', lineHeight: 1.8,
          color: 'var(--color-text-sub)',
        }}>{lead}</p>
      )}
      <hr style={{
        marginTop: 'var(--spacing-8)', border: 0,
        borderTop: '1px solid var(--color-border)',
      }} />
    </header>
  )
}

export function DocSection({ id, title, lead, children }: {
  id?: string; title: string; lead?: ReactNode; children: ReactNode
}) {
  return (
    <section id={id} className="ds-anchor" style={{ marginBottom: 'var(--spacing-32)' }}>
      {/* 디바이더는 페이지 제목 아래 한 줄만 둔다 — 섹션마다 그으면 문서가 표처럼 끊긴다 */}
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, lineHeight: 1.3,
        color: 'var(--color-text-primary)', margin: 0,
      }}>{title}</h2>
      {lead && (
        <p style={{
          marginTop: 'var(--spacing-4)', fontSize: 'var(--text-body)', lineHeight: 1.8,
          color: 'var(--color-text-sub)',
        }}>{lead}</p>
      )}
      <div style={{ marginTop: 'var(--spacing-8)' }}>{children}</div>
    </section>
  )
}

export function SubHeading({ id, children, kicker }: { id?: string; children: ReactNode; kicker?: string }) {
  return (
    <div id={id} className="ds-anchor" style={{ marginBottom: 'var(--spacing-4)' }}>
      {kicker && (
        <div style={{
          fontSize: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: '0.4px',
          color: 'var(--color-text-caption)', fontWeight: 600, marginBottom: 4,
        }}>{kicker}</div>
      )}
      <h3 style={{
        fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)',
        margin: 0, lineHeight: 1.4,
      }}>{children}</h3>
    </div>
  )
}

/** 견본을 올리는 무대. 코드잇의 연보라 스테이지 자리 — 우리는 종이 톤으로. */
export function Stage({ children, tone = 'paper', minHeight = 220, padded = true }: {
  children: ReactNode
  tone?: 'paper' | 'tint' | 'dark'
  minHeight?: number
  padded?: boolean
}) {
  return (
    <div
      className="ds-grid-surface"
      data-tone={tone}
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-popover)',
        padding: padded ? 'var(--spacing-8)' : 0,
        minHeight,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexWrap: 'wrap', gap: 'var(--spacing-4)',
      }}
    >{children}</div>
  )
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code style={{
      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-meta)',
      background: 'var(--color-surface-raised)', color: 'var(--color-text-body)',
      padding: '2px 6px', borderRadius: 'var(--radius-badge)',
      /* 토큰 이름이 길어 좁은 화면을 밀어냈다 — 끊어 쓰되 공백에서 먼저 끊는다. */
      overflowWrap: 'anywhere', wordBreak: 'break-word',
    }}>{children}</code>
  )
}

/** ESSENTIAL / OPTIONAL 배지 + 번호 파트 설명. 코드잇 Anatomy 블록. */
export interface AnatomyPart {
  required?: boolean
  name: string
  desc: string
}

export function Anatomy({ parts }: { parts: AnatomyPart[] }) {
  return (
    <div>
      {parts.map((p, i) => (
        <div key={p.name} style={{
          padding: 'var(--spacing-6) 0',
          borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 'var(--text-badge)', fontWeight: 700, letterSpacing: '0.4px',
            padding: '4px 8px', borderRadius: 'var(--radius-pill)',
            background: p.required === false ? 'var(--color-surface-raised)' : 'var(--color-primary-100)',
            color: p.required === false ? 'var(--color-text-caption)' : 'var(--color-primary-900)',
          }}>
            {p.required === false ? 'OPTIONAL' : 'ESSENTIAL'}
          </span>
          <div style={{
            marginTop: 'var(--spacing-3)', fontSize: 'var(--text-title)', fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}>
            {i + 1}. {p.name}
          </div>
          <p style={{
            marginTop: 'var(--spacing-2)', fontSize: 'var(--text-body)', lineHeight: 1.8,
            color: 'var(--color-text-sub)',
          }}>{p.desc}</p>
        </div>
      ))}
    </div>
  )
}

/** 얇은 구분선 정의표 — 코드잇 Properties 블록. */
export function DefTable({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <div>
      {rows.map(([k, v], i) => (
        <div key={i} className="ds-deftable__row" style={{
          gap: 'var(--spacing-4)', padding: 'var(--spacing-4) 0',
          borderTop: '1px solid var(--color-border)',
          fontSize: 'var(--text-body)', lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{k}</div>
          <div style={{ color: 'var(--color-text-sub)' }}>{v}</div>
        </div>
      ))}
    </div>
  )
}

/** 좌 견본 / 우 설명 — 코드잇 Spec 블록. */
export function SpecRow({ visual, title, desc }: { visual?: ReactNode; title: string; desc: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid', gap: 'var(--spacing-6)', alignItems: 'center',
        gridTemplateColumns: 'minmax(0, 1fr)', marginBottom: 'var(--spacing-12)',
      }}
      className={visual ? 'ds-spec-row' : undefined}
    >
      {visual && (
        <div className="ds-grid-surface" style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-popover)', padding: 'var(--spacing-6)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 'var(--spacing-3)', minHeight: 160,
        }}>{visual}</div>
      )}
      <div>
        <div style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</div>
        <p style={{
          marginTop: 'var(--spacing-2)', fontSize: 'var(--text-body)', lineHeight: 1.8,
          color: 'var(--color-text-sub)',
        }}>{desc}</p>
      </div>
    </div>
  )
}

/** Do / Don't 카드. 견본 아래 액센트 바로 구분한다.
 *
 *  등급은 색·아이콘·글자 셋으로 함께 알린다. 예전엔 Do가 primary, Don't가 회색이라
 *  금지가 "덜 중요한 것"으로 읽혔다 — 색 하나로만 구분하면 색을 구별하지 못하는
 *  사람에게는 두 카드가 같은 카드다. */
const Glyph = ({ children }: { children: ReactNode }) => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
)

const USAGE_KIND = {
  do:   { label: 'Do',    color: 'var(--color-success)', icon: <Glyph><path d="M4 10.4 8.2 14.5 16 5.5" /></Glyph> },
  dont: { label: "Don't", color: 'var(--color-error)',   icon: <Glyph><path d="M5 5l10 10M15 5L5 15" /></Glyph> },
  // 경고는 삼각형이 원보다 멀리서 읽힌다 — 원 안의 느낌표는 작은 크기에서 뭉갠다.
  caution: {
    label: 'Caution', color: 'var(--color-warning)',
    icon: <Glyph><path d="M10 3.4 18.2 16.6H1.8z" strokeWidth="1.6" /><path d="M10 8.4v3.4M10 14.2v.2" /></Glyph>,
  },
  note: {
    label: 'Note', color: 'var(--color-primary-base)',
    icon: <Glyph><circle cx="10" cy="10" r="7.6" strokeWidth="1.6" /><path d="M10 9.4v4.2M10 6.4v.2" /></Glyph>,
  },
} as const

export type UsageKind = keyof typeof USAGE_KIND

export interface UsageItem {
  kind: UsageKind
  visual?: ReactNode
  rule: string
  instead?: string
}

/** 규칙과 대안. 대안은 규칙과 다른 면에 올려 눈으로 먼저 구분한다. */
function UsageBody({ rule, instead, onTint = false }: { rule: string; instead?: string; onTint?: boolean }) {
  return (
    <>
      <p style={{
        marginTop: 'var(--spacing-2)', fontSize: 'var(--text-body)', lineHeight: 1.7,
        color: onTint ? 'inherit' : 'var(--color-text-sub)',
      }}>{rule}</p>
      {instead && (
        <div style={{
          marginTop: 'var(--spacing-3)',
          background: onTint ? 'var(--color-surface-card)' : 'var(--color-surface-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-control)',
          padding: 'var(--spacing-3) var(--spacing-4)',
        }}>
          <div style={{
            fontSize: 'var(--text-caption)', fontWeight: 700, letterSpacing: '0.4px',
            color: 'var(--color-text-caption)',
          }}>대신</div>
          <p style={{
            marginTop: 'var(--spacing-1)', fontSize: 'var(--text-body)', lineHeight: 1.7,
            color: 'var(--color-text-sub)',
          }}>{instead}</p>
        </div>
      )}
    </>
  )
}

/** Do / Don't는 짝이라 나란히 두고, Caution·Note는 짝이 없으므로 아래에 띠로 눕힌다.
 *  셋을 같은 격자에 넣으면 마지막 하나가 옆 칸을 비운 채 서서 판이 어긋난다. */
export function UsageCards({ items }: { items: UsageItem[] }) {
  const pairs = items.filter(i => i.kind === 'do' || i.kind === 'dont')
  const notes = items.filter(i => i.kind === 'caution' || i.kind === 'note')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {pairs.length > 0 && (
        <div className="ds-usage-grid">
          {pairs.map((it, i) => {
            const k = USAGE_KIND[it.kind]
            return (
              <div key={i}>
                {it.visual && (
                  <div className="ds-grid-surface" style={{
                    borderRadius: 'var(--radius-popover)',
                    border: '1px solid var(--color-border)', borderBottom: 'none',
                    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
                    padding: 'var(--spacing-6)', minHeight: 150,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexWrap: 'wrap', gap: 'var(--spacing-3)',
                  }}>{it.visual}</div>
                )}
                <div style={{ height: 3, background: k.color }} />
                <div style={{ paddingTop: 'var(--spacing-3)' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)',
                    fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', color: k.color,
                  }}>
                    {/* 색을 못 읽는 자리를 아이콘이 대신한다 */}
                    {k.icon}
                    {k.label}
                  </div>
                  <UsageBody rule={it.rule} instead={it.instead} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {notes.map((it, i) => {
        const k = USAGE_KIND[it.kind]
        const tint = it.kind === 'caution' ? 'var(--color-warning-tint)' : 'var(--color-primary-100)'
        const ink = it.kind === 'caution' ? 'var(--color-warning-deep)' : 'var(--color-primary-900)'
        return (
          <div key={i} style={{
            display: 'flex', gap: 'var(--spacing-3)',
            background: tint, borderLeft: `3px solid ${k.color}`,
            borderRadius: '0 var(--radius-control) var(--radius-control) 0',
            padding: 'var(--spacing-4) var(--spacing-5)',
            color: ink,
          }}>
            <span style={{ flexShrink: 0, color: k.color, marginTop: 2 }}>{k.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 'var(--text-title)', fontWeight: 700, letterSpacing: '-0.01em', color: k.color,
              }}>{k.label}</div>
              <UsageBody rule={it.rule} instead={it.instead} onTint />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function PrevNext({ href }: { href: string }) {
  const { prev, next } = siblings(href)
  const cell = (dir: '이전' | '다음', page: { href: string; label: string } | null, align: 'left' | 'right') => (
    page ? (
      <Link href={page.href} className="ds-prevnext" style={{ textAlign: align }}>
        <div style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>{dir}</div>
        <div style={{
          marginTop: 2, fontSize: 'var(--text-title)', fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}>{page.label}</div>
      </Link>
    ) : <div />
  )

  return (
    <nav style={{
      marginTop: 'var(--spacing-8)', paddingTop: 'var(--spacing-8)',
      borderTop: '1px solid var(--color-border)',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)',
    }}>
      {cell('이전', prev, 'left')}
      {cell('다음', next, 'right')}
    </nav>
  )
}

export function DocFooter() {
  return (
    <div style={{
      marginTop: 'var(--spacing-12)',
      display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)',
    }}>
      <div style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
        Designed, Built by <b style={{ color: 'var(--color-text-body)' }}>정재용</b>
      </div>
      {/* 받은 로고는 흰 글리프라 색을 못 바꾼다 — 마스크로 깔아 색만 토큰으로 준다 */}
      <a
        href="https://www.linkedin.com/in/jaeyongjung/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="정재용 링크드인"
        className="ds-linkedin"
      >
        <span className="ds-linkedin__glyph" aria-hidden />
      </a>
    </div>
  )
}

/** 문서 한 장. */
export function DocPage({ href, title, lead, children }: {
  href: string
  title: string
  lead?: ReactNode
  children: ReactNode
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <DocHeader title={title} lead={lead} />
      {children}
      <PrevNext href={href} />
      <DocFooter />
    </div>
  )
}
