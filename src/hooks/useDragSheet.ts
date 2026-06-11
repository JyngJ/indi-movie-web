import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

const VELOCITY_THRESHOLD = 500   // px/s 이상이면 flick으로 간주
const POSITION_THRESHOLD = 0.25  // 전체 이동 거리의 25% 이상이면 snap

interface PosterDragState {
  active: boolean
  startX: number
  scrollLeft: number
}

interface UseDragSheetParams {
  viewportHeight: number
  shownExpanded: boolean
  panelMode: boolean
  exiting: boolean
  enterDone: RefObject<boolean>
  scrollAreaRef: RefObject<HTMLDivElement | null>
  posterTouching: RefObject<boolean>
  posterDrag: RefObject<PosterDragState>
  collapsedHeight: number
  onClose: () => void
  onCollapse: () => void
  onExpand: () => void
}

/**
 * 바텀시트 수직 드래그(펼침/접힘/닫기 snap) + 확장 시 스크롤 최상단에서
 * 아래로 드래그하면 접히는 제스처.
 */
export function useDragSheet({
  viewportHeight,
  shownExpanded,
  panelMode,
  exiting,
  enterDone,
  scrollAreaRef,
  posterTouching,
  posterDrag,
  collapsedHeight,
  onClose,
  onCollapse,
  onExpand,
}: UseDragSheetParams) {
  const dragActive      = useRef(false)
  const dragStartY      = useRef(0)
  const dragStartOffset = useRef(0)   // 드래그 시작 시점의 translateY
  const [dragOffset, setDragOffset] = useState(0)   // 현재 드래그 delta
  const [dragging, setDragging]     = useState(false)

  // 속도 계산용 — 최근 이벤트 (timestamp, y) 를 최대 5개 보관
  const velocityBuffer = useRef<Array<{ t: number; y: number }>>([])

  // containerRef.clientHeight는 마운트 전 0이라 잘못된 값이 나옴.
  // window.innerHeight * 0.85 = height: 85dvh 와 동일한 값을 직접 계산.
  const getMaxOffset = useCallback(() => {
    return Math.max(0, viewportHeight - collapsedHeight)
  }, [viewportHeight, collapsedHeight])

  const baseTranslate = shownExpanded ? 0 : getMaxOffset()

  const effectiveTranslate = Math.max(
    0,
    Math.min(getMaxOffset(), baseTranslate + dragOffset),
  )

  // 진입: enterDone 전엔 화면 아래 / 퇴장: exiting이면 화면 아래
  const finalTranslate = panelMode
    ? 0
    : (!enterDone.current || exiting)
    ? viewportHeight
    : effectiveTranslate

  /* 확장 시 스크롤 최상단에서 아래로 드래그 → 시트 접기 */
  useEffect(() => {
    if (panelMode) return
    const el = scrollAreaRef.current
    if (!el) return
    let startY = 0
    let startScrollTop = 0
    let collapsing = false

    const onDown = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      startScrollTop = el.scrollTop
      collapsing = false
    }
    const onMove = (e: TouchEvent) => {
      if (collapsing) { e.preventDefault(); return }
      if (startScrollTop > 2) return          // 스크롤 중이면 무시
      const dy = e.touches[0].clientY - startY
      if (dy > 20) {                          // 20px 아래로 드래그 → 접기
        collapsing = true
        onCollapse()
        e.preventDefault()
      }
    }
    el.addEventListener('touchstart', onDown, { passive: true })
    el.addEventListener('touchmove',  onMove, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onDown)
      el.removeEventListener('touchmove',  onMove)
    }
  }, [onCollapse, panelMode, shownExpanded])   // expanded 전환 시 ref가 새 DOM을 가리키므로 재등록 필요

  const handlePointerDown = (e: React.PointerEvent) => {
    if (panelMode) return
    // 버튼, 링크, 입력 요소 클릭은 드래그로 처리하지 않음
    if ((e.target as Element).closest('button, a, input, select, textarea')) return
    // expanded 모드: 스크롤 영역 내부 터치는 네이티브 스크롤에 맡김
    // collapsed 모드: 어디서든 드래그 가능
    if (shownExpanded) {
      const scrollEl = scrollAreaRef.current
      if (scrollEl?.contains(e.target as Element)) return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    dragActive.current      = true
    dragStartY.current      = e.clientY
    dragStartOffset.current = effectiveTranslate
    velocityBuffer.current  = [{ t: e.timeStamp, y: e.clientY }]
    setDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragActive.current) return
    // 포스터 영역 터치 중(방향 미확정 포함)이면 시트 수직 이동 무시
    if (posterTouching.current) return
    const delta    = e.clientY - dragStartY.current
    // collapsed 상태: 아래로 더 내려가는 것 허용 (닫기 제스처)
    const maxTrans = shownExpanded ? getMaxOffset() : getMaxOffset() + 120
    const newTrans = Math.max(0, Math.min(maxTrans, dragStartOffset.current + delta))
    setDragOffset(newTrans - baseTranslate)

    // 최근 5프레임만 유지
    const buf = velocityBuffer.current
    buf.push({ t: e.timeStamp, y: e.clientY })
    if (buf.length > 5) buf.shift()
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragActive.current) return
    dragActive.current = false
    setDragging(false)
    // posterTouching은 항상 리셋 (cancel 시 touchend 없이 stuck되는 케이스 방어)
    posterTouching.current = false
    posterDrag.current.active = false

    // 이동 거리가 8px 미만이면 tap으로 간주 — snap 없이 원위치
    if (Math.abs(e.clientY - dragStartY.current) < 8) {
      setDragOffset(0)
      velocityBuffer.current = []
      return
    }

    const max = getMaxOffset()

    // ── 속도 계산 (px/ms → px/s) ──
    const buf = velocityBuffer.current
    let velocityPxPerSec = 0
    if (buf.length >= 2) {
      const first = buf[0]
      const last  = buf[buf.length - 1]
      const dt    = last.t - first.t
      if (dt > 0) velocityPxPerSec = ((last.y - first.y) / dt) * 1000
    }

    // ── snap 판단: velocity 우선, position 보조 ──
    // velocityPxPerSec > 0 → 아래로 flick (접기), < 0 → 위로 flick (펼치기)
    const isFlickUp   = velocityPxPerSec < -VELOCITY_THRESHOLD
    const isFlickDown = velocityPxPerSec >  VELOCITY_THRESHOLD
    const posRatio    = effectiveTranslate / max   // 0 = 완전 펼침, 1 = 완전 접힘

    if (shownExpanded) {
      if (isFlickDown) {
        // 빠른 아래 플릭 → 바로 닫기
        onClose()
      } else if (posRatio >= POSITION_THRESHOLD) {
        // 25% 이상 내렸으면 → 접기 (collapsed 상태로)
        onCollapse()
      }
      // 그 외 → 원위치 (expanded 유지)
    } else {
      // 현재 접힌 상태
      if (isFlickUp || posRatio < (1 - POSITION_THRESHOLD)) {
        // 위로 flick 또는 충분히 올렸으면 → 펼치기
        onExpand()
      } else if (isFlickDown || posRatio > (1 - POSITION_THRESHOLD + 0.2)) {
        // 아래로 flick 또는 충분히 내렸으면 → 닫기
        onClose()
      }
      // 그 외 → 원위치 (collapsed 유지)
    }

    setDragOffset(0)
    velocityBuffer.current = []
  }

  return {
    dragging,
    effectiveTranslate,
    finalTranslate,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  }
}
