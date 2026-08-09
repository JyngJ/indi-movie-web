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

  /** 목록이 줄어 스크롤 위치가 콘텐츠 끝을 넘어가면 되돌린다.
   *  (필터·날짜 변경으로 포스터가 사라지면 빈 영역만 보이는 상태로 남는다 — iOS Safari는
   *   콘텐츠가 줄어도 scrollLeft를 즉시 클램프하지 않는다.) */
  const clampScroll = useCallback(() => {
    const el = posterScrollRef.current
    if (!el) return
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    if (el.scrollLeft > max) el.scrollLeft = max
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    clampScroll()
    updatePosterScrollEdge()
    const id = setTimeout(() => { clampScroll(); updatePosterScrollEdge() }, 120)
    return () => clearTimeout(id)
  }, [recalcDep, updatePosterScrollEdge, clampScroll, shownExpanded])

  /** 좌우 버튼 스크롤 — 한 화면에 들어가는 아이템 수만큼만 이동하고,
   *  목표를 [0, max]로 잘라 콘텐츠 없는 영역으로 넘어가지 않게 한다.
   *  (기존엔 화면 폭과 무관하게 3칸씩 scrollBy 해서 끝에서 한 번에 건너뛰었다.) */
  const scrollByPage = useCallback((dir: 1 | -1, itemStride: number) => {
    const el = posterScrollRef.current
    if (!el || itemStride <= 0) return
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    const perPage = Math.max(1, Math.floor(el.clientWidth / itemStride))
    const target = Math.max(0, Math.min(max, el.scrollLeft + dir * perPage * itemStride))
    el.scrollTo({ left: target, behavior: 'smooth' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    scrollByPage,
  }
}
