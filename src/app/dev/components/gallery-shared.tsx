/**
 * 갤러리 전용 공유 헬퍼 — /dev/components 에서만 사용 (감사 제외 대상)
 */
'use client'

import React from 'react'

export const captionStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--color-text-caption)',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  fontWeight: 500,
}

export function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-5" style={{ scrollMarginTop: 16 }}>
      <h2 className="text-lg font-semibold border-b pb-2"
        style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function Label({ children }: { children: React.ReactNode }) {
  return <p style={captionStyle}>{children}</p>
}

/**
 * 컴포넌트 항목 래퍼 — 앵커 id + "쓰이는 화면" 캡션 + 원본 파일 표기
 */
export function Entry({
  id,
  name,
  screens,
  source,
  inline = false,
  children,
}: {
  id: string
  name: string
  /** 실사용 화면 목록 (grep 확인 기준) */
  screens: string
  /** 원본 파일 경로 */
  source: string
  /** true면 "인라인 패턴 — 원본: ..." 으로 표기 */
  inline?: boolean
  children: React.ReactNode
}) {
  return (
    <div id={id} className="flex flex-col gap-3" style={{ scrollMarginTop: 16 }}>
      <div className="flex flex-col gap-[2px]">
        <p className="text-[14px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {name}
        </p>
        <p style={{ ...captionStyle, textTransform: 'none' }}>
          쓰이는 화면: {screens}
        </p>
        <p className="font-mono" style={{ ...captionStyle, textTransform: 'none', fontSize: 10 }}>
          {inline ? '인라인 패턴 — 원본: ' : ''}{source}
        </p>
      </div>
      {children}
    </div>
  )
}
