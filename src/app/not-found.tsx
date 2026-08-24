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
      {/* 영사 중인 스크린 연출 — 숫자는 별도 레이어(404-numbers.png)로 분리해 필름처럼 떨고,
          스크린 전체에 게이트 빛, 머리 위엔 빛을 가린 그림자가 진다. 좌표는 원본 1200×900 픽셀 실측값. */}
      <div style={{ position: 'relative', width: 240 }}>
        <img
          src="/illust/404-base.png"
          alt="빈 영화관에서 영사기 스크린을 바라보는 관객 일러스트"
          style={{ width: '100%', height: 'auto', opacity: 0.85, display: 'block' }}
        />
        {/* 스크린 내부 전체를 덮는 영사기 게이트 빛 (ShowtimeCell과 동일 클래스).
            nf404-glow가 머리 자리를 마스크로 뚫어 빛이 머리 위에 안 얹힌다 */}
        <span
          aria-hidden
          className="projector-gate nf404-glow"
          style={{ position: 'absolute', left: '22.7%', top: '8%', width: '59%', height: '40.6%' }}
        />
        {/* 스크린에 맺힌 404 — 필름 위빙으로 떨림 */}
        <img
          src="/illust/404-numbers.png"
          alt="스크린에 영사된 404 숫자"
          aria-hidden
          className="nf404-numbers"
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{
          fontSize: 'var(--text-subtitle)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}>
          페이지를 찾을 수 없어요
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-caption)' }}>
          주소가 바뀌었거나 없는 페이지예요
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
