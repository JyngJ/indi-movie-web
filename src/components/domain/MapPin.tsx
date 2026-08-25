'use client'

/** 관심 표시 — theater: 관심 극장(dot 테두리 하트색) / movie: 관심 영화가 걸린 극장(하트 뱃지) / both */
export type PinFavoriteMark = 'none' | 'theater' | 'movie' | 'both'

interface MapPinProps {
  selected?: boolean
  favorite?: PinFavoriteMark
  label?: string
  labelOffset?: { x: number; y: number }
  onClick?: () => void
  dimmed?: boolean
  isDark?: boolean
}

/* 이 서비스는 독립·예술영화관만 다룬다. 멀티플렉스 핀(cgv·mega·lotte)은 렌더된 적이 없어
   2026-08-19에 색 토큰과 함께 지웠다. */
const PIN_INDIE = { dot: 'var(--color-primary-base)', aura: 'rgba(74,99,128,0.25)' }

const DOT = 22
/** 관심 극장 핀 하트 — 크기와 광학 보정(px, SVG 좌표라 소수점 유효). Lucide heart 패스는 24 뷰박스 기준 x 2~22 / y 3~21 */
const HEART_SIZE = 11
const HEART_DX = 0
const HEART_DY = 0.5
const AURA = 44

const DIMMED_DOT_LIGHT = '#6b7280'
const DIMMED_DOT_DARK = '#71717a'

export function MapPin({ selected = false, favorite = 'none', label, labelOffset, onClick, dimmed = false, isDark = false }: MapPinProps) {
  const { dot: activeDot, aura } = PIN_INDIE
  const dot = dimmed ? (isDark ? DIMMED_DOT_DARK : DIMMED_DOT_LIGHT) : activeDot
  const favTheater = favorite === 'theater' || favorite === 'both'
  const favMovie = favorite === 'movie' || favorite === 'both'

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* 오라 — dot 뒤에 absolute로 표시, 레이아웃 영향 없음 */}
      {selected && (
        <div style={{
          position: 'absolute',
          width: AURA,
          height: AURA,
          bottom: -((AURA - DOT) / 2),
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          backgroundColor: aura,
          zIndex: 0,
        }} />
      )}

      {/* 라벨 */}
      {label && (
        <div style={{
          position: 'relative',
          zIndex: 1,
          transform: labelOffset ? `translate(${labelOffset.x}px, ${labelOffset.y}px)` : undefined,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
            color: '#111',
            textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 -1.5px 0 #fff, 0 1.5px 0 #fff, -1.5px 0 0 #fff, 1.5px 0 0 #fff, 0 2px 6px rgba(0,0,0,0.25)',
            position: 'relative',
            zIndex: 1,
          }}>
            {label}
          </div>
        </div>
      )}

      {/* dot — 관심 극장이면 원형 빨강 핀 안에 흰 하트 (흰 테두리 / 빨강 / 흰 하트) */}
      <div style={{ position: 'relative', zIndex: 1, width: DOT, height: DOT }}>
        {favTheater && !dimmed ? (
          /* 원+테두리+하트를 단일 SVG로 — CSS left/top은 정수로 스냅돼 서브픽셀 정렬이 안 된다.
             SVG 좌표계 안에서 하트를 원 중심에 수학적으로 놓고, 광학 보정은 HEART_DX/DY로. */
          <svg width={DOT} height={DOT} viewBox={`0 0 ${DOT} ${DOT}`} aria-hidden="true" style={{ display: 'block', overflow: 'visible', filter: selected ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.28))' : 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' }}>
            {selected && <circle cx={DOT / 2} cy={DOT / 2} r={DOT / 2 + 1.5} fill="var(--color-primary-base)" />}
            <circle cx={DOT / 2} cy={DOT / 2} r={DOT / 2} fill={selected ? '#fff' : 'var(--color-surface-bg)'} />
            <circle cx={DOT / 2} cy={DOT / 2} r={DOT / 2 - (selected ? 2.5 : 2)} fill="var(--color-error-mid)" />
            <g transform={`translate(${DOT / 2 - HEART_SIZE / 2 + HEART_DX} ${DOT / 2 - HEART_SIZE / 2 + HEART_DY}) scale(${HEART_SIZE / 24})`}>
              <path fill="#fff" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </g>
          </svg>
        ) : (
          <div style={{
            width: DOT,
            height: DOT,
            borderRadius: '50%',
            backgroundColor: dot,
            border: selected ? '2.5px solid #fff' : '2px solid var(--color-surface-bg)',
            boxShadow: selected
              ? '0 2px 8px rgba(0,0,0,0.28), 0 0 0 2.5px var(--color-primary-base)'
              : '0 2px 6px rgba(0,0,0,0.18)',
          }} />
        )}
        {/* 관심 영화 상영 중 — 하트 뱃지 (우상단) */}
        {favMovie && !dimmed && (
          <div style={{
            position: 'absolute',
            top: -6,
            right: -7,
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: 'var(--color-surface-card)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width={9} height={9} viewBox="0 0 24 24" fill="var(--color-error-mid)" aria-hidden="true">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
