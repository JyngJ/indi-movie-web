import type { Variants } from 'motion/react'

export type AnimatedGroupPreset =
  | 'fade'
  | 'slide'
  | 'scale'
  | 'blur'
  | 'blur-slide'

/** 컨테이너는 stagger만 담당 — 프리셋과 무관하게 공통 */
export const CONTAINER_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

export const ITEM_VARIANTS: Record<AnimatedGroupPreset, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slide: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(4px)' },
    visible: { opacity: 1, filter: 'blur(0px)' },
  },
  'blur-slide': {
    hidden: { opacity: 0, filter: 'blur(4px)', y: 20 },
    visible: { opacity: 1, filter: 'blur(0px)', y: 0 },
  },
}
