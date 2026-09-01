'use client'

import React from 'react'

/**
 * 포스터 위에 얹는 오버레이 칩.
 *
 * 예전엔 같은 칩을 CurationSectionRow·GvEventSection·InstagramRecsSection·TheaterSheet가
 * 각자 인라인으로 그렸다. 정책은 한 줄인데 구현이 넷이라 fontSize·padding·그림자가
 * 조금씩 어긋나 있었다. 규격은 AGENTS.md "포스터 오버레이 칩 정책"을 따른다 —
 * --text-meta(12) / 700 / --comp-poster-chip-pad / --radius-badge / offset 6.
 *
 * 모서리 배정 (films 탭 기준):
 *   좌상단 = 개봉 주년 · 좌하단 = 순위(스크림 별도) · 우상단 = D-N·거리 · 우하단 = 매진·일시
 */

export type PosterChipCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type PosterChipTone = 'error' | 'warning' | 'success' | 'primary' | 'gv' | 'neutral' | 'scrim'

const TONE_BG: Record<PosterChipTone, string> = {
  error:   'var(--color-error)',
  warning: 'var(--color-warning)',
  success: 'var(--color-success)',
  primary: 'var(--color-primary-base)',
  gv:      'var(--color-gv)',
  /* 상태가 아닌 중립 정보 — neutral 램프에 대응 스탑이 없어 예외로 둔다 */
  neutral: '#78716C',
  scrim:   'rgba(15,12,9,0.72)',
}

interface PosterChipProps {
  corner: PosterChipCorner
  tone: PosterChipTone
  /**
   * compact — 포스터가 아닌 소형 썸네일(GV 카드의 56px 색 띠 등)에서만.
   * 기본 규격(12/700 · 8 12)은 높이 30px이라 56px 띠의 절반을 덮는다.
   */
  size?: 'default' | 'compact'
  /** 스크린리더용 전체 문구 (예: "개봉 30주년") — 축약 라벨과 다를 때만 */
  label?: string
  children: React.ReactNode
}

export function PosterChip({ corner, tone, size = 'default', label, children }: PosterChipProps) {
  const offset = 'var(--comp-poster-chip-offset)'
  const compact = size === 'compact'
  return (
    <span
      aria-label={label}
      style={{
        position: 'absolute',
        top: corner.startsWith('top') ? offset : undefined,
        bottom: corner.startsWith('bottom') ? offset : undefined,
        left: corner.endsWith('left') ? offset : undefined,
        right: corner.endsWith('right') ? offset : undefined,
        padding: compact ? '4px 8px' : 'var(--comp-poster-chip-pad)',
        borderRadius: 'var(--radius-badge)',
        fontSize: compact ? 'var(--text-badge)' : 'var(--text-meta)',
        fontWeight: compact ? 600 : 700,
        lineHeight: 1.2,
        color: 'var(--color-on-accent)',
        backgroundColor: TONE_BG[tone],
        /* 밝은 포스터 위에서 칩 경계가 뭉개지지 않게 — 배경 그림을 통제할 수 없다 */
        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        /* 긴 카피는 자르지 않고 접는다 — 92px 포스터에서 "오늘이 마지막"·"D-n 막바지 상영"은
           한 줄에 안 들어가는데, 막바지 카피는 완화·생략이 금지라 말줄임이 곧 규칙 위반이 된다.
           lineHeight는 접힐 때만 의미가 있어 1(한 줄)이 아니라 1.2를 쓴다 */
        whiteSpace: 'normal',
        wordBreak: 'keep-all',
        maxWidth: `calc(100% - 2 * ${offset})`,
        pointerEvents: 'none',
      }}
    >
      {children}
    </span>
  )
}
