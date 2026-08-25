'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ITEM_VARIANTS, type AnimatedGroupPreset } from './presets'
import { useRevealGroup } from './RevealGroup'
import { registerRevealRescue } from './revealRescue'

interface RevealItemProps {
  children: ReactNode
  preset?: AnimatedGroupPreset
  /** 콘텐츠(주로 포스터 이미지)가 준비됐는지. false면 뷰포트에 들어와도 기다린다 */
  ready?: boolean
  /** 같은 행 안에서의 순번 — 0.05s씩 밀어 계단식으로 뜬다 */
  staggerIndex?: number
  /** 한 계단 간격(초) */
  staggerStep?: number
  /** 뷰포트 진입 후 이 시간(ms)까지 ready가 안 오면 그냥 띄운다 — 느린 이미지에 카드가 인질 잡히지 않게 */
  readyTimeoutMs?: number
  /** 재생 조건이 다 갖춰진 뒤 추가로 기다리는 시간(ms) — 이미지가 막 그려진 직후의 깜빡임을 피한다 */
  settleMs?: number
  /**
   * 관찰 영역 보정. 기본값은 세로 리스트용(화면 아래 15%를 잘라 조금 더 들어온 뒤 재생).
   * 가로 캐러셀 행은 좌우를 크게 열어둬야 한다 — 안 그러면 화면 밖 카드가 숨은 채 남아
   * 드래그해 끌어올 때 빈칸이 보인다.
   */
  rootMargin?: string
  /** 노출로 칠 최소 보임 비율 */
  threshold?: number
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  /** 바깥에서도 DOM 노드가 필요할 때 (호버 팝업 위치 계산 등) */
  ref?: React.Ref<HTMLDivElement>
}

/**
 * 뷰포트에 들어오고 + 콘텐츠가 준비된 뒤에 등장하는 항목.
 *
 * 마운트 시점 재생과 다른 점:
 * - 화면 밖 카드가 몰래 재생돼 버리는 낭비가 없다 (스크롤해서 오면 그때 뜬다)
 * - 이미지가 아직 안 온 빈 카드가 먼저 슬라이드해 들어오는 어긋남이 없다
 * 한 번 뜬 항목은 다시 숨지 않는다(once).
 */
export function RevealItem({
  children,
  preset = 'slide',
  ready = true,
  staggerIndex = 0,
  staggerStep = 0.05,
  readyTimeoutMs = 1500,
  settleMs = 120,
  rootMargin = '0px 0px -15% 0px',
  threshold = 0.35,
  className,
  style,
  onClick,
  ref: externalRef,
}: RevealItemProps) {
  const ref = useRef<HTMLDivElement>(null)

  /* 내부 관찰용 ref와 바깥 ref를 함께 채운다 */
  const setRefs = (node: HTMLDivElement | null) => {
    ref.current = node
    if (typeof externalRef === 'function') externalRef(node)
    else if (externalRef) (externalRef as React.RefObject<HTMLDivElement | null>).current = node
  }
  const [selfInView, setSelfInView] = useState(false)
  /* RevealGroup(가로 행) 안이면 묶음 판정을 그대로 쓴다 — 항목별 관찰은 하지 않는다 */
  const groupVisible = useRevealGroup()
  const grouped = groupVisible !== null
  const inView = grouped ? groupVisible : selfInView

  /* useInView 대신 직접 IO를 쓰는 이유: 한 프레임에 화면을 훌쩍 지나친 항목(앵커 점프·빠른 스크롤·
     스크롤 복원)은 isIntersecting이 한 번도 true가 되지 않아 영영 opacity 0으로 남는다.
     "이미 위로 지나갔다"(top < 0)도 노출로 친다.
     rootMargin 아래 -15%: 화면 맨 밑에 윗동만 걸친 채 재생돼 정작 볼 땐 끝나 있는 문제 방지. */
  useEffect(() => {
    if (grouped) return
    const el = ref.current
    if (!el || selfInView) return
    if (typeof IntersectionObserver === 'undefined') { setSelfInView(true); return }
    const io = new IntersectionObserver(
      ([e]) => {
        /* 위로 이미 지나간 것(top < 0)도 노출로 친다 */
        if (e.boundingClientRect.top < 0) { setSelfInView(true); io.disconnect(); return }
        /* 항목이 루트보다 크면 도달 가능한 최대 비율이 1보다 작다. 그 상한을 기준으로
           임계를 낮춰 잡는다 — 안 그러면 낮은 창에서 영영 재생되지 않는다. */
        const rootH = e.rootBounds ? e.rootBounds.height : 0
        const h = e.boundingClientRect.height
        const cap = h > 0 && rootH > 0 ? Math.min(1, rootH / h) : 1
        const need = Math.min(threshold, cap * 0.6)
        if (e.isIntersecting && e.intersectionRatio >= need) { setSelfInView(true); io.disconnect() }
      },
      /* threshold에 0을 반드시 함께 넣는다. IO는 "임계 교차" 때만 콜백을 주는데, 항목이
         (rootMargin 적용된) 루트보다 크면 비율이 threshold에 영영 못 닿아 콜백 자체가 오지
         않는다 — 창 높이가 낮은 비율에서 행이 통째로 opacity 0으로 남던 원인.
         0을 넣으면 한 픽셀이라도 걸치는 순간 콜백이 오고, 아래 판정이 처리한다. */
      { threshold: [0, threshold], rootMargin },
    )
    io.observe(el)
    /* IO 콜백이 아예 안 오는 경우(한 프레임에 지나침·문서 hidden) 대비 */
    const unregister = registerRevealRescue(el, () => setSelfInView(true))
    return () => { io.disconnect(); unregister() }
  }, [grouped, selfInView, rootMargin, threshold])

  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (!inView || ready) return
    const t = setTimeout(() => setTimedOut(true), readyTimeoutMs)
    return () => clearTimeout(t)
  }, [inView, ready, readyTimeoutMs])

  /* 조건이 갖춰져도 한 박자 쉬고 재생 — 이미지 디코드 직후 프레임에 겹치면 모션이 씹힌다 */
  const armed = inView && (ready || timedOut)
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setSettled(true), settleMs)
    return () => clearTimeout(t)
  }, [armed, settleMs])

  /* 모션 최소화 설정이면 이동은 빼고 페이드만 — 아예 안 뜨는 게 아니라 조용히 나타난다 */
  const reduced = useReducedMotion()
  const variants = reduced ? ITEM_VARIANTS.fade : ITEM_VARIANTS[preset]
  const show = armed && settled

  return (
    <motion.div
      ref={setRefs}
      className={className}
      style={style}
      onClick={onClick}
      variants={variants}
      initial="hidden"
      animate={show ? 'visible' : 'hidden'}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: staggerIndex * staggerStep }}
    >
      {children}
    </motion.div>
  )
}
