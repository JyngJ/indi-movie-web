import type { ReactNode } from 'react'
import { VOICE, SECTIONS, type WritingRule } from '@/design-system/writing'
import { DocPage, DocSection, SubHeading, Stage, Code, DefTable } from '../../_ui/shell'

/* 라이팅 규범 페이지. 문장은 src/design-system/writing.ts 한 곳에만 적고 여기서는 그린다.
   다른 Foundations 페이지처럼 값을 매니페스트에서 받을 수는 없다 — 문장은 생성되지 않는다. */

const Glyph = ({ children }: { children: ReactNode }) => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
    {children}
  </svg>
)

/** 좋은 예 / 나쁜 예 한 쌍. 색을 못 읽는 자리를 아이콘이 대신한다. */
function ExampleLine({ kind, text }: { kind: 'good' | 'bad'; text: string }) {
  const color = kind === 'good' ? 'var(--color-success)' : 'var(--color-error)'
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'flex-start', color: 'var(--color-text-primary)' }}>
      <span style={{ color, marginTop: 3 }}>
        {kind === 'good'
          ? <Glyph><path d="M4 10.4 8.2 14.5 16 5.5" /></Glyph>
          : <Glyph><path d="M5 5l10 10M15 5L5 15" /></Glyph>}
      </span>
      <span style={{
        fontSize: 'var(--text-body)', lineHeight: 1.6,
        textDecoration: kind === 'bad' ? 'line-through' : undefined,
        textDecorationColor: kind === 'bad' ? 'var(--color-error)' : undefined,
        color: kind === 'bad' ? 'var(--color-text-sub)' : 'var(--color-text-primary)',
      }}>{text}</span>
    </div>
  )
}

function RuleBlock({ rule }: { rule: WritingRule }) {
  return (
    <div id={rule.id} className="ds-anchor" style={{
      padding: 'var(--spacing-6) 0', borderTop: '1px solid var(--color-border)',
      display: 'grid', gap: 'var(--spacing-5)',
      gridTemplateColumns: 'minmax(0, 1fr)',
    }}>
      <div>
        <SubHeading>{rule.title}</SubHeading>
        <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 1.8, color: 'var(--color-text-primary)' }}>
          {rule.rule}
        </p>
        {rule.why && (
          <p style={{
            marginTop: 'var(--spacing-3)', fontSize: 'var(--text-meta)', lineHeight: 1.7,
            color: 'var(--color-text-caption)',
          }}>
            <b style={{ color: 'var(--color-text-sub)' }}>왜 — </b>{rule.why}
          </p>
        )}
      </div>
      {rule.table && <DefTable rows={rule.table.map(([k, v]) => [<b key={k} style={{ color: 'var(--color-text-primary)' }}>{k}</b>, v])} />}
      {rule.examples && rule.examples.length > 0 && (
        <div style={{
          background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-popover)', padding: 'var(--spacing-4) var(--spacing-5)',
          display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)',
        }}>
          {rule.examples.map((ex, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <ExampleLine kind="good" text={ex.good} />
              {ex.bad && <ExampleLine kind="bad" text={ex.bad} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function WritingPage() {
  return (
    <DocPage
      href="/design-system/foundations/writing"
      title="Writing"
      lead="화면에 적히는 한국어 문장의 약속입니다. 제품 화면은 해요체 하나로 말하고, 한 줄에 한 가지만 담습니다. 이 페이지의 규칙은 2026-08 기준 코드에 실제로 있던 문구를 전수 조사해서 정했습니다 — 이미 일관된 것은 그대로 굳히고, 갈라져 있던 것은 한쪽으로 모았습니다."
    >
      <DocSection
        id="principles"
        title="원칙"
        lead="규칙보다 먼저 오는 넷입니다. 규칙에 없는 상황이면 이 넷으로 판단합니다."
      >
        <div style={{ display: 'grid', gap: 'var(--spacing-6)', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', maxWidth: 880 }}>
          {VOICE.map(v => (
            <div key={v.title} style={{
              background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-popover)', padding: 'var(--spacing-5)',
              display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, lineHeight: 1.4, color: 'var(--color-text-primary)' }}>{v.title}</div>
              <div style={{ fontSize: 'var(--text-body)', lineHeight: 1.5, color: 'var(--color-text-sub)' }}>“{v.sample}”</div>
              <p style={{ margin: 0, fontSize: 'var(--text-meta)', lineHeight: 1.7, color: 'var(--color-text-sub)' }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection
        id="tone-map"
        title="자리별 톤"
        lead="같은 해요체 안에서도 자리에 따라 온도가 다릅니다. 아래 네 칸을 넘나들지 않습니다."
      >
        <Stage tone="paper" minHeight={160}>
          <div style={{
            display: 'grid', gap: 'var(--spacing-3)', width: '100%',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', maxWidth: 880,
          }}>
            {[
              ['큐레이션 부제', '문학적 · 한 줄 · 마침표 없음', '잠 안 오는 새벽, 조용히 곁에 두는 영화들'],
              ['온보딩·권한', '따뜻함 · 이유와 안심', '위치는 극장을 찾는 데만 쓰고, 저장하지 않아요'],
              ['빈 상태·에러', '담담함 · 없는 것 + 할 일', '찾는 영화가 없어요'],
              ['버튼·칩·토스트', '건조함 · 동사 · 사실', '예매하러 가기'],
            ].map(([where, temp, sample]) => (
              <div key={where} style={{
                background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-control)', padding: 'var(--spacing-4)',
              }}>
                <div style={{ fontSize: 'var(--text-caption)', fontWeight: 700, letterSpacing: '0.4px', color: 'var(--color-text-caption)' }}>{where}</div>
                <div style={{ marginTop: 6, fontSize: 'var(--text-meta)', color: 'var(--color-text-sub)' }}>{temp}</div>
                <div style={{ marginTop: 'var(--spacing-3)', fontSize: 'var(--text-body)', fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{sample}</div>
              </div>
            ))}
          </div>
        </Stage>
      </DocSection>

      {SECTIONS.map(sec => (
        <DocSection key={sec.id} id={sec.id} title={sec.title} lead={sec.lead}>
          {sec.rules.map(r => <RuleBlock key={r.id} rule={r} />)}
        </DocSection>
      ))}

      <DocSection
        id="source"
        title="소스"
        lead="문장의 원본은 한 파일입니다. 규칙을 고치면 이 페이지와 AI 덤프가 같이 바뀝니다."
      >
        <ul style={{
          margin: 0, paddingLeft: '1.1em', listStyle: 'disc',
          fontSize: 'var(--text-body)', lineHeight: 1.8, color: 'var(--color-text-sub)',
        }}>
          <li><Code>src/design-system/writing.ts</Code> — 원칙 · 규칙 · 예문</li>
          <li><Code>/design-system/llms-writing.txt</Code> — AI 코딩 도구용 한 줄 규칙</li>
          <li><Code>AGENTS.md</Code> “UI Writing” — 세션이 따르는 요약</li>
        </ul>
      </DocSection>
    </DocPage>
  )
}
