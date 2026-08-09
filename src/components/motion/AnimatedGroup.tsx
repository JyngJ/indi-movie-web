'use client'

import { Children, ReactNode } from 'react'
import { motion, type Variants } from 'motion/react'
import { CONTAINER_VARIANTS, ITEM_VARIANTS, type AnimatedGroupPreset } from './presets'

export type { AnimatedGroupPreset }

type PresetPair = { container: Variants; item: Variants }

function presetVariants(preset: AnimatedGroupPreset): PresetPair {
  return { container: CONTAINER_VARIANTS, item: ITEM_VARIANTS[preset] }
}

interface AnimatedGroupProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  /** 자식 각각을 감싸는 래퍼에 붙는 클래스 (그리드 셀 크기 지정 등) */
  childClassName?: string
  preset?: AnimatedGroupPreset
  /** 직접 variants를 주면 preset을 덮어쓴다 */
  variants?: Partial<PresetPair>
  /** 뷰포트에 들어올 때 재생. 기본은 마운트 즉시 */
  inView?: boolean
  as?: keyof typeof motion
  asChild?: keyof typeof motion
}

/**
 * 자식들을 순차(stagger)로 등장시키는 그룹 래퍼.
 * - 포스터 그리드·리스트처럼 항목이 한 번에 쏟아지는 화면에서 사용
 * - prefers-reduced-motion은 motion 런타임이 자동 존중 (transform/opacity 축소)
 */
export function AnimatedGroup({
  children,
  className,
  style,
  childClassName,
  preset = 'fade',
  variants,
  inView = false,
  as = 'div',
  asChild = 'div',
}: AnimatedGroupProps) {
  const base = presetVariants(preset)
  const containerVariants = variants?.container ?? base.container
  const itemVariants = variants?.item ?? base.item

  const MotionComponent = motion[as] as typeof motion.div
  const MotionChild = motion[asChild] as typeof motion.div

  const viewProps = inView
    ? ({ whileInView: 'visible', viewport: { once: true, amount: 0.2 } } as const)
    : ({ animate: 'visible' } as const)

  return (
    <MotionComponent
      initial="hidden"
      {...viewProps}
      variants={containerVariants}
      className={className}
      style={style}
    >
      {Children.toArray(children).map((child, index) => (
        <MotionChild key={index} variants={itemVariants} className={childClassName}>
          {child}
        </MotionChild>
      ))}
    </MotionComponent>
  )
}
