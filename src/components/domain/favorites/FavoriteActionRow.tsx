'use client'

import { Button, Icon } from '@/components/primitives'
import { useFavorites } from '@/hooks/useFavorites'
import type { FavoriteItemType } from '@/lib/favorites/types'
import type { ReactNode } from 'react'

const LOGIN_COPY: Record<FavoriteItemType, string> = {
  movie: '관심 영화로 등록하면 새로 상영하는 곳이 생길 때 알려드려요.',
  theater: '관심 극장으로 등록하면 새 상영작 소식을 알려드려요.',
  director: '관심 감독으로 등록하면 이 감독 영화가 상영될 때 알려드려요.',
}

const LABEL: Record<FavoriteItemType, { off: string; on: string }> = {
  movie: { off: '관심 영화 등록', on: '관심 영화' },
  theater: { off: '관심 극장 등록', on: '관심 극장' },
  director: { off: '관심 감독 등록', on: '관심 감독' },
}

/** 등록되면 하트만 빨강 — 라벨은 회색 버튼 글자색 그대로 둔다 (포스터 하트·극장 시트와 같은 색) */
function HeartIcon({ active }: { active: boolean }) {
  const color = active ? 'var(--color-error-mid)' : 'currentColor'
  return (
    <Icon name="heart" size={16} fill={color} color={color} strokeWidth={0} />
  )
}

/** 단독 버튼 — 이미 있는 CTA 행(극장 상세 등)에 끼워 넣을 때 */
export function FavoriteActionButton({
  type,
  id,
  label,
  style,
}: {
  type: FavoriteItemType
  id: string
  /** 분석 이벤트용 사람이 읽는 이름 (영화 제목·극장 이름) */
  label?: string
  style?: React.CSSProperties
}) {
  const { isFavorite, toggle } = useFavorites()
  const active = isFavorite(type, id)
  return (
    /* 회색(tertiary) — 액션 행에서 파란색은 지도 CTA 하나만 남긴다 (2026-08-24 확정) */
    <Button
      variant="tertiary"
      size="md"
      onClick={() => toggle(type, id, { loginDescription: LOGIN_COPY[type], label })}
      aria-pressed={active}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...style }}
    >
      <HeartIcon active={active} />
      {active ? LABEL[type].on : LABEL[type].off}
    </Button>
  )
}

/**
 * 상세 화면 액션 행 (피그마 G 확정, 2026-08-17): [♡ 관심 등록 — 늘어남] [공유 등 보조 버튼].
 * 상단바 하트 대신 히어로 아래에 둔다. 영화·극장·감독 상세 공통.
 */
export function FavoriteActionRow({
  type,
  id,
  label,
  trailing,
  style,
}: {
  type: FavoriteItemType
  id: string
  /** 분석 이벤트용 사람이 읽는 이름 */
  label?: string
  /** 오른쪽 보조 버튼(공유 등) */
  trailing?: ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', ...style }}>
      <FavoriteActionButton type={type} id={id} label={label} style={{ flex: 1 }} />
      {trailing}
    </div>
  )
}
