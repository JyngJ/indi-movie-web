'use client'

import { motion, useReducedMotion } from 'motion/react'
import { Card, Icon } from '@/components/primitives'

/** 카드 자리만 확보한 뒤 팝·뒤뚱 효과를 한 번 재생한다.
 * reduced motion에서는 지연·이동 없이 즉시 표시한다. */
export function LoginEmailPreview() {
  const reduced = useReducedMotion()
  return <div className="relative w-full max-w-xs" data-email-preview-stage="">
    <motion.div
      data-email-preview-arrival=""
      initial={reduced ? false : { opacity: 0, y: 40, scale: 0.65, rotate: -8 }}
      animate={reduced ? { opacity: 1, y: 0, scale: 1, rotate: 0 } : {
        opacity: [0, 1, 1, 1, 1], y: [40, -12, 4, -2, 0],
        scale: [0.65, 1.08, 0.98, 1.01, 1], rotate: [-8, 3, -2, 1, 0],
      }}
      transition={reduced ? { duration: 0 } : { delay: 0.4, duration: 0.55, ease: 'easeOut' }}
    >
      <Card padding="md" shadow="sm" role="img" aria-label="메일 예시: 관심 영화의 새 상영과 막바지 소식을 모아 보내 드려요"
        className="flex w-full max-w-xs flex-col gap-4 text-left">
        <div className="flex items-center gap-2 text-[length:var(--text-meta)] text-[var(--color-text-sub)]" aria-hidden="true">
          <Icon name="send" size="md" />
          <span className="flex-1">영화볼지도 · 상영 소식</span>
          <span>예시</span>
        </div>
        <div className="flex flex-col gap-2" aria-hidden="true">
          <p className="text-[length:var(--text-body)] font-bold text-[var(--color-text-primary)]">관심 영화의 새 상영이 있어요</p>
          <p className="text-[length:var(--text-meta)] leading-relaxed text-[var(--color-text-sub)]">새로 열린 회차와 막바지 상영을 모았어요</p>
        </div>
      </Card>
    </motion.div>
  </div>
}
