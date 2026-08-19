import { manifest, type Token } from '@/design-system'
import { Page, Section, Code, Table } from '../_ui/shell'

const isColor = (t: Token) => /^#|^rgba?\(/.test(t.resolved)
const isLength = (t: Token) => /^\d+(\.\d+)?px$/.test(t.resolved)
const isShadow = (t: Token) => t.name.startsWith('--shadow-') && t.resolved.includes(' ')

function Swatch({ token }: { token: Token }) {
  return (
    <div style={{
      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)',
      overflow: 'hidden', background: 'var(--color-surface-card)',
    }}>
      <div style={{
        height: 64, background: token.resolved,
        borderBottom: '1px solid var(--color-border)',
        backgroundImage: token.resolved.startsWith('rgba')
          ? 'repeating-conic-gradient(var(--color-neutral-200) 0% 25%, transparent 0% 50%)'
          : undefined,
        backgroundSize: '12px 12px',
      }}>
        {token.resolved.startsWith('rgba') && (
          <div style={{ width: '100%', height: '100%', background: token.resolved }} />
        )}
      </div>
      <div style={{ padding: 'var(--spacing-3)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-badge)', color: 'var(--color-text-body)' }}>
          {token.name}
        </div>
        <div style={{ marginTop: 2, fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)', fontFamily: 'var(--font-mono)' }}>
          {token.resolved}
          {token.value !== token.resolved && ` ← ${token.value}`}
        </div>
        {token.figma && (
          <div style={{ marginTop: 4, fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)' }}>
            피그마 {token.figma.name}{token.figma.alias ? ` → ${token.figma.alias}` : ''}
          </div>
        )}
        {token.comment && (
          <div style={{ marginTop: 6, fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)', lineHeight: 1.6 }}>
            {token.comment}
          </div>
        )}
      </div>
    </div>
  )
}

function LengthRow({ token }: { token: Token }) {
  const px = parseFloat(token.resolved)
  const isRadius = token.name.startsWith('--radius-')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', padding: 'var(--spacing-2) 0' }}>
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-meta)', color: 'var(--color-text-body)' }}>{token.name}</div>
        <div style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)' }}>{token.resolved}</div>
      </div>
      {isRadius ? (
        <div style={{
          width: 72, height: 44, background: 'var(--color-primary-100)',
          border: '1px solid var(--color-primary-300)',
          borderRadius: Math.min(px, 32),
        }} />
      ) : (
        <div style={{ height: 16, width: Math.min(px, 320), background: 'var(--color-primary-300)', borderRadius: 2 }} />
      )}
      {token.comment && (
        <div style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)', lineHeight: 1.6 }}>{token.comment}</div>
      )}
    </div>
  )
}

export default function TokensPage() {
  return (
    <Page
      title="토큰"
      lead={
        <>
          <Code>src/styles/tokens.css</Code>가 값의 유일한 원본이다. 이 페이지는 그 파일을 파싱해 그린다 —
          주석까지 그대로 가져오므로, 토큰을 왜 그 값으로 뒀는지는 CSS에 적어야 여기 보인다.
        </>
      }
    >
      {manifest.tokenGroups.map(group => {
        const colors = group.tokens.filter(isColor)
        const lengths = group.tokens.filter(t => !isColor(t) && isLength(t))
        const shadows = group.tokens.filter(isShadow)
        const rest = group.tokens.filter(t => !isColor(t) && !isLength(t) && !isShadow(t))

        return (
          <Section key={group.title} title={group.title}>
            {colors.length > 0 && (
              <div style={{
                display: 'grid', gap: 'var(--spacing-3)',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              }}>
                {colors.map(t => <Swatch key={t.name} token={t} />)}
              </div>
            )}

            {lengths.length > 0 && (
              <div style={{ marginTop: colors.length ? 'var(--spacing-6)' : 0 }}>
                {lengths.map(t => <LengthRow key={t.name} token={t} />)}
              </div>
            )}

            {shadows.length > 0 && (
              <div style={{
                marginTop: 'var(--spacing-6)', display: 'grid', gap: 'var(--spacing-6)',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              }}>
                {shadows.map(t => (
                  <div key={t.name}>
                    <div style={{
                      height: 72, borderRadius: 'var(--radius-control)',
                      background: 'var(--color-surface-card)', boxShadow: t.resolved,
                    }} />
                    <div style={{ marginTop: 'var(--spacing-3)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-badge)', color: 'var(--color-text-body)' }}>
                      {t.name}
                    </div>
                    {t.comment && (
                      <div style={{ fontSize: 'var(--text-badge)', color: 'var(--color-text-caption)', lineHeight: 1.6, marginTop: 2 }}>{t.comment}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {rest.length > 0 && (
              <div style={{ marginTop: colors.length || lengths.length || shadows.length ? 'var(--spacing-6)' : 0 }}>
                <Table
                  head={['토큰', '값', '피그마', '설명']}
                  rows={rest.map(t => [
                    <Code key={t.name}>{t.name}</Code>,
                    <span key="v" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-badge)' }}>{t.resolved}</span>,
                    t.figma?.name ?? '—',
                    t.comment || '—',
                  ])}
                />
              </div>
            )}
          </Section>
        )
      })}
    </Page>
  )
}
