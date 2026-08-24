import Link from 'next/link'
import type { ReactNode } from 'react'
import { manifest } from '@/design-system'
import { DocPage, DocSection, Code } from '../_ui/shell'

/** 섹션 표지 — Foundations·Components와 같은 문법으로, 딸린 페이지를 카드로 안내한다. */

function CoverCard({ href, title, desc, visual }: {
  href: string; title: string; desc: string; visual: ReactNode
}) {
  return (
    <Link href={href} className="ds-cover-card">
      <div style={{
        height: 168, borderRadius: 'var(--radius-popover)',
        background: 'var(--color-surface-bg)', border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>{visual}</div>
      <div style={{ marginTop: 'var(--spacing-4)', fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {title}
      </div>
      <p style={{ marginTop: 6, fontSize: 'var(--text-meta)', lineHeight: 1.7, color: 'var(--color-text-sub)' }}>
        {desc}
      </p>
    </Link>
  )
}

/* 기획 → 피그마 → 코드가 한 방향으로만 흐르지 않는다는 것을 그림으로 먼저 말한다. */
function LoopVisual() {
  const step = (label: string) => (
    <div key={label} style={{
      padding: '6px 10px', borderRadius: 'var(--radius-button)',
      background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
      fontSize: 'var(--text-meta)', fontWeight: 700, color: 'var(--color-text-primary)',
      whiteSpace: 'nowrap',
    }}>{label}</div>
  )
  const arrow = (key: string) => (
    <span key={key} style={{ color: 'var(--color-text-placeholder)', fontSize: 'var(--text-meta)' }}>→</span>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', flexWrap: 'wrap', justifyContent: 'center', padding: 'var(--spacing-4)' }}>
      {step('기획')}{arrow('a')}{step('피그마')}{arrow('b')}{step('코드')}
    </div>
  )
}

function DriftVisual({ open }: { open: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 700,
        color: open === 0 ? 'var(--color-success)' : 'var(--color-text-primary)',
      }}>{open}</div>
      <div style={{ marginTop: 4, fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
        남은 차이
      </div>
    </div>
  )
}

export default function MaintenanceCoverPage() {
  const open = manifest.drift.length

  return (
    <DocPage
      href="/design-system/maintenance"
      title="Maintenance"
      lead="한 사람이 기획·디자인·개발을 모두 맡는 프로젝트이므로 세 산출물이 어긋나는 순간을 사람이 눈으로 일일이 잡아내기 어렵습니다. 그래서 AI를 도구로 써서 기획 → 피그마 → 코드의 정합성을 유지하고, 협업하듯 문서를 주고받습니다. 이 섹션은 그 방법을 다룹니다."
    >
      <DocSection id="pages" title="페이지">
        <div className="ds-cover-grid">
          <CoverCard
            href="/design-system/drift"
            title="코드 ↔ 피그마 차이"
            desc="피그마 변수와 코드 토큰을 이름으로 짝지어 값을 대조합니다. 어긋난 항목만 남겨 다음에 무엇을 고칠지 알려줍니다."
            visual={<DriftVisual open={open} />}
          />
          <CoverCard
            href="/design-system/ai"
            title="AI Collaboration"
            desc="AI 코딩 도구가 이 시스템을 그대로 따르도록 llms.txt 계열 덤프를 제공합니다. 사람이 보는 페이지와 같은 매니페스트에서 생성합니다."
            visual={<LoopVisual />}
          />
        </div>
      </DocSection>

      <DocSection
        id="flow"
        title="유지 방법"
        lead="세 산출물이 서로를 검사하도록 만들어, 어긋남을 사람 기억이 아니라 명령어로 찾습니다."
      >
        <ul style={{
          margin: 0, paddingLeft: '1.1em', listStyle: 'disc',
          fontSize: 'var(--text-title)', lineHeight: 1.7, color: 'var(--color-text-sub)',
          display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)',
        }}>
          <li>
            <b style={{ color: 'var(--color-text-primary)' }}>기획 → 피그마</b> · 화면과 정보 구조를 피그마에서 먼저 세우고,
            AI에게 스크립트를 짜게 해 컴포넌트·스타일·변수를 일괄로 만들거나 고칩니다.
          </li>
          <li>
            <b style={{ color: 'var(--color-text-primary)' }}>피그마 → 코드</b> · 피그마 상태를 덤프해 <Code>npm run ds:build</Code>로
            매니페스트를 만들고, 코드 토큰과 이름으로 짝지어 대조합니다. 이 문서의 값이 그 결과물입니다.
          </li>
          <li>
            <b style={{ color: 'var(--color-text-primary)' }}>코드 → AI</b> · 같은 매니페스트에서 llms.txt 계열 덤프를 만들어,
            AI 도구가 임의의 값 대신 정의된 토큰을 쓰게 합니다.
          </li>
          <li>
            <b style={{ color: 'var(--color-text-primary)' }}>회귀 방지</b> · 하드코딩된 값은 <Code>npm run audit:ui:check</Code>가
            기준선과 비교해 늘어나면 실패시킵니다. CI가 PR마다 실행합니다.
          </li>
        </ul>
      </DocSection>
    </DocPage>
  )
}
