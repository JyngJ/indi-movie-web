/**
 * 컴포넌트 쇼케이스 페이지 (개발용)
 * http://localhost:3000/dev/components
 */

'use client'

import { useState } from 'react'
import {
  Button,
  Card,
  Chip,
  Badge,
  Skeleton,
  MovieCardSkeleton,
  TheaterCardSkeleton,
  Input,
} from '@/components/primitives'
import { useThemeStore } from '@/store/themeStore'

export default function ComponentsPage() {
  const { theme, setTheme } = useThemeStore()
  const [selectedChip, setSelectedChip] = useState('전체')
  const [inputValue, setInputValue] = useState('')

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: 'var(--color-surface-bg)' }}
    >
      {/* 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)' }}
          >
            컴포넌트 쇼케이스
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            디자인 토큰 기반 Primitive 컴포넌트
          </p>
        </div>
        {/* 테마 토글 */}
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className="px-3 py-1 rounded text-xs border"
              style={{
                backgroundColor: theme === t ? 'var(--color-primary-base)' : 'var(--color-surface-card)',
                color: theme === t ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-10 max-w-lg">

        {/* ─── Button ─── */}
        <Section title="Button">
          <Row label="Variant">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </Row>
          <Row label="Size">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Row>
          <Row label="State">
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button fullWidth>Full Width</Button>
          </Row>
        </Section>

        {/* ─── Card ─── */}
        <Section title="Card">
          <Card padding="md">
            <p style={{ color: 'var(--color-text-primary)' }}>기본 카드 (bordered, shadow sm)</p>
          </Card>
          <Card padding="md" shadow="lg" bordered={false}>
            <p style={{ color: 'var(--color-text-primary)' }}>Shadow lg, 테두리 없음</p>
          </Card>
          <Card padding="md" clickable>
            <p style={{ color: 'var(--color-text-primary)' }}>Clickable 카드 (눌러보세요)</p>
          </Card>
        </Section>

        {/* ─── Chip ─── */}
        <Section title="Chip">
          <Row label="필터">
            {['전체', '드라마', '다큐', '애니', '공포'].map((label) => (
              <Chip
                key={label}
                selected={selectedChip === label}
                onClick={() => setSelectedChip(label)}
              >
                {label}
              </Chip>
            ))}
          </Row>
        </Section>

        {/* ─── Badge ─── */}
        <Section title="Badge">
          <Row label="Variant">
            <Badge variant="default">기본</Badge>
            <Badge variant="success">개봉 중</Badge>
            <Badge variant="warning">D-1</Badge>
            <Badge variant="error">매진</Badge>
            <Badge variant="info">상영 예정</Badge>
          </Row>
        </Section>

        {/* ─── Input ─── */}
        <Section title="Input">
          <Input
            label="극장 검색"
            placeholder="극장명을 입력하세요"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            hint="서울 내 독립·예술 극장을 검색합니다"
          />
          <Input
            label="이메일"
            placeholder="example@email.com"
            type="email"
            error="올바른 이메일 형식이 아닙니다"
          />
          <Input
            placeholder="아이콘 없는 입력"
          />
        </Section>

        {/* ─── Skeleton ─── */}
        <Section title="Skeleton">
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>영화 카드</p>
            <div className="grid grid-cols-3 gap-3">
              <MovieCardSkeleton />
              <MovieCardSkeleton />
              <MovieCardSkeleton />
            </div>
          </div>
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>극장 카드</p>
            <Card padding="none" shadow="none">
              <TheaterCardSkeleton />
              <div className="border-t border-[var(--color-border)]">
                <TheaterCardSkeleton />
              </div>
            </Card>
          </div>
        </Section>

        {/* ─── 색상 토큰 시각화 ─── */}
        <Section title="색상 토큰">
          <div className="grid grid-cols-2 gap-2">
            {[
              ['primary-base', 'var(--color-primary-base)'],
              ['surface-bg', 'var(--color-surface-bg)'],
              ['surface-card', 'var(--color-surface-card)'],
              ['text-primary', 'var(--color-text-primary)'],
              ['text-secondary', 'var(--color-text-secondary)'],
              ['border', 'var(--color-border)'],
              ['accent', 'var(--color-accent)'],
              ['success', 'var(--color-success)'],
              ['warning', 'var(--color-warning)'],
              ['error', 'var(--color-error)'],
            ].map(([name, value]) => (
              <div key={name} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-black/10 flex-shrink-0"
                  style={{ backgroundColor: value }}
                />
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2
        className="text-lg font-semibold border-b pb-2"
        style={{
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-border)',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-2 items-center">{children}</div>
    </div>
  )
}
