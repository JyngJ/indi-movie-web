import type { CSSProperties, ReactNode } from 'react'
import { BackLink } from './BackLink'

/** 약관·개인정보 처리방침 같은 법적 문서의 공통 틀 — 제목, 시행일, 본문 폭·글자 크기 */
export function LegalDocument({ title, effectiveDate, children }: { title: string; effectiveDate: string; children: ReactNode }) {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '40px var(--gutter) 80px',
        color: 'var(--color-text-body)',
        lineHeight: 1.7,
        fontSize: 'var(--text-subtitle)',
      }}
    >
      <BackLink />

      <h1
        className="display-h1"
        style={{
          color: 'var(--color-text-primary)',
          margin: '20px 0 8px',
        }}
      >
        {title}
      </h1>
      <p style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', marginBottom: 28 }}>
        시행일: {effectiveDate}
      </p>

      {children}

      <p style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', marginTop: 32 }}>
        시행일: {effectiveDate}
      </p>
    </main>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 'var(--text-title)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          margin: '0 0 8px',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

export const legalListStyle: CSSProperties = {
  margin: '12px 0 0',
  paddingLeft: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

export const legalLinkStyle: CSSProperties = {
  color: 'var(--color-primary-base)',
}

export const legalNoteStyle: CSSProperties = {
  marginTop: 12,
  fontSize: 'var(--text-meta)',
  color: 'var(--color-text-caption)',
}
