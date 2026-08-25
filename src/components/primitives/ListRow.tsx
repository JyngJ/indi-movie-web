import type { CSSProperties, ReactNode } from 'react'

/**
 * ListRow — 설정·정보 목록의 한 줄.
 *
 * 왼쪽에 글, 오른쪽에 조작(스위치·값·화살표)이 오고 아래에 1px 경계가 깔리는 이 모양이
 * 알림 설정·GV 상세·드롭다운에 각자 `Row` / `InfoRow` / `DropdownRow`라는 이름으로
 * 따로 살아 있었다. 셋의 padding이 16 / 12 / 10으로 제각각이라 같은 목록처럼 안 보였다.
 *
 * 프레임(정렬·여백·경계)만 여기서 맡는다. 줄 안의 글자 톤은 화면마다 다를 수 있으므로
 * title/description을 쓰지 않고 children으로 직접 그려도 된다.
 */

export interface ListRowProps {
  /** 왼쪽 제목. 직접 그리고 싶으면 생략하고 children을 쓴다. */
  title?: ReactNode
  /** 제목 아래 보조 설명. */
  description?: ReactNode
  /** 제목 왼쪽 아이콘·아바타. */
  leading?: ReactNode
  /** 오른쪽 끝 슬롯 — 스위치, 값, 화살표. */
  trailing?: ReactNode
  /** title/description 대신 줄 전체를 직접 채운다. */
  children?: ReactNode
  /** 마지막 줄이면 아래 경계를 지운다. */
  last?: boolean
  /** 오른쪽 슬롯이 넓어 한 줄에 안 들어갈 때 위아래로 쌓는다. */
  stacked?: boolean
  /** default 16px / compact 12px 세로 여백. */
  density?: 'default' | 'compact'
  onClick?: () => void
  style?: CSSProperties
}

export function ListRow({
  title,
  description,
  leading,
  trailing,
  children,
  last,
  stacked,
  density = 'default',
  onClick,
  style,
}: ListRowProps) {
  const padY = density === 'compact' ? 12 : 16

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: stacked ? 'stretch' : 'center',
        gap: 12,
        padding: `${padY}px var(--gutter)`,
        borderBottom: last ? 'none' : '1px solid var(--color-border)',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {leading}

      {(title || description) && (
        <div style={{ flex: stacked ? undefined : 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {title && (
            <span style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</span>
          )}
          {description && (
            <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-caption)', lineHeight: 1.5 }}>{description}</span>
          )}
        </div>
      )}

      {children}
      {trailing}
    </div>
  )
}
