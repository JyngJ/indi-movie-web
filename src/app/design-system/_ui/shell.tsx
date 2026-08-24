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

/**
 * Do / Don't 2단 카드. 상단 액센트 바로 구분한다.
 *
 * 색은 시맨틱 토큰을 쓴다 — Do는 --color-success, Don't는 --color-error.
 * 예전에는 Do가 primary(파랑), Don't가 neutral(회색)이었는데, 파랑은 이 문서 안에서
 * 링크·선택 상태에도 쓰는 색이라 "권장"이라는 뜻을 갖지 못했고, 회색 Don't는 비활성으로
 * 읽혀 금지가 아니라 "안 중요한 것"처럼 보였다. 옳고 그름은 초록/빨강이 맡는다.
 */
export function UsageCards({ items }: {
  items: { kind: 'do' | 'dont'; visual?: ReactNode; rule: string }[]
}) {
  return (
    <div style={{
      display: 'grid', gap: 'var(--spacing-6)',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    }}>
      {items.map((it, i) => (
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
          <div style={{
            height: 3,
            background: it.kind === 'do' ? 'var(--color-success)' : 'var(--color-error)',
          }} />
          <div style={{ paddingTop: 'var(--spacing-3)' }}>
            {/* 색만으로 옳고 그름을 말하면 색각 이상에서 두 카드가 같아진다 — 표시를 함께 둔다 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)',
              fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em',
              color: it.kind === 'do' ? 'var(--color-success)' : 'var(--color-error)',
            }}>
              <Icon name={it.kind === 'do' ? 'circle-check' : 'circle-x'} size="lg" />
              {it.kind === 'do' ? 'Do' : "Don't"}
            </div>
            <p style={{
              marginTop: 'var(--spacing-2)', fontSize: 'var(--text-body)', lineHeight: 1.7,
              color: 'var(--color-text-sub)',
            }}>{it.rule}</p>
          </div>
        </div>
      ))}
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
