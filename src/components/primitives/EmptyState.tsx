import type { CSSProperties, ReactNode } from 'react'

/**
 * EmptyState — 보여줄 것이 없을 때의 자리.
 *
 * 빈 화면은 열 군데 넘게 있었는데 매번 padding·글자 크기·색을 손으로 적어서
 * 같은 "없어요"가 12px 캡션이었다가 14px 본문이었다가 했다. 문구는 화면마다 다르지만
 * 배치는 하나여야 한다.
 *
 * 두 가지 크기만 있다:
 * - inline: 목록 안 한 줄짜리 안내(기본). 캡션 색, 위아래 여백만.
 * - block: 탭 전체가 비었을 때. 그림/아이콘과 행동 버튼을 같이 세운다.
 */

export interface EmptyStateProps {
  /** 본문. 줄바꿈(\n)을 그대로 살린다. */
  message: ReactNode
  /** message 아래 보조 설명. block에서만 쓴다. */
  description?: ReactNode
  variant?: 'inline' | 'block'
  /** block에서 위에 얹을 그림 — 일러스트가 있으면 아이콘보다 우선한다. */
  illustration?: { src: string; alt: string; width: number; height: number }
  /** "상영작 둘러보기" 같은 다음 행동. */
  action?: ReactNode
  /** 위아래 여백(px). 목록 안에서 자리 크기를 맞출 때 조정한다. */
  paddingY?: number
  style?: CSSProperties
}

export function EmptyState({
  message,
  description,
  variant = 'inline',
  illustration,
  action,
  paddingY,
  style,
}: EmptyStateProps) {
  const block = variant === 'block'
  const pad = paddingY ?? (block ? 48 : 40)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: block ? 12 : 8,
        padding: `${pad}px var(--gutter)`,
        textAlign: 'center',
        ...style,
      }}
    >
      {illustration && (
        // eslint-disable-next-line @next/next/no-img-element -- 정적 일러스트라 최적화 대상이 아니다
        <img
          src={illustration.src}
          alt={illustration.alt}
          style={{ width: illustration.width, height: illustration.height, opacity: 0.7 }}
        />
      )}

      <p
        style={{
          margin: 0,
          fontSize: block ? 'var(--text-body)' : 'var(--text-meta)',
          lineHeight: 1.6,
          color: block ? 'var(--color-text-secondary)' : 'var(--color-text-caption)',
          whiteSpace: 'pre-line',
        }}
      >
        {message}
      </p>

      {description && (
        <p style={{ margin: 0, fontSize: 'var(--text-meta)', lineHeight: 1.6, color: 'var(--color-text-caption)', whiteSpace: 'pre-line' }}>
          {description}
        </p>
      )}

      {action}
    </div>
  )
}
