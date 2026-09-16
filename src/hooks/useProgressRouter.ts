'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { navStart } from '@/components/domain/RouteProgressBar'

/** 상세 화면의 명령형 이동에도 공통 진행 표시를 연결한다. */
export function useProgressRouter() {
  const router = useRouter()
  return useMemo(() => ({
    ...router,
    back: () => {
      if (window.history.length > 1) navStart()
      router.back()
    },
    push: (...args: Parameters<typeof router.push>) => {
      const url = new URL(args[0], window.location.href)
      if (url.pathname !== window.location.pathname) navStart()
      router.push(...args)
    },
  }), [router])
}
