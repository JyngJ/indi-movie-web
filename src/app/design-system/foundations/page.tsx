import Link from 'next/link'
import type { ReactNode } from 'react'
import { manifest } from '@/design-system'
import { DocPage, DocSection } from '../_ui/shell'

/** 섹션 표지 — 무엇을 다루는 묶음인지 먼저 말하고, 딸린 페이지를 카드로 안내한다. */

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

export default function FoundationsCoverPage() {
  const all = manifest.tokenGroups.flatMap(g => g.tokens)
  const ramp = ['--color-primary-100', '--color-primary-300', '--color-primary-500', '--color-primary-700', '--color-primary-900']
    .map(n => all.find(t => t.name === n)?.resolved ?? '#000')

  return (
    <DocPage
      href="/design-system/foundations"
      title="Foundations"
      lead="컴포넌트보다 아래에 있는 층. 색·글자·간격·반경·그림자처럼 화면 어디서나 같은 값을 써야 하는 것들이다. 값은 tokens.css 하나에만 있고, 피그마 변수와 이름으로 짝지어 대조한다."
      toc={[{ id: 'pages', label: '페이지' }, { id: 'rules', label: '공통 규칙' }]}
    >
      <DocSection id="pages" title="페이지">
        <div className="ds-cover-grid">
          <CoverCard
            href="/design-system/foundations/color"
            title="Color"
            desc="원시 램프와 역할 토큰. 종이 같은 미색 배경 위에서 형광 없이 위계를 만든다."
            visual={
              <div style={{ display: 'flex', gap: 8 }}>
                {ramp.map((c, i) => (
                  <div key={i} style={{ width: 36, height: 36, borderRadius: 'var(--radius-badge)', background: c }} />
                ))}
              </div>
            }
          />
          <CoverCard
            href="/design-system/foundations/typography"
            title="Typography"
            desc="KIMM과 Pretendard 두 벌, 크기는 여섯 단계. 굵기와 색으로 위계를 만든다."
            visual={
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, color: 'var(--color-text-primary)' }}>중경삼림</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-sub)', marginTop: 4 }}>왕가위 · 1994</div>
              </div>
            }
          />
          <CoverCard
            href="/design-system/foundations/spacing"
            title="Spacing"
            desc="4의 배수만 쓴다. 좌우 여백은 중첩 깊이에 따라 16 → 12 → 8로 줄인다."
            visual={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 120 }}>
                {[120, 88, 56].map(w => (
                  <div key={w} style={{ height: 12, width: w, background: 'var(--color-primary-300)', borderRadius: 2 }} />
                ))}
              </div>
            }
          />
          <CoverCard
            href="/design-system/foundations/radius"
            title="Radius"
            desc="크기가 아니라 역할로 이름 붙인다 — poster · button · control · popover · sheet · pill."
            visual={
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {[2, 8, 12, 20].map(r => (
                  <div key={r} style={{
                    width: 40, height: 40, borderRadius: r,
                    background: 'var(--color-primary-100)', border: '1px solid var(--color-primary-300)',
                  }} />
                ))}
              </div>
            }
          />
          <CoverCard
            href="/design-system/foundations/elevation"
            title="Elevation"
            desc="2겹(direct + ambient) 그림자, 색은 웜 브라운 고정. 순검정은 미색 위에서 얼룩이 된다."
            visual={
              <div style={{ display: 'flex', gap: 14 }}>
                {['var(--shadow-sm)', 'var(--shadow-md)', 'var(--shadow-lg)'].map(sh => (
                  <div key={sh} style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: 'var(--color-surface-card)', boxShadow: sh,
                  }} />
                ))}
              </div>
            }
          />
        </div>
      </DocSection>

      <DocSection id="rules" title="공통 규칙" lead="다섯 페이지에 공통으로 걸리는 약속.">
        <ul style={{
          margin: 0, paddingLeft: '1.2em', fontSize: 'var(--text-body)',
          lineHeight: 2, color: 'var(--color-text-sub)',
        }}>
          <li>값은 <b style={{ color: 'var(--color-text-primary)' }}>tokens.css</b> 하나에만 둔다. 컴포넌트가 값을 직접 적으면 감사에서 하드코딩으로 잡힌다.</li>
          <li>컴포넌트는 역할 토큰(2계층)을 쓴다. 원시 토큰은 램프 자체를 보여주는 자리에서만.</li>
          <li>피그마 변수와 이름으로 짝짓는다 — <b style={{ color: 'var(--color-text-primary)' }}>neutral/900</b> ↔ <b style={{ color: 'var(--color-text-primary)' }}>--color-neutral-900</b>.</li>
          <li>다크 모드는 2026-08-04에 폐지했다. 라이트 단일 테마다.</li>
        </ul>
      </DocSection>
    </DocPage>
  )
}
