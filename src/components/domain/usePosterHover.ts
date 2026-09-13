'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** 포스터 확대·팝업까지 기다리는 시간. 400ms는 스쳐 지나갈 때 안 뜨는 장점이 있었지만
 *  의도한 호버에도 느렸다. 예전엔 행·랭킹·시트가 각자 200/180/180을 들고 있었다. */
export const POSTER_HOVER_DELAY_MS = 200

/** 호버 확대 비율 — HoverPopup의 좌측 뒤집기 계산이 이 값을 전제로 한다 */
export const POSTER_HOVER_SCALE = 1.1

interface PosterHoverPopupPos {
  /** 확대 전 포스터의 오른쪽 끝 (HoverPopup이 scale을 감안해 보정한다) */
  x: number
  y: number
  /** 포스터 실제 렌더 폭 — 그리드처럼 폭이 유동적인 곳도 있어 rect에서 읽는다 */
  width: number
}

/**
 * 포스터 호버 — 확대 + 상세 말풍선. 행·그리드·시트가 각자 복사해 갖고 있던 로직 하나로.
 * anchorRef는 포스터 박스에 건다(캡션 제외) — 팝업 세로 위치가 포스터 상단에 맞아야 한다.
 */
export function usePosterHover(enabled: boolean) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hovered, setHovered] = useState(false)
  const [popupPos, setPopupPos] = useState<PosterHoverPopupPos | null>(null)

  /* 언마운트 뒤 타이머가 살아 있으면 사라진 카드의 팝업이 뜬다 —
     무한 로드 그리드처럼 카드가 계속 바뀌는 화면에서 실제로 난다 */
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const onMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      setHovered(true)
      setPopupPos({ x: rect.right + rect.width * 0.05, y: rect.top, width: rect.width })
    }, POSTER_HOVER_DELAY_MS)
  }, [])

  const onMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setHovered(false)
    setPopupPos(null)
  }, [])

  return {
    anchorRef,
    hovered,
    popupPos,
    /** 포스터 박스에 그대로 펼친다. enabled=false(모바일)면 비어 있다 */
    hoverProps: enabled ? { onMouseEnter, onMouseLeave } : {},
    /** 레이아웃 크기는 그대로 두고 시각적으로만 확대 — 이웃 카드를 밀지 않는다 */
    posterStyle: {
      transition: 'transform 130ms ease',
      transform: hovered ? `scale(${POSTER_HOVER_SCALE})` : 'scale(1)',
      transformOrigin: 'center center',
      position: 'relative' as const,
      /* 확대분이 이웃 포스터 아래로 깔리지 않게 — 그리드에서 특히 눈에 띈다 */
      zIndex: hovered ? 2 : undefined,
    },
  }
}
