import Link from 'next/link'
import type { ReactNode } from 'react'

/** 디자인 시스템 사이트 공용 껍데기.
 *  제품 UI가 아니라 문서라서 폭·타이포를 따로 잡는다(제품은 480 모바일 기준). */

export function Page({ title, lead, children }: { title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <article style={{ maxWidth: 1040 }}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-h1)', fontWeight: 700,
        color: 'var(--color-text-primary)', letterSpacing: '0.02em',
      }}>{title}</h1>
      {lead && (
        <p style={{
          marginTop: 'var(--spacing-3)', fontSize: 'var(--text-body)', lineHeight: 1.7,
          color: 'var(--color-text-sub)', maxWidth: '64ch',
        }}>{lead}</p>
      )}
      <div style={{ marginTop: 'var(--spacing-8)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-12)' }}>
        {children}
      </div>
    </article>
  )
}

export function Section({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-h2)', fontWeight: 700,
        color: 'var(--color-text-primary)', paddingBottom: 'var(--spacing-2)',
        borderBottom: '1px solid var(--color-border)',
      }}>{title}</h2>
      {note && (
        <p style={{
          marginTop: 'var(--spacing-3)', fontSize: 'var(--text-meta)', lineHeight: 1.7,
          color: 'var(--color-text-caption)', maxWidth: '68ch',
        }}>{note}</p>
      )}
      <div style={{ marginTop: 'var(--spacing-4)' }}>{children}</div>
    </section>
  )
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code style={{
      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-meta)',
      background: 'var(--color-surface-raised)', color: 'var(--color-text-body)',
      padding: '2px 6px', borderRadius: 'var(--radius-badge)', whiteSpace: 'nowrap',
    }}>{children}</code>
  )
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-meta)' }}>
        <thead>
          <tr>
            {head.map(h => (
              <th key={h} style={{
                textAlign: 'left', padding: 'var(--spacing-3)', fontWeight: 600,
                color: 'var(--color-text-caption)', background: 'var(--color-surface-raised)',
                whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
              {r.map((cell, j) => (
                <td key={j} style={{
                  padding: 'var(--spacing-3)', color: 'var(--color-text-body)',
                  verticalAlign: 'top', lineHeight: 1.6,
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div style={{
      background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-control)', padding: 'var(--spacing-4)', minWidth: 132,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-h1)', fontWeight: 700,
        color: 'var(--color-text-primary)', lineHeight: 1,
      }}>{value}</div>
      <div style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>{label}</div>
    </div>
  )
}

/** 데모를 얹는 판. 견본은 종이 위에 놓인 것처럼 보여야 값이 읽힌다. */
export function Canvas({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div style={{
      background: dark ? 'var(--color-neutral-800)' : 'var(--color-surface-card)',
      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)',
      padding: 'var(--spacing-6)', display: 'flex', flexWrap: 'wrap',
      gap: 'var(--spacing-4)', alignItems: 'center',
    }}>{children}</div>
  )
}

export function NavLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link href={href} style={{
      display: 'block', padding: '6px var(--spacing-3)', borderRadius: 'var(--radius-button)',
      fontSize: 'var(--text-body)', textDecoration: 'none', lineHeight: 1.6,
      color: active ? 'var(--color-primary-900)' : 'var(--color-text-sub)',
      background: active ? 'var(--color-primary-100)' : 'transparent',
      fontWeight: active ? 600 : 500,
    }}>{label}</Link>
  )
}
