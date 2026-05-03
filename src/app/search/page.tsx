'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SearchBar } from '@/components/primitives'

export default function SearchPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  // 페이지 마운트 시 키보드 자동 올리기
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--color-surface-bg)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2000,
      }}
    >
      {/* 검색바 헤더 */}
      <div style={{
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 12,
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface-bg)',
        flexShrink: 0,
      }}>
        <SearchBar
          ref={inputRef}
          value={query}
          placeholder="극장 또는 영화 검색"
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
          onBack={() => router.back()}
        />
      </div>

      {/* 결과 영역 (Phase 3에서 실제 검색 결과로 교체) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        {query === '' ? (
          <p style={{
            textAlign: 'center',
            marginTop: 60,
            fontSize: 14,
            color: 'var(--color-text-caption)',
          }}>
            극장명, 영화 제목, 감독 이름으로 검색하세요
          </p>
        ) : (
          <p style={{
            textAlign: 'center',
            marginTop: 60,
            fontSize: 14,
            color: 'var(--color-text-caption)',
          }}>
            &ldquo;{query}&rdquo; 검색 결과
            <br />
            <span style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              (Phase 3에서 실제 결과 연결 예정)
            </span>
          </p>
        )}
      </div>
    </div>
  )
}
