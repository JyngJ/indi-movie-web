'use client'

import { useRouter } from 'next/navigation'

/** 직전 화면으로 — 히스토리가 있으면 뒤로, 없으면(직접 접근) 홈 */
export function BackLink() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back()
        else router.push('/')
      }}
      style={{
        fontSize: 'var(--text-meta)',
        color: 'var(--color-primary-base)',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      ← 돌아가기
    </button>
  )
}
