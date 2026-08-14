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
      padding: '40px var(--gutter)',
      background: 'var(--color-surface-bg)',
      textAlign: 'center',
    }}>
      <div style={{ position: 'relative', width: 240 }}>
        <img
          src="/illust/404.png"
          alt=""
          style={{ width: '100%', height: 'auto', opacity: 0.85, display: 'block' }}
        />
        {/* 그림 속 "404" 글자 자리에 상영중 영사기 빛을 얹는다 — ShowtimeCell과 같은 게이트 */}
        <span
          aria-hidden
          className="projector-gate"
          style={{ position: 'absolute', left: '37%', top: '18%', width: '30%', height: '14%' }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{
          fontSize: 'var(--text-subtitle)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
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
