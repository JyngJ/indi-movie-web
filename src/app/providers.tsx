'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, ReactNode } from 'react'
import { getQueryClient } from '@/lib/query-client'

function OrientationLock() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('orientation' in screen)) return

    const lock = async () => {
      try {
        await (screen as any).orientation.lock('portrait')
      } catch (e) {
        // 일부 기기/브라우저에서는 지원하지 않음
      }
    }
    lock()
  }, [])

  return null
}

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <OrientationLock />
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
