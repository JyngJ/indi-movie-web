'use client'

interface PosterThumbProps {
  src?: string
  alt?: string
  width?: number
  height?: number
  /** 'sm' = radius 6px (기본), 'lg' = radius 8px (바텀시트용) */
  size?: 'sm' | 'lg'
  selected?: boolean
  overflow?: number | string
  onClick?: () => void
}

export function PosterThumb({
  src,
  alt = '',
  width = 68,
  height = 102,
  size = 'sm',
  selected = false,
  overflow,
  onClick,
}: PosterThumbProps) {
  const radiusVar = size === 'lg'
    ? 'var(--comp-poster-sheet-radius)'   /* 8px */
    : 'var(--comp-poster-radius)'          /* 6px */

  return (
    /* 컨테이너는 항상 고정 크기 — 선택 링이 레이아웃에 영향 없도록 box-shadow 사용 */
    <div
      className="relative flex-shrink-0 overflow-visible"
      style={{
        width,
        height,
        borderRadius: radiusVar,
        /* 선택 링: box-shadow는 레이아웃에 영향을 주지 않음 */
        boxShadow: selected
          ? '0 0 0 2px var(--color-primary-base)'
          : 'none',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* 포스터 */}
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: radiusVar,
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'oklch(0.32 0.04 220)',
              backgroundImage:
                'repeating-linear-gradient(135deg, oklch(0.38 0.04 220) 0 6px, transparent 6px 14px)',
            }}
          />
        )}

        {/* 오버레이 (숫자면 +N, 문자열이면 그대로) */}
        {overflow != null && (
          <div
            className="absolute inset-0 flex items-center justify-center font-semibold text-[15px] text-white"
            style={{ background: 'rgba(15,12,9,0.62)', borderRadius: radiusVar }}
          >
            {typeof overflow === 'string' ? overflow : `+${overflow}`}
          </div>
        )}

        {/* 선택 시 inset 흰 테두리 */}
        {selected && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius: radiusVar,
              boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.85)',
            }}
          />
        )}
      </div>

      {/* 선택 체크 배지 */}
      {selected && (
        <div
          className="absolute -top-[6px] -right-[6px] w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
          style={{
            backgroundColor: 'var(--color-primary-base)',
            boxShadow: '0 1px 3px rgba(20,15,10,0.25)',
            zIndex: 1,
          }}
        >
          <svg
            width={10} height={10} viewBox="0 0 24 24"
            fill="none" stroke="white" strokeWidth="3.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M5 12.5 10 17.5 19 7" />
          </svg>
        </div>
      )}
    </div>
  )
}
