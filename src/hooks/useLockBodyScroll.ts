import { useEffect } from 'react'

let lockCount = 0
let previousOverflow = ''

/** 모달·바텀시트가 열려있는 동안 배경(body) 스크롤을 막는다. 동시에 여러 모달이 열려도 마지막이 닫힐 때만 복원한다. */
export function useLockBodyScroll(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (lockCount === 0) previousOverflow = document.body.style.overflow
    lockCount++
    document.body.style.overflow = 'hidden'

    return () => {
      lockCount--
      if (lockCount === 0) document.body.style.overflow = previousOverflow
    }
  }, [active])
}
