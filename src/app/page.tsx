export default function Home() {
  return (
    <main className="p-4 min-h-screen" style={{ backgroundColor: 'var(--color-surface-bg)' }}>
      <div className="pt-8 pb-4">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)' }}
        >
          예술영화관
          <br />
          상영 통합 조회
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          서울 독립·예술영화관 상영 정보
        </p>
      </div>

      {/* Phase 1 완료 상태 표시 */}
      <div
        className="mt-6 p-4 rounded-lg"
        style={{
          backgroundColor: 'var(--color-surface-card)',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Phase 1 — 초기화 완료
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-disabled)' }}>
          지도 및 극장 기능 개발 중...
        </p>
      </div>
    </main>
  )
}
