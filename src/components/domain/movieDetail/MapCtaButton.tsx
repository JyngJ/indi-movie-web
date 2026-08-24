import type { CSSProperties, ReactNode } from 'react'
import { Button } from '@/components/primitives'

/** 지도 CTA 전용 아이콘. 예전엔 이 path가 6개 파일에 복사돼 있었고 크기만 15·16·17로
 *  제각각이었다 — 같은 버튼인데 화면마다 아이콘이 미묘하게 달랐다. */
const IcoMap = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
)

/**
 * "지도에서 보기 / 지도에서 필터로 보기" CTA — 상세 화면에서 지도로 넘어가는 경로.
 *
 * variant는 **secondary 고정**이다. 이 버튼은 상세 페이지의 주 행동이 아니다 —
 * 주 행동은 예매·상영시간표고 이건 보조 경로다. 예매 CTA가 primary를 쓰므로
 * 여기까지 primary면 한 화면에서 무게가 겹친다.
 *
 * 예전엔 8개 화면이 제각각이었다: secondary 4 / primary 3, 그중 하나는 size sm,
 * 영화제만 아이콘이 MapPin. 같은 액션이 화면마다 다르게 보일 이유가 없어 여기로 모았다.
 * 트래킹 등 동작은 호출부 onClick에 둔다 (UI는 얇게).
 */
export function MapCtaButton({
  fullWidth = true,
  size = 'md',
  style,
  onClick,
  children,
}: {
  /** 나란히 놓인 버튼과 폭을 나눠야 하면 false + style로 flex 지정 */
  fullWidth?: boolean
  /** 섹션 헤더 우측처럼 좁은 자리는 sm (감독 상세 현재 상영작 행, 2026-08-24) */
  size?: 'sm' | 'md'
  style?: CSSProperties
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button variant="secondary" size={size} fullWidth={fullWidth} style={style} onClick={onClick}>
      <IcoMap />
      {children}
    </Button>
  )
}
