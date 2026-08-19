import { manifest, type Token } from '@/design-system'
import { DocPage, DocSection, SubHeading, Code, Stage } from '../../_ui/shell'

/** 피그마 원시 색상 컬렉션을 hue 그룹으로 묶는다 — neutral/900 → { group: neutral, tone: 900 } */
function ramps() {
  const col = manifest.figmaCollections.find(c => c.name.includes('색상'))
  const groups = new Map<string, { tone: string; hex: string }[]>()
  for (const v of col?.vars ?? []) {
    if (typeof v.value !== 'string' || !v.value.startsWith('#')) continue
    const [group, tone] = v.name.includes('/') ? v.name.split('/') : [v.name, '']
    const list = groups.get(group) ?? []
    list.push({ tone, hex: v.value })
    groups.set(group, list)
  }
  for (const list of groups.values()) list.sort((a, b) => Number(a.tone) - Number(b.tone))
  return [...groups.entries()]
}

const RAMP_NOTE: Record<string, string> = {
  neutral: '웜그레이 램프입니다. 채도가 양끝에서 올라가는 곡선(H 27~40)이라 배경은 미색 종이처럼, 글자는 잉크처럼 보입니다.',
  primary: '인디고(H227)입니다. 버튼·활성 상태·강조에 사용하며, 500 이하는 아이콘과 차트 전용으로 글자에는 사용하지 않습니다.',
  warning: '오커 계열입니다. 잔여석이 적은 상태를 알립니다.',
  success: '상영 중 상태에 사용합니다. 700이 기준값입니다.',
  error: '매진 상태에 사용합니다. 900을 텍스트와 칩 배경에 함께 사용해 대비를 확보합니다.',
  gv: 'GV(관객과의 대화) 전용입니다. 900 하나로 핀·배지·텍스트를 모두 표현합니다.',
}

function Ramp({ group, steps }: { group: string; steps: { tone: string; hex: string }[] }) {
  return (
    <div style={{ marginBottom: 'var(--spacing-8)' }}>
      <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{group}</div>
      {RAMP_NOTE[group] && (
        <p style={{ marginTop: 4, fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)', lineHeight: 1.7, maxWidth: '60ch' }}>
          {RAMP_NOTE[group]}
        </p>
      )}
      <div style={{
        display: 'flex', marginTop: 'var(--spacing-3)', borderRadius: 'var(--radius-button)',
        overflow: 'hidden', border: '1px solid var(--color-border)',
      }}>
        {steps.map(s => (
          <div key={s.tone} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ height: 56, background: s.hex }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', marginTop: 6 }}>
        {steps.map(s => (
          <div key={s.tone} style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-badge)', fontWeight: 700, color: 'var(--color-text-body)' }}>{s.tone || '—'}</div>
            <div style={{ fontSize: 9, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-mono)' }}>{s.hex}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SemanticTable({ title, note, tokens }: { title: string; note?: string; tokens: Token[] }) {
  if (!tokens.length) return null
  return (
    <div style={{ marginBottom: 'var(--spacing-8)' }}>
      <SubHeading>{title}</SubHeading>
      {note && (
        <p style={{ marginTop: -8, marginBottom: 'var(--spacing-4)', fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)', lineHeight: 1.7 }}>
          {note}
        </p>
      )}
      <div>
        {tokens.map(t => (
          <div key={t.name} style={{
            display: 'grid', gridTemplateColumns: '28px minmax(140px, 220px) minmax(0, 1fr)',
            gap: 'var(--spacing-3)', alignItems: 'start',
            padding: 'var(--spacing-3) 0', borderTop: '1px solid var(--color-border)',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 'var(--radius-badge)', background: t.resolved,
              border: '1px solid var(--color-border)',
            }} />
            <div>
              <Code>{t.name}</Code>
              <div style={{ marginTop: 4, fontSize: 'var(--text-badge)', color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-mono)' }}>
                {t.resolved}
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)', lineHeight: 1.7 }}>
              {t.comment || '—'}
              {t.figma && (
                <div style={{ marginTop: 2, color: 'var(--color-text-placeholder)', fontSize: 'var(--text-badge)' }}>
                  피그마 {t.figma.name}{t.figma.alias ? ` → ${t.figma.alias}` : ''}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ColorPage() {
  const all = manifest.tokenGroups.flatMap(g => g.tokens)
  const pick = (test: (n: string) => boolean) =>
    all.filter(t => t.name.startsWith('--color-') && test(t.name) && /^#|^rgba/.test(t.resolved))

  const surface = pick(n => n.includes('surface') || n.includes('border') || n.includes('scrim'))
  const text = pick(n => n.includes('-text-') || n === '--color-on-accent')
  const status = pick(n => /warning|success|error|info|gv/.test(n))
  const brand = pick(n => /cgv|mega|lotte/.test(n))

  return (
    <DocPage
      href="/design-system/foundations/color"
      title="Color"
      lead="원활한 협업을 위해 HEX 코드 대신 토큰 이름을 사용합니다. 값은 tokens.css에서 관리하며 피그마 변수와 이름으로 짝지어 대조합니다. 라이트 단일 테마로 운영합니다."
    >
      <DocSection id="naming" title="이름 규칙" lead="원시 토큰은 색 계열(hue)과 톤 단계(tone)를 조합해 정의합니다. UI 맥락이나 의미는 담지 않습니다.">
        <Stage minHeight={200}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            {[['neutral', '계열'], ['-', ''], ['900', '단계']].map(([word, cap], i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  background: word === '-' ? 'transparent' : 'var(--color-surface-card)',
                  border: word === '-' ? 'none' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-control)', padding: word === '-' ? 0 : '12px 20px',
                }}>{word}</div>
                {cap && (
                  <div style={{ marginTop: 8, fontSize: 'var(--text-meta)', color: 'var(--color-primary-base)', fontWeight: 600 }}>{cap}</div>
                )}
              </div>
            ))}
          </div>
        </Stage>
        <p style={{ marginTop: 'var(--spacing-4)', fontSize: 'var(--text-body)', lineHeight: 1.8, color: 'var(--color-text-sub)' }}>
          코드에서는 <Code>--color-neutral-900</Code>, 피그마에서는 <Code>neutral/900</Code>으로 같은 값을 가리킵니다.
          디자인 리뷰에서 이름만으로 소통할 수 있으며, 컴포넌트에는 원시 토큰 대신 아래 시맨틱 토큰을 사용합니다.
        </p>
      </DocSection>

      <DocSection
        id="primitive"
        title="Primitive"
        lead="피그마 컬렉션 “영화볼지도 색상 - 2.0”에서 가져온 램프입니다. UI 의미 없이 값만 정의합니다."
      >
        {ramps().filter(([g]) => g !== 'white' && g !== 'shadow').map(([group, steps]) => (
          <Ramp key={group} group={group} steps={steps} />
        ))}
      </DocSection>

      <DocSection
        id="semantic"
        title="Semantic"
        lead="역할에 이름을 붙인 층입니다. 컴포넌트는 이 토큰을 사용하며, 값이 바뀌어도 참조는 그대로 유지됩니다."
      >
        <SemanticTable title="Surface" note="면과 경계를 정의합니다. 배경(미색)과 카드(흰색)의 대비가 층을 만듭니다." tokens={surface} />
        <SemanticTable title="Text" note="글자 위계는 크기보다 색으로 먼저 만듭니다." tokens={text} />
        <SemanticTable title="Status" note="상영 상태·잔여석·GV를 나타냅니다. 종이 톤 위에서 안정적으로 읽히도록 채도를 낮춰 정의했습니다." tokens={status} />
        <SemanticTable title="Brand" note="예매처 브랜드 색입니다. 외부 규정을 따르므로 그대로 사용합니다." tokens={brand} />
      </DocSection>
    </DocPage>
  )
}
