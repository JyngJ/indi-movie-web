/**
 * 갤러리 전용 — 토큰 시트 (색·타입 스케일·radius·spacing)
 * 값의 원본은 src/styles/tokens.css, 설명 문서는 docs/DESIGN.md
 */
'use client'

import React from 'react'
import { Section, Label, captionStyle } from './gallery-shared'

/* ── 색 스와치 데이터 — var() 참조라 라이트/다크 토글에 반응 ─────── */
const COLOR_GROUPS: { label: string; note?: string; swatches: { token: string; role: string; border?: boolean }[] }[] = [
  {
    label: 'surface',
    swatches: [
      { token: '--color-surface-bg',      role: '페이지 배경', border: true },
      { token: '--color-surface-card',    role: '카드 · 시트 · 시간표 셀', border: true },
      { token: '--color-surface-raised',  role: '비활성 칩 · 스크롤 hint', border: true },
      { token: '--color-border',          role: '1px 구분선 · 핸들바' },
      { token: '--color-surface-overlay', role: '표면 위 옅은 오버레이 배경', border: true },
    ],
  },
  {
    label: 'text',
    swatches: [
      { token: '--color-text-primary',     role: '대제목 · 강조' },
      { token: '--color-text-body',        role: '본문' },
      { token: '--color-text-sub',         role: '주소 · 보조' },
      { token: '--color-text-caption',     role: 'Caption — 라이트·다크 동일 고정' },
      { token: '--color-text-placeholder', role: 'placeholder · disabled' },
      { token: '--color-on-accent',        role: '솔리드 액센트 위 텍스트(테마 불변 흰색)', border: true },
    ],
  },
  {
    label: 'primary',
    swatches: [
      { token: '--color-primary-base',     role: '독립관 핀 · 활성 칩 · CTA · 오늘 강조' },
      { token: '--color-primary-hover-l',  role: 'hover/press · 토요일 dow' },
      { token: '--color-primary-subtle-l', role: '활성 칩 배경', border: true },
      { token: '--color-primary-text',     role: '활성 칩 텍스트' },
    ],
  },
  {
    label: 'semantic',
    swatches: [
      { token: '--color-warning', role: '잔여석 적음 · D-1 배지' },
      { token: '--color-success', role: '예매 완료 · 저장 확인' },
      { token: '--color-error',   role: '매진 · 에러 · 일/공휴일' },
      { token: '--color-info',    role: '정보' },
    ],
  },
  {
    label: 'gv (핀 전용, 텍스트 미사용)',
    swatches: [
      { token: '--color-gv',    role: 'GV·페스티벌 브랜드 보라 — GV 핀 · 이벤트 강조' },
    ],
  },
]

/* ── 타입 스케일 — --text-* 토큰을 실제 크기로 렌더 ──────────────── */
const TYPE_SCALE: { token: string; px: string; weight: number; font?: string; sample: string; role: string; caps?: boolean }[] = [
  { token: '--text-h1',       px: '24px', weight: 700, font: 'var(--font-display)', sample: '기억의 빛, 작은 극장에서', role: '영화 대제목 h1' },
  { token: '--text-h2',       px: '22px', weight: 700, font: 'var(--font-display)', sample: '더숲 아트시네마',          role: '극장명 상세 h2' },
  { token: '--text-h3',       px: '20px', weight: 700, font: 'var(--font-display)', sample: '아트나인',                 role: '바텀시트 극장명 h3' },
  { token: '--text-title',    px: '17px', weight: 700, sample: '카드 제목 Title',            role: 'title' },
  { token: '--text-subtitle', px: '15px', weight: 600, sample: '소제목 · 카드 헤더 Subtitle', role: 'subtitle' },
  { token: '--text-body',     px: '14px', weight: 500, sample: '본문 Body — 늦은 밤 노원의 골목', role: 'body' },
  { token: '--text-meta',     px: '13px', weight: 400, sample: '메타 · 주소 Meta',           role: 'meta' },
  { token: '--text-caption',  px: '11px', weight: 500, sample: 'CAPTION 라벨',              role: 'caption caps', caps: true },
  { token: '--text-badge',    px: '9px',  weight: 700, sample: 'D-1 BADGE',                 role: 'badge caps', caps: true },
  { token: '--text-time',     px: '17px', weight: 700, sample: '19:30',                     role: '시작 시간 (tnum)' },
  { token: '--text-seat',     px: '12px', weight: 600, sample: '62/172석',                  role: '좌석수 (tnum)' },
  { token: '--text-dow',      px: '10px', weight: 500, sample: '월 화 수 목 금 토 일',       role: '요일' },
  { token: '--text-date',     px: '16px', weight: 700, sample: '29 30 1 2',                 role: '날짜 (tnum)' },
  { token: '--text-bask-title', px: '18px', weight: 400, font: 'var(--font-serif-en)', sample: 'The Light of Memory',   role: '영문 원제' },
  { token: '--text-bask-meta',  px: '13px', weight: 400, font: 'var(--font-serif-en)', sample: 'dir. Bong Joon-ho, 2003', role: '감독명 / 연도' },
  { token: '--text-bask-xs',    px: '10px', weight: 400, font: 'var(--font-serif-en)', sample: 'A Bong Joon-ho Film',   role: '썸네일 원제 (xs)' },
]

/* ── Radius 역할 토큰 ────────────────────────────────────────────── */
const RADII: { token: string; px: string; role: string }[] = [
  { token: '--radius-badge',   px: '4px',    role: '배지 · 라벨 · 인디케이터' },
  { token: '--radius-poster',  px: '8px',    role: '포스터 · 썸네일 · 날짜 셀' },
  { token: '--radius-button',  px: '8px',    role: '버튼' },
  { token: '--radius-control', px: '12px',   role: '입력 · 칩 · 카드 · 시간표 셀' },
  { token: '--radius-popover', px: '16px',   role: '드롭다운 · 팝오버 · 모달' },
  { token: '--radius-sheet',   px: '20px',   role: '바텀시트 상단' },
  { token: '--radius-pill',    px: '9999px', role: '검색창 · 칩 · FAB' },
]

/* ── Spacing / Gutter ────────────────────────────────────────────── */
const SPACINGS = ['--spacing-1', '--spacing-2', '--spacing-3', '--spacing-4', '--spacing-5', '--spacing-6', '--spacing-8', '--spacing-10']
const GUTTERS: { token: string; px: string; role: string }[] = [
  { token: '--gutter',    px: '16px', role: '최상위 좌우 여백' },
  { token: '--gutter-md', px: '12px', role: '1단계 중첩' },
  { token: '--gutter-sm', px: '8px',  role: '2단계 중첩' },
]

export function FoundationsSections() {
  return (
    <>
      <Section id="tokens-color" title="Foundations — 색상 (테마 토글에 반응)">
        <p style={{ ...captionStyle, textTransform: 'none' }}>
          값의 원본: src/styles/tokens.css · 역할 설명: docs/DESIGN.md
        </p>
        {COLOR_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2" style={captionStyle}>{group.label}</p>
            <div className="flex flex-col gap-[6px]">
              {group.swatches.map((s) => (
                <div key={s.token}
                  className="flex items-center gap-3 py-2 px-[10px] rounded-[6px] border"
                  style={{ backgroundColor: 'var(--color-surface-card)', borderColor: 'var(--color-border)' }}>
                  <div className="w-9 h-9 rounded-[5px] flex-shrink-0"
                    style={{
                      backgroundColor: `var(${s.token})`,
                      border: s.border ? '1px solid var(--color-border)' : '1px solid transparent',
                    }} />
                  <span className="font-mono text-[11px] flex-1 min-w-0" style={{ color: 'var(--color-text-primary)' }}>
                    {s.token}
                  </span>
                  <span className="text-right max-w-[190px]" style={captionStyle}>{s.role}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section id="tokens-type" title="Foundations — 타입 스케일 (--text-*)">
        <div className="flex flex-col gap-[14px]">
          {TYPE_SCALE.map((t) => (
            <div key={t.token} className="flex flex-col gap-[3px]">
              <p style={captionStyle}>
                <span className="font-mono normal-case">{t.token}</span> · {t.px} / {t.weight} — {t.role}
              </p>
              <p style={{
                fontFamily: t.font ?? 'var(--font-sans)',
                fontSize: `var(${t.token})`,
                fontWeight: t.weight,
                color: 'var(--color-text-primary)',
                textTransform: t.caps ? 'uppercase' : 'none',
                letterSpacing: t.caps ? '0.4px' : 'normal',
                fontFeatureSettings: t.role.includes('tnum') ? '"tnum"' : undefined,
                lineHeight: 1.4,
              }}>
                {t.sample}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="tokens-radius" title="Foundations — Radius 역할 토큰">
        <div className="flex gap-4 flex-wrap items-end">
          {RADII.map((r) => (
            <div key={r.token} className="flex flex-col items-center gap-2" style={{ width: 96 }}>
              <div style={{
                width: 72, height: 56,
                borderRadius: `var(${r.token})`,
                background: 'var(--color-primary-subtle-l)',
                border: '1.5px solid var(--color-primary-base)',
              }} />
              <div className="text-center">
                <p className="font-mono" style={{ ...captionStyle, textTransform: 'none', fontSize: 10 }}>
                  {r.token.replace('--radius-', '')} · {r.px}
                </p>
                <p style={{ ...captionStyle, textTransform: 'none', fontSize: 10 }}>{r.role}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="tokens-spacing" title="Foundations — Spacing · Gutter (4배수 전용)">
        <Label>spacing</Label>
        <div className="flex flex-col gap-[6px]">
          {SPACINGS.map((s) => (
            <div key={s} className="flex items-center gap-3">
              <span className="font-mono w-[110px]" style={{ ...captionStyle, textTransform: 'none', fontSize: 10 }}>{s}</span>
              <div style={{ width: `var(${s})`, height: 14, background: 'var(--color-primary-base)', borderRadius: 2 }} />
            </div>
          ))}
        </div>
        <Label>gutter (좌우 여백 · 최상위 → 중첩 순)</Label>
        <div className="flex flex-col gap-[6px]">
          {GUTTERS.map((g) => (
            <div key={g.token} className="flex items-center gap-3">
              <span className="font-mono w-[110px]" style={{ ...captionStyle, textTransform: 'none', fontSize: 10 }}>{g.token}</span>
              <div style={{ width: `var(${g.token})`, height: 14, background: 'var(--color-warning)', borderRadius: 2 }} />
              <span style={captionStyle}>{g.px} — {g.role}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}
