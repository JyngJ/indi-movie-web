'use client'

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, type Transition } from 'motion/react'
import { Icon } from '@/components/primitives'

/**
 * 트리거 카드가 그대로 커져서 다이얼로그가 되는 모핑 다이얼로그.
 * 트리거와 콘텐츠가 같은 layoutId를 공유해 motion이 두 위치를 이어 붙인다.
 */

const DEFAULT_TRANSITION: Transition = {
  type: 'spring',
  bounce: 0.05,
  duration: 0.35,
}

interface DialogContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  uniqueId: string
  triggerRef: React.RefObject<HTMLDivElement | null>
  transition: Transition
}

const DialogContext = createContext<DialogContextValue | null>(null)

function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('Dialog 하위 컴포넌트는 <Dialog> 안에서만 사용할 수 있다')
  return ctx
}

export function Dialog({
  children,
  transition = DEFAULT_TRANSITION,
}: {
  children: ReactNode
  transition?: Transition
}) {
  const uniqueId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }, [])

  /* 열려 있는 동안 ESC 닫기 + 배경 스크롤 잠금 */
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, close])

  const value = useMemo(
    () => ({ isOpen, open, close, uniqueId, triggerRef, transition }),
    [isOpen, open, close, uniqueId, transition],
  )

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

export function DialogTrigger({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const { open, uniqueId, triggerRef, transition, isOpen } = useDialog()

  return (
    <motion.div
      ref={triggerRef}
      layoutId={`dialog-${uniqueId}`}
      transition={transition}
      className={className}
      style={{ cursor: 'pointer', ...style }}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
    >
      {children}
    </motion.div>
  )
}

export function DialogContainer({ children }: { children: ReactNode }) {
  const { isOpen, close } = useDialog()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <AnimatePresence initial={false} mode="sync">
      {isOpen && (
        <>
          <motion.div
            key="dialog-backdrop"
            className="fixed inset-0 z-50"
            style={{ backgroundColor: 'var(--color-scrim)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            {children}
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function DialogContent({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const { uniqueId, transition, close } = useDialog()
  const contentRef = useRef<HTMLDivElement>(null)

  /* 열릴 때 첫 포커스를 다이얼로그로 옮긴다 (스크린리더·키보드 진입점) */
  useEffect(() => {
    contentRef.current?.focus()
  }, [])

  return (
    <motion.div
      ref={contentRef}
      layoutId={`dialog-${uniqueId}`}
      transition={transition}
      className={`morph-dialog-surface pointer-events-auto overflow-hidden ${className ?? ''}`}
      /* borderRadius는 motion이 스케일 보정하므로 숫자 px로 준다 (var()는 보정 불가) */
      style={{ borderRadius: 20, ...style }}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
      }}
    >
      {children}
    </motion.div>
  )
}

export function DialogTitle({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const { uniqueId, transition } = useDialog()
  return (
    <motion.div
      layoutId={`dialog-title-${uniqueId}`}
      transition={transition}
      className={className}
      style={{ color: 'var(--color-text-primary)', ...style }}
    >
      {children}
    </motion.div>
  )
}

export function DialogSubtitle({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const { uniqueId, transition } = useDialog()
  return (
    <motion.div
      layoutId={`dialog-subtitle-${uniqueId}`}
      transition={transition}
      className={className}
      style={{ color: 'var(--color-text-caption)', ...style }}
    >
      {children}
    </motion.div>
  )
}

/** 모핑에 참여하지 않고 다이얼로그가 열린 뒤 페이드로 들어오는 본문 */
export function DialogDescription({
  children,
  className,
  style,
  disableLayoutAnimation = true,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  disableLayoutAnimation?: boolean
}) {
  const { uniqueId } = useDialog()
  return (
    <motion.div
      key={`dialog-description-${uniqueId}`}
      layout={disableLayoutAnimation ? false : 'position'}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, delay: 0.08 }}
      className={className}
      style={{ color: 'var(--color-text-body)', ...style }}
    >
      {children}
    </motion.div>
  )
}

export function DialogImage({
  src,
  alt = '',
  className,
  style,
}: {
  src: string
  alt?: string
  className?: string
  style?: React.CSSProperties
}) {
  const { uniqueId, transition } = useDialog()
  return (
    <motion.img
      src={src}
      alt={alt}
      layoutId={`dialog-img-${uniqueId}`}
      transition={transition}
      className={className}
      style={style}
    />
  )
}

export function DialogClose({
  className,
  style,
  children,
}: {
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
}) {
  const { close } = useDialog()
  return (
    <motion.button
      type="button"
      onClick={close}
      aria-label="닫기"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, delay: 0.1 }}
      className={`absolute flex items-center justify-center ${className ?? ''}`}
      style={{
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 'var(--radius-control)',
        backgroundColor: 'var(--color-surface-overlay)',
        color: 'var(--color-text-caption)',
        ...style,
      }}
    >
      {children ?? <Icon name="x" size={18} />}
    </motion.button>
  )
}
