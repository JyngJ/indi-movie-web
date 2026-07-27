const IcoMap = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
)

/**
 * "지도에서 보기" CTA 버튼.
 * 모바일 전체화면 상세(MovieDetailClient)와 데스크톱 패널(MoviePanel)이 공유한다 —
 * variant 차이는 높이/폰트/아이콘 크기뿐, 스타일은 단일 소스로 유지할 것.
 * 트래킹 등 동작은 호출부 onClick에 둔다 (UI는 얇게).
 */
export function MapCtaButton({ variant, onClick, children }: {
  variant: 'mobile' | 'desktop'
  onClick: () => void
  children: React.ReactNode
}) {
  const mobile = variant === 'mobile'
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', height: mobile ? 44 : 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderRadius: 'var(--radius-button)', border: '1px solid var(--color-primary-base)',
        backgroundColor: 'var(--color-primary-subtle-l)',
        color: 'var(--color-primary-base)', fontSize: mobile ? 14 : 13, fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      <IcoMap size={mobile ? 17 : 15} />
      {children}
    </button>
  )
}
