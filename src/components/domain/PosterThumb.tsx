'use client'

import { useState } from 'react'
import { toSecureImageUrl } from '@/lib/media/imageUrl'
import { Icon } from '@/components/primitives'

interface PosterThumbProps {
  src?: string
  alt?: string
  width?: number
  height?: number
  /** 'sm' = radius 6px (기본), 'lg' = radius 8px (바텀시트용) */
  size?: 'sm' | 'lg'
  selected?: boolean
  /** selected와 동일한 링·inset 테두리지만 체크 배지 없음 (필터 매칭 강조) */
  highlighted?: boolean
  overflow?: number | string
  onClick?: () => void
  /** 지정하면 size 기반 라운드값 대신 이 값을 그대로 사용 (예: 0으로 각진 포스터) */
  radius?: number | string
  /** false면 드롭섀도우를 뺀다(선택 링은 유지) — 기본 true */
  shadow?: boolean
  /** 이미지가 실제로 그려진 시점 알림 — 등장 모션을 이미지에 맞춰 재생할 때 사용 */
  onReady?: () => void
  /**
   * false면 로드 페이드를 끄고 처음부터 불투명하게 그린다.
   * renderToStaticMarkup으로 뽑아 Leaflet divIcon에 넣는 지도 포스터용 —
   * 정적 마크업엔 onLoad/ref가 안 붙어 opacity:0이 그대로 굳는다(포스터가 빈칸이 됨).
   */
  fade?: boolean
  /**
   * 부모 폭을 채우고 2:3 비율로 높이를 잡는다(그리드용). width/height는 무시되고
   * 대신 없는 포스터의 대체 글자 크기 계산에 fallbackTextBase가 쓰인다.
   */
  fluid?: boolean
  /** fluid일 때 대체 글자 크기 기준 폭(px). 기본 120. */
  fluidTextBase?: number
  /** 화면 밖 포스터를 늦게 받는다. 긴 그리드에서 켠다. */
  lazy?: boolean
  className?: string
}

export function PosterThumb({
  src: rawSrc,
  alt = '',
  width = 68,
  height = 102,
  size = 'sm',
  selected = false,
  highlighted = false,
  overflow,
  onClick,
  radius,
  shadow = true,
  onReady,
  fade = true,
  fluid = false,
  fluidTextBase = 120,
  lazy = false,
  className,
}: PosterThumbProps) {
  // 로드 페이드 — 스트리밍 중 반쯤 그려진 이미지가 뚝 나타나는 것 방지.
  // 캐시된 이미지는 complete가 참이라 페이드 없이 즉시 보인다(재방문 깜빡임 방지).
  const [loaded, setLoaded] = useState(false)
  const markLoaded = () => setLoaded(true)

  /* http:// 포스터는 https 페이지에서 mixed content로 차단된다 — 마지막 방어선 */
  const src = toSecureImageUrl(rawSrc)

  const radiusVar = radius ?? (size === 'lg'
    ? 'var(--comp-poster-sheet-radius)'   /* 8px */
    : 'var(--comp-poster-radius)')         /* 6px */
  const dropShadow = shadow ? '0 2px 8px rgba(0,0,0,0.18)' : null
  /* 포스터 없는 칸의 글자·워드마크 크기 기준 폭 */
  const fallbackBase = fluid ? fluidTextBase : width
  /* 워드마크 — 작은 썸네일(지도 핀 등)에는 글자만도 빠듯해서 뺀다 */
  const markWidth = fallbackBase >= 72
    ? Math.round(Math.min(72, Math.max(36, fallbackBase * 0.36)))
    : 0
  const markBottom = Math.max(6, Math.round(fallbackBase * 0.06))
  /* logo.svg 448×153 — 글자가 워드마크 자리를 침범하지 않게 아래를 비워 둔다 */
  const markSpace = markWidth ? Math.round(markWidth * 0.342) + markBottom + 8 : 0

  return (
    /* 컨테이너는 항상 고정 크기 — 선택 링이 레이아웃에 영향 없도록 box-shadow 사용 */
    <div
      className={`relative overflow-visible${fluid ? '' : ' flex-shrink-0'}${className ? ` ${className}` : ''}`}
      style={{
        ...(fluid
          ? { width: '100%', aspectRatio: '2/3' }
          : { width, height }),
        borderRadius: radiusVar,
        /* 선택 링: box-shadow는 레이아웃에 영향을 주지 않음 */
        boxShadow: selected || highlighted
          ? [`0 0 0 2px var(--color-primary-base)`, dropShadow].filter(Boolean).join(', ')
          : (dropShadow ?? 'none'),
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* 포스터 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: radiusVar,
        }}
      >
        {src && fade && !loaded && (
          /* 로딩 플레이스홀더 — 옅은 면 + 가운데 워드마크. 빈 회색 칸이 뜨는 동안
             무엇을 기다리는 칸인지 보이게 한다. 이미지가 뜨면 사라진다.
             `fade={false}`(지도 핀·그리드의 정적 마크업)에는 절대 걸지 말 것 —
             onLoad/ref가 안 붙어 loaded가 영영 false라, 플레이스홀더가 포스터를
             영구히 덮는다(2026-09-17 운영 사고). */
          <div
            aria-hidden
            data-poster-placeholder
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'var(--color-surface-raised)',
              borderRadius: radiusVar,
            }}
          >
            {markWidth > 0 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/logo.svg"
                alt="영화볼지도 로고"
                aria-hidden
                style={{ width: markWidth, opacity: 0.16, pointerEvents: 'none' }}
              />
            )}
          </div>
        )}
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              backgroundColor: 'var(--color-surface-raised)',
              opacity: loaded || !fade ? 1 : 0,
              transition: fade ? 'opacity 240ms ease' : undefined,
            }}
            loading={lazy ? 'lazy' : undefined}
            /* 캐시된 이미지는 onLoad가 안 뜰 수 있어 complete도 함께 본다 */
            ref={(node) => { if (node?.complete && !loaded) { markLoaded(); onReady?.() } }}
            onLoad={() => { markLoaded(); onReady?.() }}
            onError={() => { markLoaded(); onReady?.() }}
          />
        ) : (
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              background: 'var(--color-neutral-800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
              paddingBottom: 4 + markSpace,
            }}
          >
            {alt && (
              <span style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: Math.max(11, Math.min(20, Math.round(fallbackBase * 0.15))),
                fontWeight: 800,
                textAlign: 'center',
                lineHeight: 1.3,
                wordBreak: 'keep-all',
                overflowWrap: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {alt}
              </span>
            )}
            {/* 포스터가 없어 제목만 남는 칸 — 바닥 가운데 워드마크를 옅게 깐다.
                작은 썸네일(지도 핀 등)에는 글자만도 빠듯해서 넣지 않는다.
                alt는 채우고 aria-hidden을 같이 건다 — 크롤러엔 텍스트를 주고
                스크린리더 중복 낭독은 막는다(AGENTS 이미지 alt 정책). */}
            {markWidth > 0 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/logo.svg"
                alt="영화볼지도 로고"
                aria-hidden
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: markBottom,
                  transform: 'translateX(-50%)',
                  width: markWidth,
                  opacity: 0.22,
                  filter: 'brightness(0) invert(1)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
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

        {/* 포스터 얇은 테두리 (흰/검 포스터 구분용) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: radiusVar,
            boxShadow: 'inset 0 0 0 1px var(--comp-poster-border)',
          }}
        />

        {/* 선택/강조 시 inset 흰 테두리 */}
        {(selected || highlighted) && (
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
          {/* 액센트 배지 위 체크는 흰색 — currentColor면 본문 글자색(먹)이 그대로 내려온다 */}
          <Icon name="check" size={10} color="var(--color-on-accent)" />
        </div>
      )}
    </div>
  )
}
