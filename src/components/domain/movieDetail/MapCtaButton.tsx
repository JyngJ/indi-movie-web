import { Button } from '@/components/primitives'

const IcoMap = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
)

/**
 * "지도에서 보기" CTA 버튼 — Button 2.0 secondary(primary 틴트) 문법.
 * 모바일 전체화면 상세(MovieDetailClient)와 데스크톱 패널(MoviePanel)이 공유한다.
 * 트래킹 등 동작은 호출부 onClick에 둔다 (UI는 얇게).
 */
export function MapCtaButton({ variant, onClick, children }: {
  variant: 'mobile' | 'desktop'
  onClick: () => void
  children: React.ReactNode
}) {
  const mobile = variant === 'mobile'
  return (
    <Button variant="secondary" size="md" fullWidth onClick={onClick}>
      <IcoMap size={mobile ? 17 : 15} />
      {children}
    </Button>
  )
}
