'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { SearchBar } from '@/components/primitives'
import { useCatalog } from '@/lib/catalog/client'

export default function SearchPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const { data: catalog } = useCatalog()
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
  const theaters = normalizedQuery
    ? (catalog?.theaters ?? []).filter((theater) =>
        [theater.name, theater.address, theater.city].some((value) =>
          value.toLocaleLowerCase('ko-KR').includes(normalizedQuery),
        ),
      ).slice(0, 12)
    : []
  const movies = normalizedQuery
    ? (catalog?.movies ?? []).filter((movie) =>
        [movie.title, movie.originalTitle, movie.director].some((value) =>
          value?.toLocaleLowerCase('ko-KR').includes(normalizedQuery),
        ),
      ).slice(0, 12)
    : []

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
          autoFocus
        />
      </div>

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
        ) : theaters.length === 0 && movies.length === 0 ? (
          <p style={{
            textAlign: 'center',
            marginTop: 60,
            fontSize: 14,
            color: 'var(--color-text-caption)',
          }}>
            &ldquo;{query}&rdquo;에 맞는 결과가 없습니다.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {theaters.length > 0 && (
              <ResultSection title="극장">
                {theaters.map((theater) => (
                  <ResultItem
                    key={theater.id}
                    title={theater.name}
                    subtitle={theater.address}
                  />
                ))}
              </ResultSection>
            )}
            {movies.length > 0 && (
              <ResultSection title="영화">
                {movies.map((movie) => (
                  <ResultItem
                    key={movie.id}
                    title={movie.title}
                    subtitle={[movie.director, movie.year].filter(Boolean).join(' · ')}
                  />
                ))}
              </ResultSection>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ResultSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={{
        margin: '0 0 8px',
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--color-text-caption)',
      }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </section>
  )
}

function ResultItem({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{
      minHeight: 56,
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      backgroundColor: 'var(--color-surface-card)',
      padding: '10px 12px',
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</div>
      {subtitle && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-sub)' }}>{subtitle}</div>}
    </div>
  )
}
