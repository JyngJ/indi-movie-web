import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      gap: 24,
      padding: '40px 24px',
      background: 'var(--color-bg-base)',
      textAlign: 'center',
    }}>
      <img
        src="/404.svg"
        alt=""
        style={{ width: 220, height: 'auto', opacity: 0.85 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-serif)',
        }}>
          페이지를 찾을 수 없습니다
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-caption)' }}>
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
      </div>
      <Link href="/" style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--color-primary-base)',
        textDecoration: 'none',
      }}>
        홈으로 돌아가기
      </Link>
    </div>
  )
}
