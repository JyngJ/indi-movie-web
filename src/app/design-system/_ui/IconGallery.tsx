'use client'

import { useMemo, useState } from 'react'
import { Icon, ICON_NAMES, type IconName } from '@/components/primitives'

/**
 * 아이콘은 목록이 곧 문서다.
 *
 * 이름으로 부르는 레지스트리라서, "무엇이 있는지"를 볼 자리가 없으면 결국 각자
 * 다시 svg를 그린다. 그 재발을 막으려고 전체를 한 화면에 깔고 이름으로 걸러낸다.
 * 칸을 누르면 호출부에 그대로 붙여 넣을 코드가 클립보드로 간다.
 */

export function IconGallery() {
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState<IconName | null>(null)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? ICON_NAMES.filter((n) => n.includes(q)) : ICON_NAMES
  }, [query])

  async function copy(name: IconName) {
    const snippet = `<Icon name="${name}" />`
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(name)
      setTimeout(() => setCopied((cur) => (cur === name ? null : cur)), 1200)
    } catch {
      /* 클립보드를 막아둔 브라우저에서는 조용히 지나간다 — 목록 자체가 목적이다 */
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-6)' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름으로 찾기 — chevron, map, heart…"
          style={{
            flex: 1,
            height: 40,
            padding: '0 var(--spacing-4)',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-card)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-body)',
          }}
        />
        <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', whiteSpace: 'nowrap' }}>
          {shown.length} / {ICON_NAMES.length}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 'var(--spacing-2)' }}>
        {shown.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => copy(name)}
            title={`<Icon name="${name}" />`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-2)',
              padding: 'var(--spacing-4) var(--spacing-2)',
              minHeight: 84,
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-border)',
              background: copied === name ? 'var(--color-primary-100)' : 'var(--color-surface-card)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              transition: 'background 150ms',
            }}
          >
            <Icon name={name} size="xl" />
            <span style={{
              fontSize: 'var(--text-badge)',
              color: copied === name ? 'var(--color-primary-900)' : 'var(--color-text-caption)',
              textAlign: 'center',
              wordBreak: 'break-all',
              lineHeight: 1.3,
            }}>
              {copied === name ? '복사됨' : name}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p style={{ marginTop: 'var(--spacing-6)', fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)' }}>
          그 이름의 아이콘은 없습니다. 필요하면 <code>primitives/Icon.tsx</code>의 레지스트리에 추가하세요 — 호출부에서 svg를 그리지 않습니다.
        </p>
      )}
    </div>
  )
}
