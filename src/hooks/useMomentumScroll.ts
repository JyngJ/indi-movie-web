import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

interface PosterDragState {
  active: boolean
  startX: number
  scrollLeft: number
}

/**
 * 가로 포스터 스트립의 드래그/momentum 스크롤 + 좌우 스크롤 버튼 가시성.
 * `recalcDep`이 바뀌면(영화 목록 변경 등) 가시성을 재계산한다.
 */
export function useMomentumScroll(
  posterScrollRef: RefObject<HTMLDivElement | null>,
  shownExpanded: boolean,
  recalcDep: unknown,
) {
  const posterDrag     = useRef<PosterDragState>({ active: false, startX: 0, scrollLeft: 0 })
  const posterTouching = useRef(false)  // 포스터 영역 터치 중 (방향 미확정 포함)

  /* ── 포스터 스크롤 버튼 가시성 ── */
  const [posterCanScrollLeft,  setPosterCanScrollLeft]  = useState(false)
  const [posterCanScrollRight, setPosterCanScrollRight] = useState(true)

  const updatePosterScrollEdge = useCallback(() => {
    const el = posterScrollRef.current
    if (!el) return
    setPosterCanScrollLeft(el.scrollLeft > 4)
    setPosterCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    updatePosterScrollEdge()
    const id = setTimeout(updatePosterScrollEdge, 120)
    return () => clearTimeout(id)
  }, [recalcDep, updatePosterScrollEdge, shownExpanded])

  /* 포스터 가로 드래그 + momentum — native 이벤트 (preventDefault 필요) */
  useEffect(() => {
    const el = posterScrollRef.current
    if (!el) return

    // null = 아직 미결정, 'h' = 가로 고정, 'v' = 세로 고정
    let dirLock: 'h' | 'v' | null = null
    let momentumId = 0
    const velBuf: Array<{ t: number; x: number }> = []

    const cancelMomentum = () => {
      if (momentumId) { cancelAnimationFrame(momentumId); momentumId = 0 }
    }

    let startY = 0
    const onDown = (e: MouseEvent | TouchEvent) => {
      cancelMomentum()
      const x = 'touches' in e ? e.touches[0].pageX : e.pageX
      startY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
      posterDrag.current = { active: false, startX: x, scrollLeft: el.scrollLeft }
      posterTouching.current = true
      dirLock = null
      el.style.cursor = 'grabbing'
      velBuf.length = 0
    }
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!posterTouching.current) return
      const x = 'touches' in e ? e.touches[0].pageX : e.pageX
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
      const dx = Math.abs(x - posterDrag.current.startX)
      const dy = Math.abs(y - startY)

      // 방향 미결정: 8px 이상 움직이면 방향 고정
      // stopPropagation 제거 — 시트 핸들러가 초기 이벤트 받아야 세로 스크롤 인식
      if (dirLock === null) {
        if (dx < 8 && dy < 8) return
        dirLock = dx > dy * 1.2 ? 'h' : 'v'
      }

      if (dirLock === 'v') {
        // 세로 확정 → 포스터 포기, 이벤트 올려보내서 시트/스크롤이 처리하게
        posterTouching.current = false
        return
      }

      // 가로 확정 → 시트 핸들러까지 버블링 차단
      posterDrag.current.active = true
      e.preventDefault()
      e.stopPropagation()
      el.scrollLeft = posterDrag.current.scrollLeft - (x - posterDrag.current.startX)

      // 속도 계산용 버퍼
      velBuf.push({ t: Date.now(), x })
      if (velBuf.length > 6) velBuf.shift()
    }
    const onUp = () => {
      const wasActive = posterDrag.current.active
      posterDrag.current.active = false
      posterTouching.current = false
      dirLock = null
      el.style.cursor = 'grab'

      if (!wasActive) { velBuf.length = 0; return }

      // momentum — 마지막 200ms 이내 이벤트로 속도 계산
      if (velBuf.length >= 2) {
        const first = velBuf[0]
        const last  = velBuf[velBuf.length - 1]
        const dt    = last.t - first.t
        if (dt > 0 && dt < 200) {
          let vel = -(last.x - first.x) / dt * 16  // px per 16ms frame
          const run = () => {
            if (Math.abs(vel) < 0.5) { momentumId = 0; return }
            el.scrollLeft += vel
            vel *= 0.93
            momentumId = requestAnimationFrame(run)
          }
          momentumId = requestAnimationFrame(run)
        }
      }
      velBuf.length = 0
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      cancelMomentum()
      el.scrollLeft += e.deltaX || e.deltaY
    }
    const onPointerDown = (e: PointerEvent) => { e.stopPropagation() }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('mousedown',   onDown)
    el.addEventListener('mousemove',   onMove)
    el.addEventListener('mouseup',     onUp)
    el.addEventListener('mouseleave',  onUp)
    el.addEventListener('touchstart',  onDown, { passive: false })
    el.addEventListener('touchmove',   onMove, { passive: false })
    el.addEventListener('touchend',    onUp)
    el.addEventListener('touchcancel', onUp)
    el.addEventListener('wheel',       onWheel, { passive: false })
    return () => {
      cancelMomentum()
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('mousedown',   onDown)
      el.removeEventListener('mousemove',   onMove)
      el.removeEventListener('mouseup',     onUp)
      el.removeEventListener('mouseleave',  onUp)
      el.removeEventListener('touchstart',  onDown)
      el.removeEventListener('touchmove',   onMove)
      el.removeEventListener('touchend',    onUp)
      el.removeEventListener('touchcancel', onUp)
      el.removeEventListener('wheel',       onWheel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownExpanded])  // expanded 전환 시 ref가 새 DOM을 가리키므로 재등록 필요

  return {
    posterDrag,
    posterTouching,
    posterCanScrollLeft,
    posterCanScrollRight,
    updatePosterScrollEdge,
  }
}
